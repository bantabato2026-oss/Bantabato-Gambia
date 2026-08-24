import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Sprint 35 — Trust, Safety & member protection", () => {
  it("keeps member block history minimum-necessary and rejects stale block removal", () => {
    const db = read("server/db.ts");
    const blockSlice = db.slice(db.indexOf("export async function listBlockedProfiles"), db.indexOf("export async function createAuditLog"));
    expect(blockSlice).toContain("displayName: memberProfiles.displayName, createdAt: blocks.createdAt");
    expect(blockSlice).not.toContain("country: memberProfiles.country");
    expect(blockSlice).toContain("expectedCreatedAt?: Date");
    expect(blockSlice).toContain("This block changed in another session. Refresh your safety history before trying again.");
    expect(blockSlice).toContain("eq(blocks.createdAt, active.createdAt)");
  });

  it("uses observed versions and conditional writes for member report edits, withdrawals, and appeal withdrawals", () => {
    const integrity = read("server/integrityService.ts");
    expect(integrity).toContain("expectedUpdatedAt?: Date");
    expect(integrity).toContain("eq(reports.updatedAt, record.updatedAt)");
    expect(integrity).toContain("eq(safetyAppeals.updatedAt, appeal.updatedAt)");
    expect(integrity).toContain("requireMutationApplied");
    expect(integrity).toContain("This report changed in another session. Refresh your report history before trying again.");
    expect(integrity).toContain("This appeal changed in another session. Refresh your Safety Center before trying again.");
  });

  it("recovers duplicate appeal submissions safely and retains reporter-scoped report retry protection", () => {
    const integrity = read("server/integrityService.ts");
    const db = read("server/db.ts");
    const schema = read("drizzle/schema.ts");
    expect(integrity).toContain("if (existing) return { appealId: existing.id, duplicate: true }");
    expect(integrity).toContain("if (recovered) return { appealId: recovered.id, duplicate: true }");
    expect(schema).toContain('uniqueIndex("reports_reporter_request_unique")');
    expect(db).toContain("This report retry key is already linked to a different concern.");
    expect(db).toContain("return { reportId: recovered.id, duplicate: true }");
  });

  it("keeps client safety actions offline-safe, version-aware, accessible, factual, and non-optimistic", () => {
    const page = read("client/src/pages/SafetyCenterPage.tsx");
    expect(page).toContain("const offline = network === \"offline\"");
    expect(page).toContain("Nothing is submitted, withdrawn, updated, or unblocked until the server confirms it.");
    expect(page).toContain("aria-live=\"polite\"");
    expect(page).toContain("expectedUpdatedAt: appeal.updatedAt");
    expect(page).toContain("expectedUpdatedAt: report.updatedAt");
    expect(page).toContain("expectedCreatedAt: block.createdAt");
    expect(page).toContain("disabled={offline ||");
    expect(page).toContain("reporter identities, staff names, and investigation methods stay private");
    expect(page).toContain("Family Circle participants cannot see reports, safety cases, enforcement decisions");
  });

  it("preserves server-authoritative cross-module protection, private notifications, staff separation, integrity-hold boundaries, and Premium neutrality", () => {
    const router = read("server/routers.ts");
    const messaging = read("server/messagingService.ts");
    const readiness = read("server/readinessService.ts");
    const family = read("server/familyService.ts");
    const policy = read("server/domain/integrityPolicy.ts");
    const admin = read("client/src/pages/AdminSafetyOperations.tsx");
    expect(router).toContain("await revokeConnectionForProfilePair(profile.id, input.blockedProfileId, \"block\"");
    expect(router).toContain("await withdrawRecommendationsForProfilePair(profile.id, input.blockedProfileId, \"block\"");
    expect(router).toContain("await revokeConnectionForProfilePair(profile.id, input.reportedProfileId, \"open_report\"");
    expect(messaging).toContain("await revokeConnectionForConversation(conversationId, \"block\"");
    expect(readiness).toContain("withdrawFamilySharesForProfilePair");
    expect(family).toContain("revokeLinkAccess");
    expect(policy).toContain("Premium status, engagement value, or opaque scoring");
    expect(admin).toContain("Second approval");
  });
});
