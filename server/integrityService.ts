import { and, desc, eq, gt, inArray, isNull, lt, or } from "drizzle-orm";
import { conversations, integrityPolicies, integritySignals, matches, memberProfiles, reports, safetyAppeals, safetyEnforcementActions, safetyEvidence } from "../drizzle/schema";
import { createAuditLog, getDb } from "./db";
import { emitTrustedNotification } from "./notificationService";
import { revokeConnectionsForProfile } from "./readinessService";
import { withdrawRecommendationsForProfile } from "./recommendationService";
import { DEFAULT_INTEGRITY_POLICY, actionRequiresSecondApproval, assertPermittedIntegrityMetadata, defaultMemberSafeSafetyMessage, isEligibleForAppeal, isPermanentAction, priorityForSeverity, type EnforcementActionType, type EvidenceConfidence, type IntegritySignalCategory, type IntegritySignalSource, type IntegritySeverity, validateRestrictionScope } from "./domain/integrityPolicy";

type SafetyEvidenceType = "report_reference" | "message_reference" | "account_event" | "verification_event" | "payment_event" | "family_event" | "security_event" | "staff_note" | "integrity_signal";
type EnforcementStatus = "proposed" | "active" | "expired" | "revoked" | "rejected" | "completed";
type AppealStatus = "submitted" | "in_review" | "information_requested" | "upheld" | "modified" | "overturned" | "withdrawn";

async function requireDb() { const db = await getDb(); if (!db) throw new Error("Trust & Safety operations are temporarily unavailable."); return db; }
const asId = (result: any) => Number(result?.[0]?.id ?? result?.[0]?.insertId ?? 0);
function requireMutationApplied(result: unknown, message: string) { const summary = Array.isArray(result) ? result[0] : result; if (typeof (summary as { affectedRows?: unknown } | undefined)?.affectedRows === "number" && (summary as { affectedRows: number }).affectedRows === 0) throw new Error(message); }

export async function getActiveIntegrityPolicy() {
  const db = await getDb();
  if (!db) return { id: null as number | null, ...DEFAULT_INTEGRITY_POLICY, ruleConfiguration: DEFAULT_INTEGRITY_POLICY, retentionConfiguration: DEFAULT_INTEGRITY_POLICY.retentionDays };
  const query = db.select().from(integrityPolicies).where(eq(integrityPolicies.status, "active"));
  const ordered = typeof query.orderBy === "function" ? query.orderBy(desc(integrityPolicies.activatedAt)) : query;
  const active = (await (typeof ordered.limit === "function" ? ordered.limit(1) : ordered))[0];
  if (!active) return { id: null as number | null, ...DEFAULT_INTEGRITY_POLICY, ruleConfiguration: DEFAULT_INTEGRITY_POLICY, retentionConfiguration: DEFAULT_INTEGRITY_POLICY.retentionDays };
  return { id: active.id, policyVersion: active.policyVersion, ruleConfiguration: active.ruleConfiguration ?? DEFAULT_INTEGRITY_POLICY, retentionConfiguration: active.retentionConfiguration ?? DEFAULT_INTEGRITY_POLICY.retentionDays };
}

export async function createIntegritySignal(input: { actorUserId?: number | null; subjectProfileId?: number | null; reportId?: number | null; source: IntegritySignalSource; category: IntegritySignalCategory; severity: IntegritySeverity; evidenceConfidence: EvidenceConfidence; idempotencyKey: string; safeMetadata?: unknown; policyVersion?: string }) {
  assertPermittedIntegrityMetadata(input.safeMetadata);
  const db = await requireDb();
  const existing = (await db.select().from(integritySignals).where(eq(integritySignals.idempotencyKey, input.idempotencyKey)).limit(1))[0];
  if (existing) return { signalId: existing.id, duplicate: true };
  const policy = await getActiveIntegrityPolicy();
  const insert = db.insert(integritySignals).values({ subjectProfileId: input.subjectProfileId ?? null, reportId: input.reportId ?? null, source: input.source, category: input.category, severity: input.severity, evidenceConfidence: input.evidenceConfidence, policyVersion: input.policyVersion ?? policy.policyVersion, idempotencyKey: input.idempotencyKey, safeMetadata: input.safeMetadata ?? null, createdByUserId: input.actorUserId ?? null });
  const signalId = asId(await (typeof insert.$returningId === "function" ? insert.$returningId() : insert));
  await createAuditLog(input.actorUserId ?? null, "integrity.signal_created", "integrity_signal", String(signalId), { source: input.source, category: input.category, severity: input.severity, evidenceConfidence: input.evidenceConfidence, reportId: input.reportId ?? null, subjectProfileId: input.subjectProfileId ?? null });
  return { signalId, duplicate: false };
}

