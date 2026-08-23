import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { blocks, communicationPermissions, communicationRevocations, connectionConsents, connectionEvents, connectionReadinessPolicies, connectionReviews, connectionStates, conversationEvents, conversationInteractionSignals, conversations, matches, memberProfiles, reports, verificationRecords } from "../drizzle/schema";
import { getCompatibilityExplanation } from "./compatibilityService";
import { createAuditLog, createNotification, getDb, getMemberEligibility } from "./db";
import { DEFAULT_READINESS_POLICY, evaluateConnectionReadiness, type ParticipantSignals, type ReadinessPolicy } from "./domain/readinessPolicy";
import { createIntegritySignal } from "./integrityService";
import { withdrawFamilySharesForProfilePair } from "./familyService";
import { addCaseNote, getCaseNotes } from "./operations";

const STAGE_CONFIG = ["mutual_interest", "text_conversation", "voice_note_conversation", "ready_for_review", "voice_call_eligible", "video_call_eligible"];
type Capability = "voice" | "video";
type RevocationReason = "member_withdrew_consent" | "block" | "open_report" | "safety_restriction" | "account_suspended" | "hard_incompatibility" | "manual_review" | "other";

export async function getReadinessForMember(profileId: number, conversationId: number) {
  const access = await requireReadinessAccess(profileId, conversationId);
  const evaluation = await evaluateConversationReadiness(access);
  return presentReadiness(evaluation, profileId, access.otherProfileId);
}

export async function evaluateConversationReadiness(access: Awaited<ReturnType<typeof requireReadinessAccess>>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const policy = await getActiveReadinessPolicy();
  const state = await ensureConnectionState(access.conversation.id, policy);
	  const [signalRows, eventRows, profileRows, blockedRows, reportRows, verificationRows, compatibility, consentRows, integrityReviewRows] = await Promise.all([
	    db.select().from(conversationInteractionSignals).where(eq(conversationInteractionSignals.conversationId, access.conversation.id)),
	    db.select({ actorProfileId: conversationEvents.actorProfileId, eventType: conversationEvents.eventType, createdAt: conversationEvents.createdAt }).from(conversationEvents).where(eq(conversationEvents.conversationId, access.conversation.id)),
    db.select({ id: memberProfiles.id, profileStatus: memberProfiles.profileStatus, deletedAt: memberProfiles.deletedAt }).from(memberProfiles).where(inArray(memberProfiles.id, [access.profileId, access.otherProfileId])),
    db.select({ id: blocks.id }).from(blocks).where(or(and(eq(blocks.blockerProfileId, access.profileId), eq(blocks.blockedProfileId, access.otherProfileId)), and(eq(blocks.blockerProfileId, access.otherProfileId), eq(blocks.blockedProfileId, access.profileId)))).limit(1),
    db.select({ id: reports.id, priority: reports.priority }).from(reports).where(and(eq(reports.conversationId, access.conversation.id), inArray(reports.status, ["open", "in_review", "action_required", "escalated"]))).limit(50),
	    db.select({ profileId: verificationRecords.profileId }).from(verificationRecords).where(and(inArray(verificationRecords.profileId, [access.profileId, access.otherProfileId]), eq(verificationRecords.verificationType, "identity_document"), eq(verificationRecords.status, "approved"))),
	    getCompatibilityExplanation(access.profileId, access.otherProfileId),
	    db.select().from(connectionConsents).where(and(eq(connectionConsents.connectionStateId, state.id), inArray(connectionConsents.profileId, [access.profileId, access.otherProfileId]))),
	    db.select({ id: connectionReviews.id }).from(connectionReviews).where(and(eq(connectionReviews.connectionStateId, state.id), eq(connectionReviews.reason, "fraud_concern"), inArray(connectionReviews.status, ["pending", "escalated"]))).limit(1),
	  ]);
  const signals = signalByProfile(signalRows, eventRows, access.profileId, access.otherProfileId);
  const eligibilityRows = await Promise.all([getMemberEligibility(access.profileId), getMemberEligibility(access.otherProfileId)]);
  const bothActive = profileRows.length === 2 && profileRows.every(profile => profile.profileStatus === "active" && !profile.deletedAt) && eligibilityRows.every(eligibility => eligibility.connectionEligible);
  const severeOpenReport = reportRows.some(report => report.priority === "high" || report.priority === "critical");
  const verified = verificationRows.length === 2;
  const bothVoiceConsent = hasMutualConsent(consentRows, access.profileId, access.otherProfileId, "voice");
  const bothVideoConsent = hasMutualConsent(consentRows, access.profileId, access.otherProfileId, "video");
	  const evaluation = evaluateConnectionReadiness({ policy: policy.thresholds, one: signals.get(access.profileId)!, two: signals.get(access.otherProfileId)!, gates: { noActiveBlock: !blockedRows[0], noSeriousSafetyRestriction: access.conversation.status !== "restricted", noOpenSeriousReport: !severeOpenReport, noInteractionIntegrityConcern: !integrityReviewRows[0], accountsActive: bothActive, hardCompatibilityEligible: compatibility.eligible, identityVerified: verified, voiceConsentsGranted: bothVoiceConsent, videoConsentsGranted: bothVideoConsent } });
  await db.update(connectionStates).set({ policyId: policy.id, stage: evaluation.stage, status: evaluation.status, readinessSummary: { criteria: evaluation.criteria, memberExplanation: evaluation.memberExplanation }, policySnapshot: { stageConfig: policy.stageConfig, thresholds: policy.thresholds }, reviewRequired: evaluation.reviewRequired, voiceEligible: evaluation.voiceEligible, videoEligible: evaluation.videoEligible, lastEvaluatedAt: new Date(), pausedAt: evaluation.status === "paused" ? new Date() : null, restrictedAt: evaluation.status === "restricted" ? new Date() : null }).where(eq(connectionStates.id, state.id));
  await upsertPermission(state.id, "voice", evaluation.voiceEligible ? "available" : "unavailable");
  await upsertPermission(state.id, "video", evaluation.videoEligible ? "available" : "unavailable");
  await db.insert(connectionEvents).values({ connectionStateId: state.id, actorProfileId: null, actorUserId: null, eventType: evaluation.readyForReview ? "ready_for_review" : "evaluated", metadata: { stage: evaluation.stage, status: evaluation.status, readyForReview: evaluation.readyForReview } });
  if (evaluation.reviewRequired) {
    const openReview = await db.select({ id: connectionReviews.id }).from(connectionReviews).where(and(eq(connectionReviews.connectionStateId, state.id), inArray(connectionReviews.status, ["pending", "escalated"]))).limit(1);
    if (!openReview[0]) await db.insert(connectionReviews).values({ connectionStateId: state.id, status: "pending", reason: "policy_requirement" });
  }
  return { ...evaluation, stateId: state.id, policy, access, consents: consentRows };
}

