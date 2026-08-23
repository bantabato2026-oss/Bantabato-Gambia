import { and, asc, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { adminRoles, caseNotes, memberProfiles, reports, users, verificationRecords } from "../drizzle/schema";
import { createAuditLog, createNotification, getDb, getVerificationDocumentForReview } from "./db";
import { canDecideVerification, hasOperationalScope } from "./domain/operationsPolicy";
import { createIntegritySignal } from "./integrityService";
import { ENV } from "./_core/env";

export const ADMIN_SCOPES = ["verification_reviewer", "trust_safety", "support_agent", "subscription_manager", "platform_admin"] as const;
export type AdminScope = (typeof ADMIN_SCOPES)[number];
export const VERIFICATION_REASONS = ["document_unclear", "document_expired", "document_unsupported", "information_mismatch", "image_quality_insufficient", "verification_image_insufficient", "suspected_duplicate", "suspected_fraud", "requires_additional_review", "other"] as const;
export type VerificationReason = (typeof VERIFICATION_REASONS)[number];

type VerificationDecision = "approved" | "rejected" | "requires_resubmission" | "escalated";
type ReportStatus = "in_review" | "action_required" | "resolved" | "dismissed" | "escalated";
type ReportAction = "none" | "warn" | "restrict" | "temporary_suspend";
export type OperationalCaseType = "verification" | "report" | "connection_review";

type WorkflowDependencies = {
  getDb: () => Promise<any>;
  createAuditLog: (...args: any[]) => Promise<void>;
  createNotification: (...args: any[]) => Promise<void>;
  synchronizeProfileEligibility?: (profileId: number) => Promise<unknown>;
};

const synchronizeVerificationEligibility = async (profileId: number) => (await import("./db")).synchronizeProfileEligibility(profileId);
const productionWorkflowDependencies: WorkflowDependencies = { getDb, createAuditLog, createNotification, synchronizeProfileEligibility: synchronizeVerificationEligibility };

export async function getActiveAdminScopes(userId: number): Promise<AdminScope[]> {
  const db = await getDb();
  if (!db) return [];
  const activeRoles = await db.select({ scope: adminRoles.scope }).from(adminRoles).where(and(eq(adminRoles.userId, userId), eq(adminRoles.status, "active")));
  if (activeRoles.length) return activeRoles.map(role => role.scope);

  // Legacy compatibility is limited to the configured platform owner only; other staff require an explicit scoped role.
  const user = await db.select({ openId: users.openId }).from(users).where(eq(users.id, userId)).limit(1);
  return user[0]?.openId === ENV.ownerOpenId ? ["platform_admin"] : [];
}

export async function requireOperationalScope(userId: number, allowedScopes: AdminScope[]) {
  const scopes = await getActiveAdminScopes(userId);
  if (hasOperationalScope(scopes, allowedScopes)) return scopes;
  throw new Error("Your operational role does not permit this action");
}

export async function getScopedAdminOverview(scopes: AdminScope[]) {
  const canReviewVerification = scopes.includes("platform_admin") || scopes.includes("verification_reviewer");
  const canReviewReports = scopes.includes("platform_admin") || scopes.includes("trust_safety");
  const [verificationQueue, reportsQueue] = await Promise.all([
    canReviewVerification ? getVerificationQueue() : Promise.resolve([]),
    canReviewReports ? getReportQueue() : Promise.resolve([]),
  ]);
  return { scopes, verificationQueue, reportsQueue };
}

export async function getVerificationQueue() {
  const db = await getDb();
  if (!db) return [];
  const records = await db
    .select({
      id: verificationRecords.id,
      profileId: verificationRecords.profileId,
      verificationType: verificationRecords.verificationType,
      status: verificationRecords.status,
      documentType: verificationRecords.documentType,
      priority: verificationRecords.priority,
      reviewReason: verificationRecords.reviewReason,
      assignedReviewerUserId: verificationRecords.assignedReviewerUserId,
      reviewedByUserId: verificationRecords.reviewedByUserId,
      submittedAt: verificationRecords.submittedAt,
      reviewedAt: verificationRecords.reviewedAt,
      escalatedAt: verificationRecords.escalatedAt,
    })
    .from(verificationRecords)
    .where(inArray(verificationRecords.status, ["submitted", "under_review", "escalated"]))
    .orderBy(asc(verificationRecords.priority), asc(verificationRecords.submittedAt))
    .limit(100);
  return enrichVerificationRecords(records);
}

export async function getVerificationCase(verificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const record = await db
    .select({
      id: verificationRecords.id,
      profileId: verificationRecords.profileId,
      verificationType: verificationRecords.verificationType,
      status: verificationRecords.status,
      documentType: verificationRecords.documentType,
      priority: verificationRecords.priority,
      reviewReason: verificationRecords.reviewReason,
      memberMessage: verificationRecords.memberMessage,
      assignedReviewerUserId: verificationRecords.assignedReviewerUserId,
      reviewedByUserId: verificationRecords.reviewedByUserId,
      submittedAt: verificationRecords.submittedAt,
      reviewedAt: verificationRecords.reviewedAt,
      escalatedAt: verificationRecords.escalatedAt,
      closedAt: verificationRecords.closedAt,
      updatedAt: verificationRecords.updatedAt,
    })
    .from(verificationRecords)
    .where(eq(verificationRecords.id, verificationId))
    .limit(1);
  if (!record[0]) throw new Error("Verification case not found");
  const [enriched] = await enrichVerificationRecords(record);
  const notes = await getCaseNotes("verification", verificationId);
  return { ...enriched, notes };
}

export async function getVerificationDocumentForAuthorizedReview(actorUserId: number, verificationId: number) {
  const document = await getVerificationDocumentForReview(verificationId);
  await createAuditLog(actorUserId, "verification.document_accessed", "verification_record", String(verificationId), { documentType: document.documentType });
  return document;
}

export async function claimVerificationCase(actorUserId: number, verificationId: number, dependencies: WorkflowDependencies = productionWorkflowDependencies) {
  const db = await dependencies.getDb();
  if (!db) throw new Error("Database unavailable");
  const record = await db.select({ status: verificationRecords.status, assignedReviewerUserId: verificationRecords.assignedReviewerUserId, profileId: verificationRecords.profileId }).from(verificationRecords).where(eq(verificationRecords.id, verificationId)).limit(1);
  if (!record[0] || !canDecideVerification(record[0].status)) throw new Error("This verification case is not available to claim");
  if (record[0].assignedReviewerUserId && record[0].assignedReviewerUserId !== actorUserId) throw new Error("This verification case is already assigned to another reviewer");
  const outcome = await db.update(verificationRecords).set({ status: "under_review", assignedReviewerUserId: actorUserId }).where(and(eq(verificationRecords.id, verificationId), eq(verificationRecords.status, record[0].status), or(isNull(verificationRecords.assignedReviewerUserId), eq(verificationRecords.assignedReviewerUserId, actorUserId))));
  if (Number((outcome as { affectedRows?: unknown } | undefined)?.affectedRows ?? 1) === 0) throw new Error("This verification case changed before it could be claimed. Refresh the queue and try again.");
  await dependencies.createAuditLog(actorUserId, "verification.claimed", "verification_record", String(verificationId), { previousStatus: record[0].status, newStatus: "under_review" });
  const profile = await db.select({ userId: memberProfiles.userId }).from(memberProfiles).where(eq(memberProfiles.id, record[0].profileId)).limit(1);
  if (profile[0]) await dependencies.createNotification(profile[0].userId, "verification", "Verification review is in progress", "Your private identity document is in manual review.", "/app/verification", `verification:${verificationId}:under_review`, "verification_pending_review");
}

export async function decideVerificationCase(input: { actorUserId: number; verificationId: number; decision: VerificationDecision; reason?: VerificationReason; internalNote?: string; memberMessage?: string; priority?: "standard" | "attention" | "high"; expectedUpdatedAt?: Date }, dependencies: WorkflowDependencies = productionWorkflowDependencies) {
  const db = await dependencies.getDb();
  if (!db) throw new Error("Database unavailable");
  const record = await db.select({ status: verificationRecords.status, profileId: verificationRecords.profileId, assignedReviewerUserId: verificationRecords.assignedReviewerUserId, updatedAt: verificationRecords.updatedAt }).from(verificationRecords).where(eq(verificationRecords.id, input.verificationId)).limit(1);
  if (!record[0] || !canDecideVerification(record[0].status)) throw new Error("This verification case is not awaiting an operational decision");
  if (record[0].assignedReviewerUserId && record[0].assignedReviewerUserId !== input.actorUserId) throw new Error("This verification case is assigned to another reviewer");
  const memberMessage = memberSafeVerificationMessage(input.memberMessage, input.decision, input.reason);
  const closed = input.decision !== "escalated";
  const decisionConditions = [eq(verificationRecords.id, input.verificationId), eq(verificationRecords.status, record[0].status), or(isNull(verificationRecords.assignedReviewerUserId), eq(verificationRecords.assignedReviewerUserId, input.actorUserId)), ...(input.expectedUpdatedAt ? [eq(verificationRecords.updatedAt, input.expectedUpdatedAt)] : [])];
  const outcome = await db.update(verificationRecords).set({
    status: input.decision,
    reviewReason: input.reason ?? null,
    memberMessage,
    priority: input.priority ?? "standard",
    reviewedByUserId: input.actorUserId,
    assignedReviewerUserId: input.actorUserId,
    reviewedAt: new Date(),
    escalatedAt: input.decision === "escalated" ? new Date() : null,
    closedAt: closed ? new Date() : null,
  }).where(and(...decisionConditions));
  if (Number((outcome as { affectedRows?: unknown } | undefined)?.affectedRows ?? 1) === 0) throw new Error("This verification case changed before the decision was recorded. Refresh the case and try again.");
  if (["suspected_duplicate", "suspected_fraud", "requires_additional_review"].includes(input.reason ?? "") && ["escalated", "requires_resubmission", "rejected"].includes(input.decision)) await createIntegritySignal({ actorUserId: input.actorUserId, subjectProfileId: record[0].profileId, source: "verification", category: input.reason === "suspected_duplicate" ? "multiple_account_indicator" : "verification_anomaly", severity: input.reason === "suspected_fraud" ? "high" : "medium", evidenceConfidence: "limited", idempotencyKey: `verification-anomaly:${input.verificationId}:${input.decision}:${input.reason}` });
  if (input.internalNote?.trim()) await addCaseNote(input.actorUserId, "verification", input.verificationId, input.internalNote);
  await dependencies.synchronizeProfileEligibility?.(record[0].profileId);
  const profile = await db.select({ userId: memberProfiles.userId }).from(memberProfiles).where(eq(memberProfiles.id, record[0].profileId)).limit(1);
  if (profile[0]) await dependencies.createNotification(profile[0].userId, "verification", verificationTitle(input.decision), memberMessage, "/app/verification", `verification:${input.verificationId}:${input.decision}`, input.decision === "approved" ? "verification_completed" : input.decision === "requires_resubmission" || input.decision === "rejected" ? "verification_changes_required" : "verification_additional_review");
  await dependencies.createAuditLog(input.actorUserId, `verification.${input.decision}`, "verification_record", String(input.verificationId), { previousStatus: record[0].status, newStatus: input.decision, reason: input.reason ?? null, priority: input.priority ?? "standard" });
}

export async function getReportQueue() {
  const db = await getDb();
  if (!db) return [];
  const records = await db.select({ id: reports.id, reporterProfileId: reports.reporterProfileId, reportedProfileId: reports.reportedProfileId, conversationId: reports.conversationId, reason: reports.reason, details: reports.details, status: reports.status, priority: reports.priority, assignedModeratorUserId: reports.assignedModeratorUserId, memberAction: reports.memberAction, createdAt: reports.createdAt }).from(reports).where(inArray(reports.status, ["open", "in_review", "action_required", "escalated"])).orderBy(desc(reports.priority), asc(reports.createdAt)).limit(100);
  return enrichReports(records);
}

export async function getReportCase(reportId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const record = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);
  if (!record[0]) throw new Error("Report case not found");
  const [enriched] = await enrichReports(record);
  const notes = await getCaseNotes("report", reportId);
  return { ...enriched, notes };
}