export async function triageIntegritySignal(input: { actorUserId: number; signalId: number; outcome: "no_action" | "monitor" | "investigate" | "restrict_temporarily" | "escalate"; internalNote?: string }) {
  const db = await requireDb();
  const signal = (await db.select().from(integritySignals).where(eq(integritySignals.id, input.signalId)).limit(1))[0];
  if (!signal) throw new Error("Integrity signal was not found.");
  let reportId = signal.reportId;
  if (!reportId && ["monitor", "investigate", "restrict_temporarily", "escalate"].includes(input.outcome)) {
    if (!signal.subjectProfileId) throw new Error("A review case needs an identified member profile.");
    const policy = await getActiveIntegrityPolicy();
    reportId = asId(await db.insert(reports).values({ reporterProfileId: null, reportedProfileId: signal.subjectProfileId, reason: "suspicious_behavior", details: input.internalNote?.trim() || null, status: input.outcome === "escalate" ? "escalated" : input.outcome === "investigate" ? "investigating" : "triage", priority: priorityForSeverity(signal.severity), caseSource: "system_signal", policyVersion: policy.policyVersion, appealEligible: false, memberSafeSummary: "A Trust & Safety review is in progress." }).$returningId());
    await db.update(integritySignals).set({ reportId }).where(eq(integritySignals.id, signal.id));
  }
  const status = input.outcome === "no_action" ? "dismissed" : input.outcome === "monitor" ? "monitoring" : input.outcome === "investigate" ? "investigating" : "triaged";
  await db.update(integritySignals).set({ status, reviewedAt: new Date() }).where(eq(integritySignals.id, signal.id));
  if (reportId && input.outcome === "restrict_temporarily") await db.update(reports).set({ status: "action_required" }).where(eq(reports.id, reportId));
  await createAuditLog(input.actorUserId, "integrity.signal_triaged", "integrity_signal", String(signal.id), { outcome: input.outcome, reportId: reportId ?? null });
  return { reportId: reportId ?? null, status };
}

export async function addSafetyEvidence(input: { actorUserId: number; reportId: number; integritySignalId?: number | null; evidenceType: SafetyEvidenceType; sourceRecordType: string; sourceRecordId: string; evidenceConfidence: EvidenceConfidence }) {
  const db = await requireDb();
  const report = (await db.select({ id: reports.id }).from(reports).where(eq(reports.id, input.reportId)).limit(1))[0];
  if (!report) throw new Error("Trust & Safety case was not found.");
  const existing = (await db.select().from(safetyEvidence).where(and(eq(safetyEvidence.reportId, input.reportId), eq(safetyEvidence.evidenceType, input.evidenceType), eq(safetyEvidence.sourceRecordType, input.sourceRecordType), eq(safetyEvidence.sourceRecordId, input.sourceRecordId))).limit(1))[0];
  if (existing) return { evidenceId: existing.id, duplicate: true };
  const evidenceId = asId(await db.insert(safetyEvidence).values({ reportId: input.reportId, integritySignalId: input.integritySignalId ?? null, evidenceType: input.evidenceType, sourceRecordType: input.sourceRecordType, sourceRecordId: input.sourceRecordId, evidenceConfidence: input.evidenceConfidence, capturedByUserId: input.actorUserId }).$returningId());
  await createAuditLog(input.actorUserId, "safety.evidence_recorded", "safety_evidence", String(evidenceId), { reportId: input.reportId, evidenceType: input.evidenceType, sourceRecordType: input.sourceRecordType });
  return { evidenceId, duplicate: false };
}

export async function getSafetyEvidenceForReview(actorUserId: number, reportId: number) {
  const db = await requireDb();
  const rows = await db.select().from(safetyEvidence).where(eq(safetyEvidence.reportId, reportId)).orderBy(desc(safetyEvidence.createdAt));
  await createAuditLog(actorUserId, "safety.evidence_accessed", "report", String(reportId), { evidenceCount: rows.length });
  return rows.map(row => ({ id: row.id, evidenceType: row.evidenceType, sourceRecordType: row.sourceRecordType, sourceRecordId: row.sourceRecordId, evidenceConfidence: row.evidenceConfidence, integrityState: row.integrityState, capturedAt: row.capturedAt }));
}

