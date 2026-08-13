import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { adminRoles, caseNotes, memberProfiles, reports, users, verificationRecords } from "../drizzle/schema";
import { createAuditLog, createNotification, getDb, getVerificationDocumentForReview } from "./db";
import { canDecideVerification, hasOperationalScope } from "./domain/operationsPolicy";
import { ENV } from "./_core/env";

export const ADMIN_SCOPES = ["verification_reviewer", "trust_safety", "support_agent", "subscription_manager", "platform_admin"] as const;
export type AdminScope = (typeof ADMIN_SCOPES)[number];
export const VERIFICATION_REASONS = ["document_unclear", "document_expired", "document_unsupported", "information_mismatch", "image_quality_insufficient", "verification_image_insufficient", "suspected_duplicate", "suspected_fraud", "requires_additional_review", "other"] as const;
export type VerificationReason = (typeof VERIFICATION_REASONS)[number];

type VerificationDecision = "approved" | "rejected" | "requires_resubmission" | "escalated";
type ReportStatus = "in_review" | "action_required" | "resolved" | "dismissed" | "escalated";
type ReportAction = "none" | "warn" | "restrict" | "temporary_suspend";

type WorkflowDependencies = {
  getDb: () => Promise<any>;
  createAuditLog: (...args: any[]) => Promise<void>;
  createNotification: (...args: any[]) => Promise<void>;
};

const productionWorkflowDependencies: WorkflowDependencies = { getDb, createAuditLog, createNotification };

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
  const record = await db.select({ status: verificationRecords.status, assignedReviewerUserId: verificationRecords.assignedReviewerUserId }).from(verificationRecords).where(eq(verificationRecords.id, verificationId)).limit(1);
  if (!record[0]) throw new Error("Verification case not found");
  await db.update(verificationRecords).set({ status: "under_review", assignedReviewerUserId: actorUserId }).where(eq(verificationRecords.id, verificationId));
  await dependencies.createAuditLog(actorUserId, "verification.claimed", "verification_record", String(verificationId), { previousStatus: record[0].status, newStatus: "under_review" });
}

export async function decideVerificationCase(input: { actorUserId: number; verificationId: number; decision: VerificationDecision; reason?: VerificationReason; internalNote?: string; memberMessage?: string; priority?: "standard" | "attention" | "high" }, dependencies: WorkflowDependencies = productionWorkflowDependencies) {
  const db = await dependencies.getDb();
  if (!db) throw new Error("Database unavailable");
  const record = await db.select({ status: verificationRecords.status, profileId: verificationRecords.profileId }).from(verificationRecords).where(eq(verificationRecords.id, input.verificationId)).limit(1);
  if (!record[0] || !canDecideVerification(record[0].status)) throw new Error("This verification case is not awaiting an operational decision");
  const memberMessage = input.memberMessage?.trim() || defaultVerificationMessage(input.decision, input.reason);
  const closed = input.decision !== "escalated";
  await db.update(verificationRecords).set({
    status: input.decision,
    reviewReason: input.reason ?? null,
    memberMessage,
    priority: input.priority ?? "standard",
    reviewedByUserId: input.actorUserId,
    assignedReviewerUserId: input.actorUserId,
    reviewedAt: new Date(),
    escalatedAt: input.decision === "escalated" ? new Date() : null,
    closedAt: closed ? new Date() : null,
  }).where(eq(verificationRecords.id, input.verificationId));
  if (input.internalNote?.trim()) await addCaseNote(input.actorUserId, "verification", input.verificationId, input.internalNote);
  const profile = await db.select({ userId: memberProfiles.userId }).from(memberProfiles).where(eq(memberProfiles.id, record[0].profileId)).limit(1);
  if (profile[0]) await dependencies.createNotification(profile[0].userId, "verification", verificationTitle(input.decision), memberMessage, "/app/verification", `verification:${input.verificationId}:${input.decision}:${Date.now()}`);
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
  const record = await db.select({ status: reports.status }).from(reports).where(eq(reports.id, reportId)).limit(1);
  if (!record[0]) throw new Error("Report case not found");
  await db.update(reports).set({ status: "in_review", assignedModeratorUserId: actorUserId, reviewedByUserId: actorUserId }).where(eq(reports.id, reportId));
  await dependencies.createAuditLog(actorUserId, "report.claimed", "report", String(reportId), { previousStatus: record[0].status, newStatus: "in_review" });
}

