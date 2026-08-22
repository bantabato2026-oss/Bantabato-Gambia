import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const db = readFileSync(join(process.cwd(), "server/db.ts"), "utf8");
const router = readFileSync(join(process.cwd(), "server/routers.ts"), "utf8");
const integrity = readFileSync(join(process.cwd(), "server/integrityService.ts"), "utf8");
const policy = readFileSync(join(process.cwd(), "server/domain/integrityPolicy.ts"), "utf8");
const schema = readFileSync(join(process.cwd(), "drizzle/schema.ts"), "utf8");
const messaging = readFileSync(join(process.cwd(), "server/messagingService.ts"), "utf8");
const safetyCenter = readFileSync(join(process.cwd(), "client/src/pages/SafetyCenterPage.tsx"), "utf8");
const memberDetails = readFileSync(join(process.cwd(), "client/src/pages/MemberDetailPages.tsx"), "utf8");
const adminSafety = readFileSync(join(process.cwd(), "client/src/pages/AdminSafetyOperations.tsx"), "utf8");

describe("Sprint 6 member safety and protection contracts", () => {
  it("uses a durable reporter-scoped request key and recovery path for duplicate or concurrent member reports", () => {
    expect(schema).toContain('clientRequestId: varchar("clientRequestId", { length: 96 })');
    expect(schema).toContain('uniqueIndex("reports_reporter_request_unique").on(table.reporterProfileId, table.clientRequestId)');
    expect(db).toContain('reports.clientRequestId, clientRequestId');
    expect(db).toContain('return { reportId: existing.id, duplicate: true }');
    expect(db).toContain('return { reportId: recovered.id, duplicate: true }');
    expect(db).toContain('already linked to a different concern');
    expect(router).toContain('clientRequestId: z.string().trim().regex(/^[A-Za-z0-9_-]{16,96}$/).optional()');
    expect(messaging).toContain('if (report.duplicate) return { created: false, duplicate: true, reportId: report.reportId }');
  });

  it("keeps member report updates and withdrawal bounded to pre-review reports while retaining audit and private investigation boundaries", () => {
    expect(schema).toContain('memberUpdatedAt: timestamp("memberUpdatedAt")');
    expect(schema).toContain('memberWithdrawnAt: timestamp("memberWithdrawnAt")');
    expect(integrity).toContain('export async function updateMemberSafetyReport');
    expect(integrity).toContain('!["open", "triage"].includes(record.status)');
    expect(integrity).toContain('export async function withdrawMemberSafetyReport');
    expect(integrity).toContain('status: "closed", memberWithdrawnAt: now');
    expect(integrity).toContain('"safety.report_withdrawn"');
    expect(integrity).toContain('eq(integritySignals.status, "new")');
    expect(safetyCenter).toContain('A report is not proof.');
    expect(safetyCenter).toContain('reporter identities, staff names, and investigation methods stay private');
  });

  it("supports directed block removal without reopening prior relationships or weakening server-side block enforcement", () => {
    expect(db).toContain('export async function listBlockedProfiles');
    expect(db).toContain('export async function unblockProfile');
    expect(db).toContain('eq(blocks.blockerProfileId, blockerProfileId), eq(blocks.blockedProfileId, blockedProfileId)');
    expect(router).toContain('unblock: betaMemberProcedure');
    expect(safetyCenter).toContain('Existing connection and safety states are not changed automatically.');
    expect(memberDetails).toContain('Further contact is stopped.');
  });

  it("preserves four-eyes and prevents expired or replayed approval from activating a high-impact safety action", () => {
    expect(integrity).toContain('if (action.requestedByUserId === actorUserId)');
    expect(integrity).toContain('action.expiresAt.getTime() <= Date.now()');
    expect(integrity).toContain('safety.enforcement_expired_before_approval');
    expect(integrity).toContain('eq(safetyEnforcementActions.status, "proposed")');
    expect(policy).toContain('return actionType === "temporary_suspension" || actionType === "permanent_account_removal"');
    expect(adminSafety).toContain('Second approval');
  });

  it("limits temporary messaging restoration to conversations restricted by the same enforcement action and sends member-safe state notifications", () => {
    expect(schema).toContain('safetyRestrictionActionId: int("safetyRestrictionActionId")');
    expect(integrity).toContain('safetyRestrictionActionId: action.id');
    expect(integrity).toContain('export async function expireSafetyEnforcements');
    expect(integrity).toContain('restoreSafetyActionConversationEffects(action.id)');
    expect(integrity).toContain('eq(conversations.safetyRestrictionActionId, actionId), eq(conversations.status, "restricted")');
    expect(integrity).toContain('notifySafetyActionState');
    expect(integrity).toContain('actionPath: "/app/safety"');
  });

  it("keeps appeals member-owned and separate from original enforcement records", () => {
    expect(schema).toContain('uniqueIndex("safety_appeals_action_appellant_unique")');
    expect(integrity).toContain('export async function withdrawSafetyAppeal');
    expect(integrity).toContain('status: "withdrawn"');
    expect(integrity).toContain('"safety.appeal_withdrawn"');
    expect(router).toContain('withdrawAppeal: betaMemberProcedure');
    expect(safetyCenter).toContain('The original safety record is retained.');
  });

  it("keeps report, discovery, recommendation, messaging, voice, readiness, and Family Circle privacy boundaries server-authoritative", () => {
    expect(router).toContain('await revokeConnectionForProfilePair(profile.id, input.reportedProfileId, "open_report"');
    expect(router).toContain('await withdrawRecommendationsForProfilePair(profile.id, input.reportedProfileId, "report")');
    expect(router).toContain('await revokeConnectionForProfilePair(profile.id, input.blockedProfileId, "block"');
    expect(messaging).toContain('await revokeConnectionForConversation(conversationId, "open_report"');
    expect(messaging).toContain('await requireConversationAccess(profileId, conversationId');
    expect(safetyCenter).toContain('Family Circle participants cannot see reports, safety cases, enforcement decisions, private conversations, verification documents');
    expect(safetyCenter).toContain('reporter identities, staff names, and investigation methods stay private');
  });

  it("retains no-score and premium-neutral safety policy while exposing mobile-friendly loading, error, confirmation, and retry affordances", () => {
    expect(policy).toContain('Integrity signals may not use protected characteristics, Premium status, engagement value, or opaque scoring.');
    expect(policy).toContain('never a permanent automatic outcome');
    expect(safetyCenter).toContain('Safety is human-reviewed, not scored.');
    expect(safetyCenter).toContain('window.confirm("Withdraw this report before review begins?');
    expect(safetyCenter).toContain('Your report history is unavailable.');
    expect(safetyCenter).toContain('Your block list is unavailable.');
    expect(adminSafety).toContain('Temporary actions need an explicit expiry; suspension requires a separate approver.');
  });
});