export async function requestSafetyEnforcement(input: { actorUserId: number; reportId: number; subjectProfileId: number; actionType: EnforcementActionType; scope: string[]; reasonCode: string; memberSafeMessage?: string; expiresAt?: Date | null; idempotencyKey: string }) {
  validateRestrictionScope(input.actionType, input.scope);
  if (isPermanentAction(input.actionType) && input.expiresAt) throw new Error("Permanent-account-removal proposals may not use a temporary expiration.");
  if (!isPermanentAction(input.actionType) && input.actionType !== "warning" && !input.expiresAt) throw new Error("Temporary safety restrictions require an explicit expiration.");
	  if (input.expiresAt && input.expiresAt.getTime() <= Date.now()) throw new Error("A temporary safety restriction must expire in the future.");
  const db = await requireDb();
  const existing = (await db.select().from(safetyEnforcementActions).where(and(eq(safetyEnforcementActions.subjectProfileId, input.subjectProfileId), eq(safetyEnforcementActions.idempotencyKey, input.idempotencyKey))).limit(1))[0];
  if (existing) return { enforcementActionId: existing.id, status: existing.status, duplicate: true };
  const report = (await db.select().from(reports).where(and(eq(reports.id, input.reportId), eq(reports.reportedProfileId, input.subjectProfileId))).limit(1))[0];
  if (!report) throw new Error("The enforcement target must be the member associated with the existing Trust & Safety case.");
  const policy = await getActiveIntegrityPolicy();
  const requiresSecondApproval = actionRequiresSecondApproval(input.actionType);
  const status: EnforcementStatus = requiresSecondApproval ? "proposed" : "active";
  const actionId = asId(await db.insert(safetyEnforcementActions).values({ reportId: input.reportId, subjectProfileId: input.subjectProfileId, actionType: input.actionType, status, scope: input.scope, reasonCode: input.reasonCode, memberSafeMessage: input.memberSafeMessage?.trim() || defaultMemberSafeSafetyMessage(input.actionType), policyVersion: policy.policyVersion, requiresSecondApproval, requestedByUserId: input.actorUserId, approvedByUserId: requiresSecondApproval ? null : input.actorUserId, effectiveAt: requiresSecondApproval ? null : new Date(), expiresAt: input.expiresAt ?? null, idempotencyKey: input.idempotencyKey }).$returningId());
  await db.update(reports).set({ status: requiresSecondApproval ? "decision_pending" : "action_required", appealEligible: isEligibleForAppeal(input.actionType), memberSafeSummary: input.memberSafeMessage?.trim() || defaultMemberSafeSafetyMessage(input.actionType) }).where(eq(reports.id, input.reportId));
  if (!requiresSecondApproval) await activateSafetyEnforcement(input.actorUserId, actionId, false);
  await createAuditLog(input.actorUserId, "safety.enforcement_requested", "safety_enforcement_action", String(actionId), { reportId: input.reportId, actionType: input.actionType, scope: input.scope, requiresSecondApproval, expiresAt: input.expiresAt?.toISOString() ?? null });
  return { enforcementActionId: actionId, status, duplicate: false };
}

export async function approveSafetyEnforcement(actorUserId: number, enforcementActionId: number, expectedUpdatedAt?: Date) {
  const db = await requireDb();
  const action = (await db.select().from(safetyEnforcementActions).where(eq(safetyEnforcementActions.id, enforcementActionId)).limit(1))[0];
  if (!action || action.status !== "proposed" || !action.requiresSecondApproval) throw new Error("This safety action is not awaiting second approval.");
  if (expectedUpdatedAt && action.updatedAt.getTime() !== expectedUpdatedAt.getTime()) throw new Error("This safety action changed in another staff session. Refresh the case before approving it.");
  if (action.requestedByUserId === actorUserId) throw new Error("A separate reviewer must approve this high-impact safety action.");
	  if (action.expiresAt && action.expiresAt.getTime() <= Date.now()) {
	    await db.update(safetyEnforcementActions).set({ status: "expired", revokedAt: new Date(), revokedByUserId: actorUserId }).where(and(eq(safetyEnforcementActions.id, enforcementActionId), eq(safetyEnforcementActions.status, "proposed")));
	    await createAuditLog(actorUserId, "safety.enforcement_expired_before_approval", "safety_enforcement_action", String(enforcementActionId), { separateApprover: true });
	    throw new Error("This proposed safety action expired before separate approval and cannot be activated.");
	  }
  const approvalResult = await db.update(safetyEnforcementActions).set({ status: "active", approvedByUserId: actorUserId, effectiveAt: new Date() }).where(and(eq(safetyEnforcementActions.id, enforcementActionId), eq(safetyEnforcementActions.status, "proposed"), eq(safetyEnforcementActions.updatedAt, action.updatedAt)));
  const approvalSummary = Array.isArray(approvalResult) ? approvalResult[0] : approvalResult;
  if (typeof (approvalSummary as { affectedRows?: unknown } | undefined)?.affectedRows === "number" && (approvalSummary as { affectedRows: number }).affectedRows === 0) {
    throw new Error("This safety action was already decided or is no longer awaiting approval.");
  }
  await activateSafetyEnforcement(actorUserId, enforcementActionId, true);
  await createAuditLog(actorUserId, "safety.enforcement_approved", "safety_enforcement_action", String(enforcementActionId), { separateApprover: true });
  return { enforcementActionId, status: "active" as const };
}