export async function grantConnectionConsent(profileId: number, conversationId: number, capability: Capability) {
  const access = await requireReadinessAccess(profileId, conversationId);
  const evaluated = await evaluateConversationReadiness(access);
  if (!evaluated.readyForReview) throw new Error("This connection is still building. Consent becomes available after the current readiness requirements are met.");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(connectionConsents).values({ connectionStateId: evaluated.stateId, profileId, capability, status: "granted", grantedAt: new Date(), withdrawnAt: null }).onDuplicateKeyUpdate({ set: { status: "granted", grantedAt: new Date(), withdrawnAt: null } });
  await db.insert(connectionEvents).values({ connectionStateId: evaluated.stateId, actorProfileId: profileId, actorUserId: null, eventType: capability === "voice" ? "voice_consent_granted" : "video_consent_granted" });
  await createAuditLog(null, `connection.${capability}_consent_granted`, "connection_state", String(evaluated.stateId), { conversationId, profileId });
	  const otherUser = await db.select({ userId: memberProfiles.userId }).from(memberProfiles).where(eq(memberProfiles.id, access.otherProfileId)).limit(1);
	  if (otherUser[0]) await createNotification(otherUser[0].userId, "connection", capability === "voice" ? "Voice communication consent" : "Video communication consent", "Your match has chosen to consider this next communication step. Your separate consent is always required.", `/app/readiness/${conversationId}`, `connection-consent:${evaluated.stateId}:${capability}:${profileId}`);
	  return { granted: true };
}