export async function claimReportCase(actorUserId: number, reportId: number, dependencies: WorkflowDependencies = productionWorkflowDependencies) {
  const db = await dependencies.getDb();
  if (!db) throw new Error("Database unavailable");
  const record = await db.select({ status: reports.status, assignedModeratorUserId: reports.assignedModeratorUserId }).from(reports).where(eq(reports.id, reportId)).limit(1);
  if (!record[0] || !["open", "triage", "in_review", "investigating", "awaiting_information", "action_required", "decision_pending", "escalated", "appealed", "reopened"].includes(record[0].status)) throw new Error("This report case is not available to claim");
  if (record[0].assignedModeratorUserId && record[0].assignedModeratorUserId !== actorUserId) throw new Error("This report case is already assigned to another reviewer");
  const outcome = await db.update(reports).set({ status: "in_review", assignedModeratorUserId: actorUserId, reviewedByUserId: actorUserId }).where(and(eq(reports.id, reportId), eq(reports.status, record[0].status), or(isNull(reports.assignedModeratorUserId), eq(reports.assignedModeratorUserId, actorUserId))));
  if (Number((outcome as { affectedRows?: unknown } | undefined)?.affectedRows ?? 1) === 0) throw new Error("This report case changed before it could be claimed. Refresh the queue and try again.");
  await dependencies.createAuditLog(actorUserId, "report.claimed", "report", String(reportId), { previousStatus: record[0].status, newStatus: "in_review" });
}