async function activateSafetyEnforcement(actorUserId: number, enforcementActionId: number, notify = true) {
  const db = await requireDb();
  const action = (await db.select().from(safetyEnforcementActions).where(eq(safetyEnforcementActions.id, enforcementActionId)).limit(1))[0];
  if (!action) throw new Error("Safety action was not found.");
  const scope = Array.isArray(action.scope) ? action.scope as string[] : [];
  if (["feature_restriction", "integrity_hold", "temporary_suspension", "permanent_account_removal"].includes(action.actionType)) await db.update(memberProfiles).set({ searchVisible: false, profileStatus: ["temporary_suspension", "permanent_account_removal"].includes(action.actionType) ? "suspended" : undefined }).where(eq(memberProfiles.id, action.subjectProfileId));
  if (["messaging_restriction", "integrity_hold", "temporary_suspension", "permanent_account_removal"].includes(action.actionType)) {
    const memberMatches = await db.select({ id: matches.id }).from(matches).where(or(eq(matches.memberOneProfileId, action.subjectProfileId), eq(matches.memberTwoProfileId, action.subjectProfileId)));
	    if (memberMatches.length) await db.update(conversations).set({ status: "restricted", restrictedAt: new Date(), safetyRestrictionActionId: action.id }).where(and(inArray(conversations.matchId, memberMatches.map(match => match.id)), inArray(conversations.status, ["mutual_interest", "active"])));
  }
  if (scope.some(item => ["connection_readiness", "calls", "connection_initiation"].includes(item)) || ["connection_restriction", "integrity_hold", "temporary_suspension", "permanent_account_removal"].includes(action.actionType)) await revokeConnectionsForProfile(action.subjectProfileId, action.actionType === "temporary_suspension" ? "account_suspended" : "safety_restriction", { userId: actorUserId });
  if (["feature_restriction", "integrity_hold", "temporary_suspension", "permanent_account_removal"].includes(action.actionType)) await withdrawRecommendationsForProfile(action.subjectProfileId, "safety_restriction");
  const target = (await db.select({ userId: memberProfiles.userId }).from(memberProfiles).where(eq(memberProfiles.id, action.subjectProfileId)).limit(1))[0];
  if (notify && target) await emitTrustedNotification({ recipientUserId: target.userId, actorUserId, eventType: "trust_safety_action", notificationType: "safety", category: "safety", priority: "high", notificationClass: "transactional", sourceType: "safety_enforcement_action", sourceId: action.id, idempotencyKey: `safety-action:${action.id}`, actionPath: "/app/safety" });
}

async function restoreSafetyActionConversationEffects(actionId: number) {
	const db = await requireDb();
	await db.update(conversations).set({ status: "active", restrictedAt: null, safetyRestrictionActionId: null, lastActivityAt: new Date() }).where(and(eq(conversations.safetyRestrictionActionId, actionId), eq(conversations.status, "restricted")));
}

async function notifySafetyActionState(input: { actionId: number; actionType: string; subjectProfileId: number; actorUserId?: number | null; state: "expired" | "revoked" }) {
	const db = await requireDb();
	const target = (await db.select({ userId: memberProfiles.userId }).from(memberProfiles).where(eq(memberProfiles.id, input.subjectProfileId)).limit(1))[0];
	if (!target) return;
	await emitTrustedNotification({ recipientUserId: target.userId, actorUserId: input.actorUserId ?? null, eventType: "trust_safety_action", notificationType: "safety", category: "safety", priority: "high", notificationClass: "transactional", sourceType: "safety_enforcement_action", sourceId: input.actionId, idempotencyKey: `safety-action:${input.actionId}:${input.state}`, actionPath: "/app/safety" });
}

export async function expireSafetyEnforcements(actorUserId?: number | null, limit = 50) {
  const db = await requireDb();
  const expiring = await db.select().from(safetyEnforcementActions).where(and(eq(safetyEnforcementActions.status, "active"), lt(safetyEnforcementActions.expiresAt, new Date()))).limit(Math.min(limit, 100));
  for (const action of expiring) {
	  await db.update(safetyEnforcementActions).set({ status: "expired", revokedAt: new Date(), revokedByUserId: actorUserId ?? null }).where(and(eq(safetyEnforcementActions.id, action.id), eq(safetyEnforcementActions.status, "active")));
    const remaining = await db.select({ id: safetyEnforcementActions.id }).from(safetyEnforcementActions).where(and(eq(safetyEnforcementActions.subjectProfileId, action.subjectProfileId), eq(safetyEnforcementActions.status, "active"), or(isNull(safetyEnforcementActions.expiresAt), gt(safetyEnforcementActions.expiresAt, new Date())))).limit(1);
    if (!remaining[0] && ["temporary_suspension", "feature_restriction", "integrity_hold"].includes(action.actionType)) await db.update(memberProfiles).set({ profileStatus: "active", searchVisible: true }).where(eq(memberProfiles.id, action.subjectProfileId));
	  await restoreSafetyActionConversationEffects(action.id);
	  await notifySafetyActionState({ actionId: action.id, actionType: action.actionType, subjectProfileId: action.subjectProfileId, actorUserId, state: "expired" });
    await createAuditLog(actorUserId ?? null, "safety.enforcement_expired", "safety_enforcement_action", String(action.id), { actionType: action.actionType, subjectProfileId: action.subjectProfileId });
  }
  return { expired: expiring.length };
}