export async function withdrawConnectionConsent(profileId: number, conversationId: number, capability: Capability) {
  const access = await requireReadinessAccess(profileId, conversationId);
  const state = await ensureConnectionState(access.conversation.id, await getActiveReadinessPolicy());
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
	  await db.insert(connectionConsents).values({ connectionStateId: state.id, profileId, capability, status: "withdrawn", withdrawnAt: new Date() }).onDuplicateKeyUpdate({ set: { status: "withdrawn", withdrawnAt: new Date() } });
	  await revokeConnectionState(state.id, capability, "member_withdrew_consent", { actorProfileId: profileId });
	  await db.insert(connectionEvents).values({ connectionStateId: state.id, actorProfileId: profileId, actorUserId: null, eventType: capability === "voice" ? "voice_consent_withdrawn" : "video_consent_withdrawn" });
	  return { withdrawn: true };
}

export async function revokeConnectionForConversation(conversationId: number, reason: RevocationReason, actor: { profileId?: number; userId?: number } = {}) {
  const db = await getDb();
  if (!db) return;
  const state = await findConnectionState(conversationId);
  const conversation = await db.select({ matchId: conversations.matchId }).from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  const match = conversation[0] ? (await db.select({ firstProfileId: matches.memberOneProfileId, secondProfileId: matches.memberTwoProfileId }).from(matches).where(eq(matches.id, conversation[0].matchId)).limit(1))[0] : null;
  if (match) await withdrawFamilySharesForProfilePair(match.firstProfileId, match.secondProfileId, reason === "safety_restriction" || reason === "account_suspended" ? "safety_restriction" : "connection_unavailable");
  if (!state) return;
  await revokeConnectionState(state.id, "all", reason, { actorProfileId: actor.profileId, actorUserId: actor.userId });
}

export async function revokeConnectionForProfilePair(firstProfileId: number, secondProfileId: number, reason: RevocationReason, actor: { profileId?: number; userId?: number } = {}) {
	  const db = await getDb();
	  if (!db) return;
  const pair = await db.select({ id: matches.id }).from(matches).where(or(and(eq(matches.memberOneProfileId, firstProfileId), eq(matches.memberTwoProfileId, secondProfileId)), and(eq(matches.memberOneProfileId, secondProfileId), eq(matches.memberTwoProfileId, firstProfileId)))).limit(1);
  if (!pair[0]) return;
	  const conversation = await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.matchId, pair[0].id)).limit(1);
	  if (conversation[0]) await revokeConnectionForConversation(conversation[0].id, reason, actor);
}

export async function revokeConnectionsForProfile(profileId: number, reason: RevocationReason, actor: { profileId?: number; userId?: number } = {}) {
	  const db = await getDb();
	  if (!db) return;
	  const matchRows = await db.select({ id: matches.id }).from(matches).where(or(eq(matches.memberOneProfileId, profileId), eq(matches.memberTwoProfileId, profileId)));
	  if (!matchRows.length) return;
	  const conversationRows = await db.select({ id: conversations.id }).from(conversations).where(inArray(conversations.matchId, matchRows.map(match => match.id)));
	  await Promise.all(conversationRows.map(conversation => revokeConnectionForConversation(conversation.id, reason, actor)));
}

export async function revokeHardIncompatibleConnectionsForProfile(profileId: number) {
	  const db = await getDb();
	  if (!db) return;
	  const matchRows = await db.select().from(matches).where(and(or(eq(matches.memberOneProfileId, profileId), eq(matches.memberTwoProfileId, profileId)), eq(matches.status, "active")));
	  for (const match of matchRows) {
	    const otherProfileId = match.memberOneProfileId === profileId ? match.memberTwoProfileId : match.memberOneProfileId;
	    const compatibility = await getCompatibilityExplanation(profileId, otherProfileId);
	    if (!compatibility.eligible) await revokeConnectionForProfilePair(profileId, otherProfileId, "hard_incompatibility", { profileId });
	  }
}

export async function flagConnectionIntegrityConcern(actorUserId: number, conversationId: number, internalNote?: string) {
	  const db = await getDb();
	  if (!db) throw new Error("Database unavailable");
	  const state = await ensureConnectionState(conversationId, await getActiveReadinessPolicy());
	  const existing = await db.select({ id: connectionReviews.id }).from(connectionReviews).where(and(eq(connectionReviews.connectionStateId, state.id), eq(connectionReviews.reason, "fraud_concern"), inArray(connectionReviews.status, ["pending", "escalated"]))).limit(1);
	  const reviewId = existing[0]?.id ?? Number((await db.insert(connectionReviews).values({ connectionStateId: state.id, status: "pending", reason: "fraud_concern", assignedReviewerUserId: actorUserId }))[0].insertId);
	  if (internalNote?.trim()) await addCaseNote(actorUserId, "connection_review", reviewId, internalNote);
	  await createIntegritySignal({ actorUserId, source: "connection_readiness", category: "connection_readiness_abuse", severity: "medium", evidenceConfidence: "limited", idempotencyKey: `connection-review:${reviewId}` });
	  await revokeConnectionState(state.id, "all", "other", { actorUserId });
	  await createAuditLog(actorUserId, "connection.integrity_flagged", "connection_review", String(reviewId), { conversationId });
	  return { reviewId };
}