export async function decideReportCase(input: { actorUserId: number; reportId: number; status: ReportStatus; priority?: "low" | "normal" | "high" | "critical"; memberAction?: ReportAction; internalNote?: string; memberMessage?: string; resolution?: string }, dependencies: WorkflowDependencies = productionWorkflowDependencies) {
  const db = await dependencies.getDb();
  if (!db) throw new Error("Database unavailable");
  const record = await db.select({ status: reports.status, reportedProfileId: reports.reportedProfileId, assignedModeratorUserId: reports.assignedModeratorUserId }).from(reports).where(eq(reports.id, input.reportId)).limit(1);
  if (!record[0] || ["resolved", "dismissed", "closed"].includes(record[0].status)) throw new Error("This report case is not awaiting an operational decision");
  if (record[0].assignedModeratorUserId && record[0].assignedModeratorUserId !== input.actorUserId) throw new Error("This report case is assigned to another reviewer");
  const memberAction = input.memberAction ?? "none";
  const memberMessage = input.memberMessage?.trim() || defaultReportMessage(input.status, memberAction);
  const outcome = await db.update(reports).set({ status: input.status, priority: input.priority ?? "normal", memberAction, memberMessage, resolution: input.resolution?.trim() || null, assignedModeratorUserId: input.actorUserId, reviewedByUserId: input.actorUserId, resolvedAt: ["resolved", "dismissed"].includes(input.status) ? new Date() : null }).where(and(eq(reports.id, input.reportId), eq(reports.status, record[0].status), or(isNull(reports.assignedModeratorUserId), eq(reports.assignedModeratorUserId, input.actorUserId))));
  if (Number((outcome as { affectedRows?: unknown } | undefined)?.affectedRows ?? 1) === 0) throw new Error("This report case changed before the decision was recorded. Refresh the case and try again.");
  if (input.internalNote?.trim()) await addCaseNote(input.actorUserId, "report", input.reportId, input.internalNote);
  if (record[0].reportedProfileId && memberAction !== "none") {
    if (memberAction === "temporary_suspend") await db.update(memberProfiles).set({ profileStatus: "suspended", searchVisible: false }).where(eq(memberProfiles.id, record[0].reportedProfileId));
    if (memberAction === "restrict") await db.update(memberProfiles).set({ searchVisible: false }).where(eq(memberProfiles.id, record[0].reportedProfileId));
    const target = await db.select({ userId: memberProfiles.userId }).from(memberProfiles).where(eq(memberProfiles.id, record[0].reportedProfileId)).limit(1);
    if (target[0]) await dependencies.createNotification(target[0].userId, "safety", "An account safety action was applied", memberMessage, "/app/settings", `report-action:${input.reportId}:${memberAction}:${Date.now()}`);
	  }
	  await dependencies.createAuditLog(input.actorUserId, `report.${input.status}`, "report", String(input.reportId), { previousStatus: record[0].status, newStatus: input.status, memberAction, priority: input.priority ?? "normal" });
	  return { reportedProfileId: record[0].reportedProfileId, memberAction };
}