export async function revokeSafetyEnforcement(actorUserId: number, enforcementActionId: number, reason: string, expectedUpdatedAt?: Date) {
  const db = await requireDb();
  const action = (await db.select().from(safetyEnforcementActions).where(and(eq(safetyEnforcementActions.id, enforcementActionId), inArray(safetyEnforcementActions.status, ["active", "proposed"]))).limit(1))[0];
  if (!action) throw new Error("This safety action is not active or awaiting approval.");
  if (expectedUpdatedAt && action.updatedAt.getTime() !== expectedUpdatedAt.getTime()) throw new Error("This safety action changed in another staff session. Refresh the case before revoking it.");
  const revoked = await db.update(safetyEnforcementActions).set({ status: "revoked", revokedAt: new Date(), revokedByUserId: actorUserId }).where(and(eq(safetyEnforcementActions.id, action.id), inArray(safetyEnforcementActions.status, ["active", "proposed"]), eq(safetyEnforcementActions.updatedAt, action.updatedAt)));
  requireMutationApplied(revoked, "This safety action changed in another staff session. Refresh the case before revoking it.");
	await restoreSafetyActionConversationEffects(action.id);
	await notifySafetyActionState({ actionId: action.id, actionType: action.actionType, subjectProfileId: action.subjectProfileId, actorUserId, state: "revoked" });
  await createAuditLog(actorUserId, "safety.enforcement_revoked", "safety_enforcement_action", String(action.id), { reason: reason.trim().slice(0, 500) });
  return { revoked: true };
}

export async function getMemberSafetyCenter(userId: number) {
  const db = await requireDb();
  await expireSafetyEnforcements(null, 25);
  const profile = (await db.select({ id: memberProfiles.id }).from(memberProfiles).where(eq(memberProfiles.userId, userId)).limit(1))[0];
  if (!profile) return { actions: [], appeals: [] };
  const actions = await db.select({ id: safetyEnforcementActions.id, actionType: safetyEnforcementActions.actionType, status: safetyEnforcementActions.status, scope: safetyEnforcementActions.scope, memberSafeMessage: safetyEnforcementActions.memberSafeMessage, effectiveAt: safetyEnforcementActions.effectiveAt, expiresAt: safetyEnforcementActions.expiresAt, updatedAt: safetyEnforcementActions.updatedAt, reportId: safetyEnforcementActions.reportId, appealEligible: reports.appealEligible }).from(safetyEnforcementActions).innerJoin(reports, eq(safetyEnforcementActions.reportId, reports.id)).where(eq(safetyEnforcementActions.subjectProfileId, profile.id)).orderBy(desc(safetyEnforcementActions.createdAt));
  const appeals = await db.select({ id: safetyAppeals.id, enforcementActionId: safetyAppeals.enforcementActionId, status: safetyAppeals.status, submittedAt: safetyAppeals.submittedAt, decidedAt: safetyAppeals.decidedAt, updatedAt: safetyAppeals.updatedAt, decisionSummary: safetyAppeals.decisionSummary }).from(safetyAppeals).where(eq(safetyAppeals.appellantUserId, userId)).orderBy(desc(safetyAppeals.submittedAt));
  return { actions, appeals };
}

