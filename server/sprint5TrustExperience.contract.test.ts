import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { permitsInternationalDiscovery } from "./domain/internationalDiscovery";

const compatibility = readFileSync(join(process.cwd(), "server/compatibilityService.ts"), "utf8");
const recommendations = readFileSync(join(process.cwd(), "server/recommendationService.ts"), "utf8");
const db = readFileSync(join(process.cwd(), "server/db.ts"), "utf8");
const family = readFileSync(join(process.cwd(), "server/familyService.ts"), "utf8");
const schema = readFileSync(join(process.cwd(), "drizzle/schema.ts"), "utf8");
const familyPage = readFileSync(join(process.cwd(), "client/src/pages/FamilyCirclePages.tsx"), "utf8");
const internationalPage = readFileSync(join(process.cwd(), "client/src/pages/InternationalPage.tsx"), "utf8");
const verificationPage = readFileSync(join(process.cwd(), "client/src/pages/VerificationCenter.tsx"), "utf8");

const international = (residenceCountryId: number | null, longDistancePreference: "open" | "prefer_nearby" | "no_preference", countryIds: number[] = []) => ({ residenceCountryId, longDistancePreference, preferredDiscoveryCountryIds: new Set(countryIds) });

describe("Sprint 5 country, verification, and Family Circle trust contracts", () => {
  it("uses saved countries and reciprocal long-distance choices as eligibility gates rather than a country rank or score", () => {
    expect(permitsInternationalDiscovery(international(1, "prefer_nearby"), international(1, "no_preference"))).toBe(true);
    expect(permitsInternationalDiscovery(international(1, "prefer_nearby"), international(2, "open"))).toBe(false);
    expect(permitsInternationalDiscovery(international(1, "open", [2]), international(2, "no_preference", [1]))).toBe(true);
    expect(permitsInternationalDiscovery(international(1, "open", [2]), international(3, "no_preference", [1]))).toBe(false);
    expect(permitsInternationalDiscovery(international(null, "no_preference"), international(2, "prefer_nearby", [1]))).toBe(true);
  });

  it("applies the reciprocal country eligibility gate before curated presentation and deterministic recommendation ranking", () => {
    expect(compatibility).toContain('permitsInternationalDiscovery(viewerInternationalState, internationalState(candidate))');
    expect(recommendations).toContain('permitsInternationalDiscovery(viewerInternationalState, internationalState(candidate))');
    expect(recommendations).toContain('rankRecommendationCandidates');
    expect(compatibility).not.toContain('countryScore');
  });

  it("prevents duplicate open verification submissions while retaining per-submission private storage keys and member-safe feedback", () => {
    expect(db).toContain('await tx.select({ id: memberProfiles.id }).from(memberProfiles).where(eq(memberProfiles.id, profileId)).for("update");');
    expect(db).toContain('inArray(verificationRecords.status, ["submitted", "under_review", "escalated"])');
    expect(db).toContain('identity-${randomUUID()}');
    expect(verificationPage).toContain('Your existing private document is already in review. No duplicate was created.');
    expect(verificationPage).toContain('Staff review details and internal safety information are not shown here.');
  });

  it("keeps Family Circle invitation acceptance, reissue, expiry, acknowledgements, feedback, and permissions durable and private", () => {
    expect(family).toContain('export async function reissueFamilyInvitation');
    expect(family).toContain('link.status === "invited" && link.invitationExpiresAt && link.invitationExpiresAt <= now ? "expired" : link.status');
    expect(family).toContain('eq(familyLinks.status, "invited"), eq(familyLinks.invitationCodeHash, invitationHash(code))');
    expect(family).toContain('isDuplicateKey(error)');
    expect(schema).toContain('uniqueIndex("family_acknowledgments_pending_share_unique").on(table.familyShareId, table.status)');
    expect(schema).toContain('uniqueIndex("family_feedback_share_link_unique").on(table.familyShareId, table.familyLinkId)');
    expect(family).toContain('permissions: Array.from(granted)');
  });

  it("refreshes affected member experiences after preference, verification, and Family Circle changes without exposing protected details", () => {
    expect(internationalPage).toContain('utils.discovery.curated.invalidate()');
    expect(internationalPage).toContain('utils.recommendations.list.invalidate()');
    expect(familyPage).toContain('trpc.family.resendInvitation.useMutation');
    expect(familyPage).toContain('The previous code no longer works.');
    expect(familyPage).toContain('const canRemove = !["removed", "revoked"].includes(link.status);');
    expect(familyPage).toContain('This private timeline shows only your Family Circle access and sharing changes.');
    expect(familyPage).toContain('Family Circle participant cannot sign in as you, send messages as you');
  });
});