export async function listConnectionReviewQueue() {
	  const db = await getDb();
	  if (!db) return [];
	  return db.select({ id: connectionReviews.id, connectionStateId: connectionReviews.connectionStateId, status: connectionReviews.status, reason: connectionReviews.reason, assignedReviewerUserId: connectionReviews.assignedReviewerUserId, createdAt: connectionReviews.createdAt }).from(connectionReviews).where(inArray(connectionReviews.status, ["pending", "escalated"])).orderBy(desc(connectionReviews.createdAt)).limit(100);
}

export async function getConnectionReviewCase(reviewId: number) {
	  const db = await getDb();
	  if (!db) throw new Error("Database unavailable");
	  const review = await db.select().from(connectionReviews).where(eq(connectionReviews.id, reviewId)).limit(1);
	  if (!review[0]) throw new Error("Connection review was not found");
	  const state = await db.select({ id: connectionStates.id, stage: connectionStates.stage, status: connectionStates.status, readinessSummary: connectionStates.readinessSummary, reviewRequired: connectionStates.reviewRequired, voiceEligible: connectionStates.voiceEligible, videoEligible: connectionStates.videoEligible }).from(connectionStates).where(eq(connectionStates.id, review[0].connectionStateId)).limit(1);
	  return { ...review[0], state: state[0] ?? null, notes: await getCaseNotes("connection_review", reviewId) };
}

export async function claimConnectionReviewCase(actorUserId: number, reviewId: number) {
	  const db = await getDb();
	  if (!db) throw new Error("Database unavailable");
	  const review = await db.select({ status: connectionReviews.status }).from(connectionReviews).where(eq(connectionReviews.id, reviewId)).limit(1);
	  if (!review[0] || !["pending", "escalated"].includes(review[0].status)) throw new Error("This connection review is not awaiting action");
	  await db.update(connectionReviews).set({ assignedReviewerUserId: actorUserId }).where(eq(connectionReviews.id, reviewId));
	  await createAuditLog(actorUserId, "connection_review.claimed", "connection_review", String(reviewId), { previousStatus: review[0].status });
}

export async function addConnectionReviewNote(actorUserId: number, reviewId: number, body: string) {
	  if (!body.trim()) throw new Error("An internal note is required");
	  await getConnectionReviewCase(reviewId);
	  await addCaseNote(actorUserId, "connection_review", reviewId, body);
}

export async function escalateConnectionReviewCase(actorUserId: number, reviewId: number, internalNote?: string) {
	  const db = await getDb();
	  if (!db) throw new Error("Database unavailable");
	  const review = await db.select({ connectionStateId: connectionReviews.connectionStateId, status: connectionReviews.status }).from(connectionReviews).where(eq(connectionReviews.id, reviewId)).limit(1);
	  if (!review[0] || !["pending", "escalated"].includes(review[0].status)) throw new Error("This connection review is not awaiting escalation");
	  await db.update(connectionReviews).set({ status: "escalated", assignedReviewerUserId: actorUserId }).where(eq(connectionReviews.id, reviewId));
	  if (internalNote?.trim()) await addCaseNote(actorUserId, "connection_review", reviewId, internalNote);
	  await db.insert(connectionEvents).values({ connectionStateId: review[0].connectionStateId, actorProfileId: null, actorUserId, eventType: "review_escalated" });
	  await createAuditLog(actorUserId, "connection_review.escalated", "connection_review", String(reviewId), { previousStatus: review[0].status });
}