export async function submitSafetyAppeal(userId: number, enforcementActionId: number, reason: string) {
  const db = await requireDb();
  const profile = (await db.select({ id: memberProfiles.id }).from(memberProfiles).where(eq(memberProfiles.userId, userId)).limit(1))[0];
  if (!profile) throw new Error("A member profile is required to submit an appeal.");
  const action = (await db.select({ id: safetyEnforcementActions.id, reportId: safetyEnforcementActions.reportId, actionType: safetyEnforcementActions.actionType, subjectProfileId: safetyEnforcementActions.subjectProfileId, status: safetyEnforcementActions.status, appealEligible: reports.appealEligible }).from(safetyEnforcementActions).innerJoin(reports, eq(safetyEnforcementActions.reportId, reports.id)).where(eq(safetyEnforcementActions.id, enforcementActionId)).limit(1))[0];
  if (!action || action.subjectProfileId !== profile.id || !action.appealEligible || !isEligibleForAppeal(action.actionType)) throw new Error("This safety action is not eligible for an appeal.");
  const existing = (await db.select().from(safetyAppeals).where(and(eq(safetyAppeals.enforcementActionId, action.id), eq(safetyAppeals.appellantUserId, userId))).limit(1))[0];
  if (existing) return { appealId: existing.id, duplicate: true };
  let appealId = 0;
  try { appealId = asId(await db.insert(safetyAppeals).values({ reportId: action.reportId, enforcementActionId: action.id, appellantUserId: userId, reason: reason.trim() }).$returningId()); }
  catch (error) { const recovered = (await db.select({ id: safetyAppeals.id }).from(safetyAppeals).where(and(eq(safetyAppeals.enforcementActionId, action.id), eq(safetyAppeals.appellantUserId, userId))).limit(1))[0]; if (recovered) return { appealId: recovered.id, duplicate: true }; throw error; }
  await db.update(reports).set({ status: "appealed" }).where(eq(reports.id, action.reportId));
  await createAuditLog(userId, "safety.appeal_submitted", "safety_appeal", String(appealId), { enforcementActionId });
  return { appealId, duplicate: false };
}

export async function withdrawSafetyAppeal(userId: number, appealId: number, expectedUpdatedAt?: Date) {
	const db = await requireDb();
	const appeal = (await db.select({ id: safetyAppeals.id, status: safetyAppeals.status, updatedAt: safetyAppeals.updatedAt, enforcementActionId: safetyAppeals.enforcementActionId }).from(safetyAppeals).where(and(eq(safetyAppeals.id, appealId), eq(safetyAppeals.appellantUserId, userId))).limit(1))[0];
	if (!appeal || !["submitted", "information_requested"].includes(appeal.status)) throw new Error("This appeal can no longer be withdrawn.");
	if (expectedUpdatedAt && appeal.updatedAt.getTime() !== expectedUpdatedAt.getTime()) throw new Error("This appeal changed in another session. Refresh your Safety Center before trying again.");
	const withdrawn = await db.update(safetyAppeals).set({ status: "withdrawn", decidedAt: new Date(), decisionSummary: "The member withdrew this appeal." }).where(and(eq(safetyAppeals.id, appeal.id), eq(safetyAppeals.updatedAt, appeal.updatedAt), inArray(safetyAppeals.status, ["submitted", "information_requested"])));
	requireMutationApplied(withdrawn, "This appeal changed in another session. Refresh your Safety Center before trying again.");
	await createAuditLog(userId, "safety.appeal_withdrawn", "safety_appeal", String(appeal.id), { enforcementActionId: appeal.enforcementActionId });
	return { withdrawn: true };
}

export async function getMemberSafetyReports(userId: number) {
	const db = await requireDb();
	const profile = (await db.select({ id: memberProfiles.id }).from(memberProfiles).where(eq(memberProfiles.userId, userId)).limit(1))[0];
	if (!profile) return [];
	return db.select({ id: reports.id, reason: reports.reason, status: reports.status, memberSafeSummary: reports.memberSafeSummary, memberMessage: reports.memberMessage, createdAt: reports.createdAt, updatedAt: reports.updatedAt, memberUpdatedAt: reports.memberUpdatedAt, memberWithdrawnAt: reports.memberWithdrawnAt }).from(reports).where(and(eq(reports.reporterProfileId, profile.id), eq(reports.caseSource, "member_report"))).orderBy(desc(reports.createdAt)).limit(50);
}

export async function updateMemberSafetyReport(userId: number, reportId: number, details: string, expectedUpdatedAt?: Date) {
	const db = await requireDb();
	const profile = (await db.select({ id: memberProfiles.id }).from(memberProfiles).where(eq(memberProfiles.userId, userId)).limit(1))[0];
	if (!profile) throw new Error("A member profile is required to update a report.");
	const record = (await db.select({ id: reports.id, status: reports.status, updatedAt: reports.updatedAt }).from(reports).where(and(eq(reports.id, reportId), eq(reports.reporterProfileId, profile.id), eq(reports.caseSource, "member_report"))).limit(1))[0];
	if (!record || !["open", "triage"].includes(record.status)) throw new Error("This report can no longer be updated because review has started.");
	if (expectedUpdatedAt && record.updatedAt.getTime() !== expectedUpdatedAt.getTime()) throw new Error("This report changed in another session. Refresh your report history before trying again.");
	const updated = await db.update(reports).set({ details: details.trim(), memberUpdatedAt: new Date() }).where(and(eq(reports.id, record.id), eq(reports.updatedAt, record.updatedAt), inArray(reports.status, ["open", "triage"])));
	requireMutationApplied(updated, "This report changed in another session. Refresh your report history before trying again.");
	await createAuditLog(userId, "safety.report_updated", "report", String(record.id), { memberOwned: true, detailLength: details.trim().length });
	return { updated: true };
}

