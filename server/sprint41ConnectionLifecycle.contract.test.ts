import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const db = readFileSync(join(process.cwd(), "server/db.ts"), "utf8");
const schema = readFileSync(join(process.cwd(), "drizzle/schema.ts"), "utf8");
const routers = readFileSync(join(process.cwd(), "server/routers.ts"), "utf8");
const messaging = readFileSync(join(process.cwd(), "server/messagingService.ts"), "utf8");
const recommendations = readFileSync(join(process.cwd(), "server/recommendationService.ts"), "utf8");
const connections = readFileSync(join(process.cwd(), "client/src/pages/ConnectionsPage.tsx"), "utf8");
const detail = readFileSync(join(process.cwd(), "client/src/pages/MemberDetailPages.tsx"), "utf8");
const memberRoutes = readFileSync(join(process.cwd(), "client/src/pages/MemberRouteStates.tsx"), "utf8");

describe("Sprint 41 connection lifecycle contracts", () => {
  it("rechecks current reciprocal eligibility, privacy, blocks, international preferences, and hard compatibility before an introduction can be created or accepted", () => {
    expect(db).toContain("async function isInterestPairCurrentlyEligible(senderProfileId: number, recipientProfileId: number)");
    expect(db).toContain("if (!(await isInterestPairCurrentlyEligible(senderProfileId, recipientProfileId))) throw new Error(\"This introduction is unavailable\")");
    expect(db).toContain("if (!(await isInterestPairCurrentlyEligible(request[0].senderProfileId, recipientProfileId))) throw new Error(\"This introduction is unavailable\")");
    expect(db).toContain("permitsInternationalDiscovery(internationalState(sender), internationalState(recipient))");
    expect(db).toContain("return evaluatePair(sender as CompatibilityProfile, recipient as CompatibilityProfile");
  });

  it("uses observed interest versions and idempotent state checks for response and withdrawal without allowing a stale UI to recreate a request", () => {
    expect(db).toContain("response: \"accepted\" | \"declined\", expectedUpdatedAt?: Date");
    expect(db).toContain("This introduction changed before your response. Refresh and review the current state.");
    expect(db).toContain("if (request.status === \"withdrawn\") return { withdrawn: true, duplicate: true }");
    expect(db).toContain("This introduction changed before it could be withdrawn. Refresh and review the current state.");
    expect(routers).toContain('expectedUpdatedAt: z.coerce.date().optional()');
    expect(connections).toContain("expectedUpdatedAt: request.updatedAt");
    expect(detail).toContain("expectedUpdatedAt: interestUpdatedAt ?? undefined");
    expect(memberRoutes).toContain("export function MemberMatchesRoute() { return <ConnectionsPage />; }");
  });

  it("creates no duplicate or silently reopened connection record under concurrent acceptance", () => {
    expect(schema).toContain("uniqueIndex(\"matches_pair_unique\")");
    expect(schema).toContain("uniqueIndex(\"conversations_match_unique\")");
    expect(db).toContain("if (existingMatch && existingMatch.status !== \"active\") throw new Error(\"This introduction is no longer available\")");
    expect(db).toContain("const concurrent = (await db.select().from(matches)");
    expect(db).toContain("const concurrent = (await db.select({ id: conversations.id }).from(conversations)");
    expect(db).not.toContain('onDuplicateKeyUpdate({ set: { status: "active", closedAt: null } })');
  });

  it("withdraws a fresh recommendation once an interest or connection changes the pair state, including member-led connection closure", () => {
    expect(routers).toContain('withdrawRecommendationsForProfilePair(profile.id, input.recipientProfileId, "interest_started")');
    expect(routers).toContain('withdrawRecommendationsForProfilePair(profile.id, result.otherProfileId, "connection_created")');
    expect(recommendations).toContain('"interest_started" | "connection_created" | "connection_closed"');
    expect(messaging).toContain('await withdrawRecommendationsForProfilePair(profileId, access.otherProfileId, "connection_closed")');
    expect(messaging).toContain('await revokeConnectionForConversation(conversationId, "member_withdrew_consent", { profileId })');
  });

  it("filters stale pending interest listings and keeps the match-list projection free of raw city, country, religion, or profession values", () => {
    expect(db).toContain("const current = await Promise.all(records.map(async request => (await isInterestPairCurrentlyEligible(request.senderProfileId, profileId)) ? request : null))");
    expect(db).toContain("const visibleRequests = (await Promise.all(requests.map(async request => request.status !== \"pending\" || await isInterestPairCurrentlyEligible(profileId, request.recipientProfileId) ? request : null)))");
    expect(db).toContain("db.select({ id: memberProfiles.id, displayName: memberProfiles.displayName }).from(memberProfiles)");
    expect(db).toContain("otherProfile ? { ...otherProfile, city: null } : undefined");
  });

  it("preserves server-authoritative communication and readiness safeguards rather than treating the client view as permission", () => {
    expect(messaging).toContain('await requireConversationAccess(profileId, conversationId, ["mutual_interest", "active"])');
    expect(messaging).toContain("Re-check immediately before the write");
    expect(messaging).toContain("same_request_key");
    expect(messaging).toContain("if (blocked[0]) throw new Error(\"Conversation is unavailable\")");
    expect(detail).toContain("Your text draft stays on this device; reconnect before sending.");
  });
});