export async function addCaseNote(authorUserId: number, caseType: OperationalCaseType, caseId: number, body: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(caseNotes).values({ authorUserId, caseType, caseId, body: body.trim() });
  await createAuditLog(authorUserId, "case_note.created", caseType, String(caseId), { noteLength: body.trim().length });
}

export async function getCaseNotes(caseType: OperationalCaseType, caseId: number) {
  const db = await getDb();
  if (!db) return [];
  const notes = await db.select({ id: caseNotes.id, body: caseNotes.body, createdAt: caseNotes.createdAt, authorUserId: caseNotes.authorUserId }).from(caseNotes).where(and(eq(caseNotes.caseType, caseType), eq(caseNotes.caseId, caseId))).orderBy(asc(caseNotes.createdAt));
  const authorIds = Array.from(new Set(notes.map(note => note.authorUserId)));
  const authors = authorIds.length ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, authorIds)) : [];
  const names = new Map(authors.map(author => [author.id, author.name || "Operational staff"]));
  return notes.map(note => ({ ...note, authorName: names.get(note.authorUserId) ?? "Operational staff" }));
}

async function enrichVerificationRecords<T extends { profileId: number; assignedReviewerUserId?: number | null; reviewedByUserId?: number | null }>(records: T[]) {
  const db = await getDb();
  if (!db || !records.length) return records.map(record => ({ ...record, member: null, assignedReviewer: null, reviewer: null }));
  const profileIds = Array.from(new Set(records.map(record => record.profileId)));
  const profiles = await db.select({ id: memberProfiles.id, displayName: memberProfiles.displayName, profileStatus: memberProfiles.profileStatus, country: memberProfiles.country, city: memberProfiles.city, religion: memberProfiles.religion }).from(memberProfiles).where(inArray(memberProfiles.id, profileIds));
  const userIds = Array.from(new Set(records.flatMap(record => [record.assignedReviewerUserId, record.reviewedByUserId]).filter((id): id is number => Boolean(id))));
  const staff = userIds.length ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, userIds)) : [];
  const profilesById = new Map(profiles.map(profile => [profile.id, profile]));
  const staffById = new Map(staff.map(member => [member.id, member.name || "Operational staff"]));
  return records.map(record => ({ ...record, member: profilesById.get(record.profileId) ?? null, assignedReviewer: record.assignedReviewerUserId ? staffById.get(record.assignedReviewerUserId) ?? null : null, reviewer: record.reviewedByUserId ? staffById.get(record.reviewedByUserId) ?? null : null }));
}