export async function withdrawMemberSafetyReport(userId: number, reportId: number, expectedUpdatedAt?: Date) {
	const db = await requireDb();
	const profile = (await db.select({ id: memberProfiles.id }).from(memberProfiles).where(eq(memberProfiles.userId, userId)).limit(1))[0];
	if (!profile) throw new Error("A member profile is required to withdraw a report.");
	const record = (await db.select({ id: reports.id, status: reports.status, updatedAt: reports.updatedAt }).from(reports).where(and(eq(reports.id, reportId), eq(reports.reporterProfileId, profile.id), eq(reports.caseSource, "member_report"))).limit(1))[0];
	if (!record || !["open", "triage"].includes(record.status)) throw new Error("This report can no longer be withdrawn because review has started.");
	if (expectedUpdatedAt && record.updatedAt.getTime() !== expectedUpdatedAt.getTime()) throw new Error("This report changed in another session. Refresh your report history before trying again.");
	const now = new Date();
	const withdrawn = await db.update(reports).set({ status: "closed", memberWithdrawnAt: now, memberSafeSummary: "You withdrew this report before a review began.", memberMessage: "You withdrew this report before a review began." }).where(and(eq(reports.id, record.id), eq(reports.updatedAt, record.updatedAt), inArray(reports.status, ["open", "triage"])));
	requireMutationApplied(withdrawn, "This report changed in another session. Refresh your report history before trying again.");
	await db.update(integritySignals).set({ status: "dismissed", reviewedAt: now }).where(and(eq(integritySignals.reportId, record.id), eq(integritySignals.status, "new")));
	await createAuditLog(userId, "safety.report_withdrawn", "report", String(record.id), { memberOwned: true });
	return { withdrawn: true };
}

export async function reviewSafetyAppeal(input: { actorUserId: number; appealId: number; status: Exclude<AppealStatus, "submitted" | "withdrawn">; decisionSummary: string; expectedUpdatedAt?: Date }) {
  const db = await requireDb();
  const appeal = (await db.select({ id: safetyAppeals.id, reportId: safetyAppeals.reportId, enforcementActionId: safetyAppeals.enforcementActionId, status: safetyAppeals.status, updatedAt: safetyAppeals.updatedAt, appellantUserId: safetyAppeals.appellantUserId, requestedByUserId: safetyEnforcementActions.requestedByUserId, approvedByUserId: safetyEnforcementActions.approvedByUserId }).from(safetyAppeals).innerJoin(safetyEnforcementActions, eq(safetyAppeals.enforcementActionId, safetyEnforcementActions.id)).where(eq(safetyAppeals.id, input.appealId)).limit(1))[0];
  if (!appeal || !["submitted", "in_review", "information_requested"].includes(appeal.status)) throw new Error("This appeal is not awaiting review.");
  if (input.expectedUpdatedAt && appeal.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) throw new Error("This appeal changed in another staff session. Refresh the case before reviewing it.");
  if ([appeal.requestedByUserId, appeal.approvedByUserId].includes(input.actorUserId)) throw new Error("The appeal must be reviewed by staff other than the original decision maker.");
  const reviewed = await db.update(safetyAppeals).set({ status: input.status, reviewerUserId: input.actorUserId, decisionSummary: input.decisionSummary.trim(), decidedAt: ["upheld", "modified", "overturned"].includes(input.status) ? new Date() : null }).where(and(eq(safetyAppeals.id, appeal.id), eq(safetyAppeals.updatedAt, appeal.updatedAt), inArray(safetyAppeals.status, ["submitted", "in_review", "information_requested"])));
  requireMutationApplied(reviewed, "This appeal changed in another staff session. Refresh the case before reviewing it.");
  if (input.status === "overturned") await revokeSafetyEnforcement(input.actorUserId, appeal.enforcementActionId, "Appeal overturned the enforcement action.");
  if (["upheld", "modified", "overturned"].includes(input.status)) {
    const recipient = (await db.select({ userId: memberProfiles.userId }).from(memberProfiles).innerJoin(safetyEnforcementActions, eq(memberProfiles.id, safetyEnforcementActions.subjectProfileId)).where(eq(safetyEnforcementActions.id, appeal.enforcementActionId)).limit(1))[0];
    if (recipient) await emitTrustedNotification({ recipientUserId: recipient.userId, actorUserId: input.actorUserId, eventType: "trust_safety_action", notificationType: "safety", category: "safety", priority: "high", notificationClass: "transactional", sourceType: "safety_appeal", sourceId: appeal.id, idempotencyKey: `safety-appeal:${appeal.id}:${input.status}`, actionPath: "/app/safety" });
  }
  await createAuditLog(input.actorUserId, "safety.appeal_reviewed", "safety_appeal", String(appeal.id), { status: input.status, separateReviewer: true });
  return { appealId: appeal.id, status: input.status };
}