export async function decideConnectionReview(actorUserId: number, reviewId: number, decision: "approved_voice" | "approved_video" | "declined" | "restricted" | "revoked", memberMessage?: string, internalNote?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const review = await db.select().from(connectionReviews).where(eq(connectionReviews.id, reviewId)).limit(1);
	  if (!review[0] || !["pending", "escalated"].includes(review[0].status)) throw new Error("This connection review is not awaiting a decision");
  const state = await db.select().from(connectionStates).where(eq(connectionStates.id, review[0].connectionStateId)).limit(1);
  if (!state[0]) throw new Error("Connection state was not found");
  const capability = decision === "approved_video" ? "video" : "voice";
  if (decision === "restricted" || decision === "revoked") await revokeConnectionState(state[0].id, "all", decision === "restricted" ? "safety_restriction" : "manual_review", { actorUserId });
  else {
    await db.update(connectionStates).set({ status: decision, stage: decision === "approved_video" ? "video_call_eligible" : "voice_call_eligible", voiceEligible: decision === "approved_voice" || decision === "approved_video", videoEligible: decision === "approved_video", approvedAt: new Date() }).where(eq(connectionStates.id, state[0].id));
    await upsertPermission(state[0].id, capability, "available");
  }
	  await db.update(connectionReviews).set({ status: decision, assignedReviewerUserId: actorUserId, reviewedByUserId: actorUserId, memberMessage: memberMessage?.trim() || null, internalNote: internalNote?.trim() || null, reviewedAt: new Date() }).where(eq(connectionReviews.id, reviewId));
	  if (internalNote?.trim()) await addCaseNote(actorUserId, "connection_review", reviewId, internalNote);
  await createAuditLog(actorUserId, `connection_review.${decision}`, "connection_review", String(reviewId), { connectionStateId: state[0].id });
}

async function requireReadinessAccess(profileId: number, conversationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const conversation = await db.select().from(conversations).where(and(eq(conversations.id, conversationId), inArray(conversations.status, ["mutual_interest", "active", "paused", "reported", "restricted"]))).limit(1);
  if (!conversation[0]) throw new Error("Connection readiness is unavailable");
  const match = await db.select().from(matches).where(and(eq(matches.id, conversation[0].matchId), eq(matches.status, "active"))).limit(1);
  if (!match[0] || (match[0].memberOneProfileId !== profileId && match[0].memberTwoProfileId !== profileId)) throw new Error("Connection readiness is unavailable");
  const otherProfileId = match[0].memberOneProfileId === profileId ? match[0].memberTwoProfileId : match[0].memberOneProfileId;
  return { conversation: conversation[0], match: match[0], profileId, otherProfileId };
}

async function getActiveReadinessPolicy() {
  const db = await getDb();
  if (!db) return { id: null as number | null, thresholds: DEFAULT_READINESS_POLICY, stageConfig: STAGE_CONFIG };
  const record = await db.select().from(connectionReadinessPolicies).where(eq(connectionReadinessPolicies.isActive, true)).orderBy(desc(connectionReadinessPolicies.updatedAt)).limit(1);
  if (!record[0]) return { id: null as number | null, thresholds: DEFAULT_READINESS_POLICY, stageConfig: STAGE_CONFIG };
  const configured = typeof record[0].thresholdConfig === "object" && record[0].thresholdConfig ? record[0].thresholdConfig as Partial<ReadinessPolicy> : {};
  return { id: record[0].id, thresholds: { ...DEFAULT_READINESS_POLICY, ...configured, requireIdentityVerification: record[0].requireIdentityVerification, requireVoiceNotesForReview: record[0].requireVoiceNotesForReview, requireHumanReviewForVoice: record[0].requireHumanReviewForVoice, requireHumanReviewForVideo: record[0].requireHumanReviewForVideo }, stageConfig: Array.isArray(record[0].stageConfig) ? record[0].stageConfig : STAGE_CONFIG };
}

async function ensureConnectionState(conversationId: number, policy: Awaited<ReturnType<typeof getActiveReadinessPolicy>>) {
  const existing = await findConnectionState(conversationId);
  if (existing) return existing;
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(connectionStates).values({ conversationId, policyId: policy.id, policySnapshot: { stageConfig: policy.stageConfig, thresholds: policy.thresholds }, readinessSummary: { message: "Connection readiness has not yet been evaluated." } });
  const id = Number(result[0].insertId);
  const created = await findConnectionState(conversationId);
  if (!created && !id) throw new Error("Unable to initialize connection readiness");
  return created ?? { id, conversationId } as typeof connectionStates.$inferSelect;
}

async function findConnectionState(conversationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const records = await db.select().from(connectionStates).where(eq(connectionStates.conversationId, conversationId)).limit(1);
  return records[0];
}