async function enrichReports<T extends { reporterProfileId: number | null; reportedProfileId?: number | null; assignedModeratorUserId?: number | null }>(records: T[]) {
  const db = await getDb();
  if (!db || !records.length) return records.map(record => ({ ...record, reportedMember: null, assignedModerator: null }));
  const profileIds = Array.from(new Set(records.map(record => record.reportedProfileId).filter((id): id is number => Boolean(id))));
  const profiles = await db.select({ id: memberProfiles.id, displayName: memberProfiles.displayName, profileStatus: memberProfiles.profileStatus, country: memberProfiles.country }).from(memberProfiles).where(inArray(memberProfiles.id, profileIds));
  const staffIds = Array.from(new Set(records.map(record => record.assignedModeratorUserId).filter((id): id is number => Boolean(id))));
  const staff = staffIds.length ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, staffIds)) : [];
  const profilesById = new Map(profiles.map(profile => [profile.id, profile]));
  const staffById = new Map(staff.map(member => [member.id, member.name || "Operational staff"]));
  return records.map(record => ({ ...record, reportedMember: record.reportedProfileId ? profilesById.get(record.reportedProfileId) ?? null : null, assignedModerator: record.assignedModeratorUserId ? staffById.get(record.assignedModeratorUserId) ?? null : null }));
}

function defaultVerificationMessage(decision: VerificationDecision, reason?: VerificationReason) {
  if (decision === "approved") return "Your identity verification has been approved.";
  if (decision === "requires_resubmission") return `Action is required before verification can continue${reason === "document_unclear" ? ": please submit a clearer image of your valid document." : ". Please review your document and submit an updated version."}`;
  if (decision === "rejected") return "We could not approve this verification submission. You may submit a valid supported document for a new review.";
  return "Your verification requires additional review. We will notify you when there is an update.";
}

function memberSafeVerificationMessage(message: string | undefined, decision: VerificationDecision, reason?: VerificationReason) {
  const fallback = defaultVerificationMessage(decision, reason);
  if (["suspected_duplicate", "suspected_fraud", "requires_additional_review"].includes(reason ?? "")) return fallback;
  const candidate = message?.trim();
  if (!candidate) return fallback;
  if (candidate.length > 500) throw new Error("Keep the member-facing verification explanation to 500 characters or fewer.");
  if (/\b(fraud|risk signal|moderation|investigation|enforcement)\b/i.test(candidate)) return fallback;
  return candidate;
}

function verificationTitle(decision: VerificationDecision) {
  return ({ approved: "Identity verification approved", rejected: "Identity verification was not approved", requires_resubmission: "Verification action required", escalated: "Verification review update" } as Record<VerificationDecision, string>)[decision];
}

function defaultReportMessage(status: ReportStatus, action: ReportAction) {
  if (action === "temporary_suspend") return "Access to selected account features has been temporarily suspended while a safety matter is addressed.";
  if (action === "restrict") return "Selected account functionality has been restricted while a safety matter is addressed.";
  if (action === "warn") return "Please review Bantabato’s community and safety standards.";
  if (status === "dismissed") return "A safety review has been completed.";
  return "A safety review is in progress.";
}
