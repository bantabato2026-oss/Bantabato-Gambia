import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(join(process.cwd(), "drizzle/schema.ts"), "utf8");
const db = readFileSync(join(process.cwd(), "server/db.ts"), "utf8");
const routers = readFileSync(join(process.cwd(), "server/routers.ts"), "utf8");
const profileDetail = readFileSync(join(process.cwd(), "client/src/pages/MemberDetailPages.tsx"), "utf8");
const recommendations = readFileSync(join(process.cwd(), "server/recommendationService.ts"), "utf8");
const recommendationPage = readFileSync(join(process.cwd(), "client/src/pages/RecommendationsPage.tsx"), "utf8");

describe("interest and connection lifecycle contracts", () => {
  it("keeps one durable directional interest request and safely resolves duplicate sends", () => {
    expect(schema).toContain('uniqueIndex("interest_requests_direction_unique").on(table.senderProfileId, table.recipientProfileId)');
    expect(db).toContain('if (existing?.status === "pending") return { interestId: existing.id, state: "pending" as const, duplicate: true }');
    expect(db).toContain('if (concurrent?.status === "pending" || concurrent?.status === "accepted") return { interestId: concurrent.id, state: concurrent.status, duplicate: true }');
    expect(db).toContain('interest-renewed:${existing.id}');
  });

  it("allows only the sender to withdraw a pending interest and serializes a recipient response", () => {
    expect(db).toContain('export async function withdrawInterest(profileId: number, interestId: number)');
    expect(db).toContain('eq(interestRequests.senderProfileId, profileId), eq(interestRequests.status, "pending")');
    expect(db).toContain('eq(interestRequests.id, interestId), eq(interestRequests.status, "pending")');
    expect(db).toContain('Interest request is no longer available');
  });

  it("projects only privacy-gated connection states and preserves mutual messaging handoff", () => {
    expect(db).toContain('export async function getInterestConnectionState(profileId: number, targetProfileId: number)');
    for (const state of ["not_connected", "interest_sent", "interest_received", "interest_declined", "mutual_connection", "communication_available"]) expect(db).toContain(`"${state}"`);
    expect(routers).toContain('const visible = await getProfileForMember(profile.id, input.profileId); if (!visible) return { state: "unavailable" as const, interestId: null, conversationId: null }');
    expect(routers).toContain('withdraw: protectedProcedure.input(z.object({ interestId: z.number().int().positive() }))');
    expect(profileDetail).toContain('trpc.interests.connectionState.useQuery({ profileId }');
    expect(profileDetail).toContain("Introduction request sent.");
    expect(profileDetail).toContain("Your private conversation is available.");
    expect(profileDetail).toContain("This profile or interaction is not available for a new introduction right now.");
  });

  it("records recommendation interest only after a non-duplicate introduction is established", () => {
    expect(recommendations).toContain("export async function recordRecommendationInterest(profileId: number, actorUserId: number, recommendationId: number, recordEvent = true)");
    expect(routers).toContain("const recommendation = await recordRecommendationInterest(profile.id, ctx.user.id, input.recommendationId, false); const interest = await createInterest(profile.id, recommendation.candidateProfileId, input.message); if (!interest.duplicate) await recordRecommendationInterest(profile.id, ctx.user.id, input.recommendationId);");
    expect(recommendationPage).toContain("result.duplicate ? \"Your existing introduction request is still awaiting a response.\"");
  });
});