export async function listSafetyOperations() {
  const db = await requireDb();
  await expireSafetyEnforcements(null, 25);
  return db.select().from(reports).where(inArray(reports.status, ["open", "triage", "in_review", "investigating", "awaiting_information", "action_required", "decision_pending", "escalated", "appealed", "reopened"])).orderBy(desc(reports.priority), desc(reports.createdAt)).limit(100);
}

export async function getSafetyCaseDetail(actorUserId: number, reportId: number) {
  const db = await requireDb();
  const report = (await db.select({ id: reports.id, reportedProfileId: reports.reportedProfileId, reason: reports.reason, status: reports.status, priority: reports.priority, caseSource: reports.caseSource, memberSafeSummary: reports.memberSafeSummary, updatedAt: reports.updatedAt }).from(reports).where(eq(reports.id, reportId)).limit(1))[0];
  if (!report) throw new Error("Trust & Safety case was not found.");
  const [signals, evidence, actions, appeals] = await Promise.all([
    db.select({ id: integritySignals.id, source: integritySignals.source, category: integritySignals.category, severity: integritySignals.severity, evidenceConfidence: integritySignals.evidenceConfidence, status: integritySignals.status, reviewedAt: integritySignals.reviewedAt }).from(integritySignals).where(eq(integritySignals.reportId, reportId)).orderBy(desc(integritySignals.createdAt)),
    db.select({ id: safetyEvidence.id, evidenceType: safetyEvidence.evidenceType, sourceRecordType: safetyEvidence.sourceRecordType, sourceRecordId: safetyEvidence.sourceRecordId, evidenceConfidence: safetyEvidence.evidenceConfidence, integrityState: safetyEvidence.integrityState, capturedAt: safetyEvidence.capturedAt }).from(safetyEvidence).where(eq(safetyEvidence.reportId, reportId)).orderBy(desc(safetyEvidence.createdAt)),
    db.select({ id: safetyEnforcementActions.id, actionType: safetyEnforcementActions.actionType, status: safetyEnforcementActions.status, scope: safetyEnforcementActions.scope, requiresSecondApproval: safetyEnforcementActions.requiresSecondApproval, expiresAt: safetyEnforcementActions.expiresAt, updatedAt: safetyEnforcementActions.updatedAt }).from(safetyEnforcementActions).where(eq(safetyEnforcementActions.reportId, reportId)).orderBy(desc(safetyEnforcementActions.createdAt)),
    db.select({ id: safetyAppeals.id, status: safetyAppeals.status, submittedAt: safetyAppeals.submittedAt, decidedAt: safetyAppeals.decidedAt, updatedAt: safetyAppeals.updatedAt }).from(safetyAppeals).where(eq(safetyAppeals.reportId, reportId)).orderBy(desc(safetyAppeals.submittedAt)),
  ]);
  await createAuditLog(actorUserId, "staff.safety_case_opened", "report", String(reportId), { signalCount: signals.length, evidenceCount: evidence.length, enforcementCount: actions.length, appealCount: appeals.length });
  return { ...report, signals, evidence, actions, appeals };
}

export async function saveIntegrityPolicy(actorUserId: number, input: { policyVersion: string; ruleConfiguration?: unknown; retentionConfiguration?: unknown; activate: boolean }) {
  assertPermittedIntegrityMetadata(input.ruleConfiguration);
  const db = await requireDb();
  const existing = (await db.select().from(integrityPolicies).where(eq(integrityPolicies.policyVersion, input.policyVersion)).limit(1))[0];
  if (existing) throw new Error("Create a new version instead of silently changing an integrity policy.");
  if (input.activate) await db.update(integrityPolicies).set({ status: "retired" }).where(eq(integrityPolicies.status, "active"));
  const policyId = asId(await db.insert(integrityPolicies).values({ policyVersion: input.policyVersion, status: input.activate ? "active" : "draft", ruleConfiguration: input.ruleConfiguration ?? DEFAULT_INTEGRITY_POLICY, retentionConfiguration: input.retentionConfiguration ?? DEFAULT_INTEGRITY_POLICY.retentionDays, createdByUserId: actorUserId, activatedAt: input.activate ? new Date() : null }).$returningId());
  await createAuditLog(actorUserId, "integrity.policy_created", "integrity_policy", String(policyId), { policyVersion: input.policyVersion, activate: input.activate });
  return { policyId };
}