async function upsertPermission(connectionStateId: number, capability: Capability, status: "unavailable" | "available" | "paused" | "revoked") {
  const db = await getDb();
  if (!db) return;
  await db.insert(communicationPermissions).values({ connectionStateId, capability, status, availableAt: status === "available" ? new Date() : null, revokedAt: status === "revoked" ? new Date() : null }).onDuplicateKeyUpdate({ set: { status, availableAt: status === "available" ? new Date() : null, revokedAt: status === "revoked" ? new Date() : null } });
}

async function revokeConnectionState(connectionStateId: number, capability: Capability | "all", reason: RevocationReason, actor: { actorProfileId?: number; actorUserId?: number }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(communicationRevocations).values({ connectionStateId, capability, reason, actorProfileId: actor.actorProfileId ?? null, actorUserId: actor.actorUserId ?? null });
  await db.update(connectionStates).set({ status: reason === "safety_restriction" ? "restricted" : "revoked", voiceEligible: false, videoEligible: false, revokedAt: new Date(), restrictedAt: reason === "safety_restriction" ? new Date() : null }).where(eq(connectionStates.id, connectionStateId));
  if (capability === "all") { await upsertPermission(connectionStateId, "voice", "revoked"); await upsertPermission(connectionStateId, "video", "revoked"); } else await upsertPermission(connectionStateId, capability, "revoked");
  await db.insert(connectionEvents).values({ connectionStateId, actorProfileId: actor.actorProfileId ?? null, actorUserId: actor.actorUserId ?? null, eventType: reason === "safety_restriction" ? "restricted" : "revoked", metadata: { capability, reason } });
  await createAuditLog(actor.actorUserId ?? null, "connection.revoked", "connection_state", String(connectionStateId), { capability, reason, actorProfileId: actor.actorProfileId ?? null });
}

function signalByProfile(rows: Array<{ profileId: number; messagesSent: number; voiceNotesSent: number; firstParticipatedAt: Date | null; lastParticipatedAt: Date | null }>, events: Array<{ actorProfileId: number | null; eventType: string; createdAt: Date }>, firstId: number, secondId: number) {
  const build = (profileId: number): ParticipantSignals => { const row = rows.find(signal => signal.profileId === profileId); const dates = events.filter(event => event.actorProfileId === profileId && ["message_sent", "voice_note_sent"].includes(event.eventType)).map(event => event.createdAt.toISOString().slice(0, 10)); return { messagesSent: row?.messagesSent ?? 0, voiceNotesSent: row?.voiceNotesSent ?? 0, activeDays: new Set(dates).size, firstActivityAt: row?.firstParticipatedAt, lastActivityAt: row?.lastParticipatedAt }; };
  return new Map([[firstId, build(firstId)], [secondId, build(secondId)]]);
}

function hasMutualConsent(rows: Array<{ profileId: number; capability: "voice" | "video"; status: "pending" | "granted" | "withdrawn" | "declined" }>, one: number, two: number, capability: Capability) {
  return [one, two].every(profileId => rows.some(row => row.profileId === profileId && row.capability === capability && row.status === "granted"));
}

async function presentReadiness(evaluated: Awaited<ReturnType<typeof evaluateConversationReadiness>>, viewerProfileId: number, otherProfileId: number) {
  const db = await getDb();
  const permissions = db ? await db.select().from(communicationPermissions).where(eq(communicationPermissions.connectionStateId, evaluated.stateId)) : [];
  const viewerConsents = evaluated.consents.filter(consent => consent.profileId === viewerProfileId).map(consent => ({ capability: consent.capability, status: consent.status }));
  const otherConsents = evaluated.consents.filter(consent => consent.profileId === otherProfileId).map(consent => ({ capability: consent.capability, granted: consent.status === "granted" }));
  return { stateId: evaluated.stateId, stage: evaluated.stage, status: evaluated.status, readyForReview: evaluated.readyForReview, reviewRequired: evaluated.reviewRequired, explanation: evaluated.memberExplanation, criteria: evaluated.criteria.map(item => ({ label: item.label, met: item.met })), yourConsents: viewerConsents, partnerConsentReceived: otherConsents, permissions: permissions.map(permission => ({ capability: permission.capability, status: permission.status, providerConfigured: false })), safetyGuidance: ["Never send money or financial information.", "Protect your personal information.", "End any communication if you feel uncomfortable.", "Report suspicious behavior promptly."], futureProvider: { configured: false, message: "Voice and video calling technology is not connected yet. No call is started or simulated here." } };
}