export async function decideReportCase(input: { actorUserId: number; reportId: number; status: ReportStatus; priority?: "low" | "normal" | "high" | "critical"; memberAction?: ReportAction; internalNote?: string; memberMessage?: string; resolution?: string }, dependencies: WorkflowDependencies = productionWorkflowDependencies) {
  const db = await dependencies.getDb();
  if (!db) throw new Error("Database unavailable");
  const record = await db.select({ status: reports.status, reportedProfileId: reports.reportedProfileId }).from(reports).where(eq(reports.id, input.reportId)).limit(1);
  if (!record[0]) throw new Error("Report case not found");
  const memberAction = input.memberAction ?? "none";
  const memberMessage = input.memberMessage?.trim() || defaultReportMessage(input.status, memberAction);
  await db.update(reports).set({ status: input.status, priority: input.priority ?? "normal", memberAction, memberMessage, resolution: input.resolution?.trim() || null, assignedModeratorUserId: input.actorUserId, reviewedByUserId: input.actorUserId, resolvedAt: ["resolved", "dismissed"].includes(input.status) ? new Date() : null }).where(eq(reports.id, input.reportId));
  if (input.internalNote?.trim()) await addCaseNote(input.actorUserId, "report", input.reportId, input.internalNote);
  if (record[0].reportedProfileId && memberAction !== "none") {
    if (memberAction === "temporary_suspend") await db.update(memberProfiles).set({ profileStatus: "suspended", searchVisible: false }).where(eq(memberProfiles.id, record[0].reportedProfileId));
    if (memberAction === "restrict") await db.update(memberProfiles).set({ searchVisible: false }).where(eq(memberProfiles.id, record[0].reportedProfileId));
    const target = await db.select({ userId: memberProfiles.userId }).from(memberProfiles).where(eq(memberProfiles.id, record[0].reportedProfileId)).limit(1);
    if (target[0]) await dependencies.createNotification(target[0].userId, "safety", "An account safety action was applied", memberMessage, "/app/settings", `report-action:${input.reportId}:${memberAction}:${Date.now()}`);
  }
  await dependencies.createAuditLog(input.actorUserId, `report.${input.status}`, "report", String(input.reportId), { previousStatus: record[0].status, newStatus: input.status, memberAction, priority: input.priority ?? "normal" });
}

export async function addCaseNote(authorUserId: number, caseType: "verification" | "report", caseId: number, body: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(caseNotes).values({ authorUserId, caseType, caseId, body: body.trim() });
  await createAuditLog(authorUserId, "case_note.created", caseType, String(caseId), { noteLength: body.trim().length });
}

async function getCaseNotes(caseType: "verification" | "report", caseId: number) {
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

async function enrichReports<T extends { reporterProfileId: number; reportedProfileId?: number | null; assignedModeratorUserId?: number | null }>(records: T[]) {
  const db = await getDb();
  if (!db || !records.length) return records.map(record => ({ ...record, reporter: null, reportedMember: null, assignedModerator: null }));
  const profileIds = Array.from(new Set(records.flatMap(record => [record.reporterProfileId, record.reportedProfileId]).filter((id): id is number => Boolean(id))));
  const profiles = await db.select({ id: memberProfiles.id, displayName: memberProfiles.displayName, profileStatus: memberProfiles.profileStatus, country: memberProfiles.country }).from(memberProfiles).where(inArray(memberProfiles.id, profileIds));
  const staffIds = Array.from(new Set(records.map(record => record.assignedModeratorUserId).filter((id): id is number => Boolean(id))));
  const staff = staffIds.length ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, staffIds)) : [];
  const profilesById = new Map(profiles.map(profile => [profile.id, profile]));
  const staffById = new Map(staff.map(member => [member.id, member.name || "Operational staff"]));
  return records.map(record => ({ ...record, reporter: profilesById.get(record.reporterProfileId) ?? null, reportedMember: record.reportedProfileId ? profilesById.get(record.reportedProfileId) ?? null : null, assignedModerator: record.assignedModeratorUserId ? staffById.get(record.assignedModeratorUserId) ?? null : null }));
}

function defaultVerificationMessage(decision: VerificationDecision, reason?: VerificationReason) {
  if (decision === "approved") return "Your identity verification has been approved.";
  if (decision === "requires_resubmission") return `Action is required before verification can continue${reason === "document_unclear" ? ": please submit a clearer image of your valid document." : ". Please review your document and submit an updated version."}`;
  if (decision === "rejected") return "We could not approve this verification submission. You may submit a valid supported document for a new review.";
  return "Your verification requires additional review. We will notify you when there is an update.";
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
