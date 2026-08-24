import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { deriveMemberEligibility } from "./domain/memberEligibilityPolicy";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const base = {
  profileStatus: "active" as const,
  searchVisible: true,
  deletedAt: null,
  coreProfileComplete: true,
  approvedPhotoCount: 5,
  verificationStatus: "not_started" as const,
};

describe("Sprint 40 — discovery quality, search & member preferences", () => {
  it("keeps discovery available only for the authoritative discovery-ready state", () => {
    expect(deriveMemberEligibility(base).discoveryEligible).toBe(true);
    expect(deriveMemberEligibility({ ...base, searchVisible: false }).discoveryEligible).toBe(false);
    expect(deriveMemberEligibility({ ...base, profileStatus: "paused" }).journeyState).toBe("PAUSED");
    expect(deriveMemberEligibility({ ...base, profileStatus: "suspended" }).journeyState).toBe("SUSPENDED");
    const discovery = read("client/src/pages/CuratedDiscoveryPage.tsx");
    expect(discovery).toContain("profile.data?.eligibility?.discoveryEligible === true");
    expect(discovery).toContain("ActivationRecoveryLink");
  });

  it("preserves independently eligible, reciprocal, block-safe, privacy-safe discovery and approved display-name search", () => {
    const service = read("server/compatibilityService.ts");
    expect(service).toContain("getMemberEligibility(viewerProfileId)");
    expect(service).toContain("eligibleCandidateIds.has(candidate.id)");
    expect(service).toContain("isEligibleForDiscovery");
    expect(service).toContain("permitsInternationalDiscovery(viewerInternationalState, internationalState(candidate))");
    expect(service).toContain("like(memberProfiles.displayName");
    expect(service).toContain("ne(memberProfiles.profileVisibility, \"hidden\")");
    expect(service).toContain("safeLocationDisplay");
    expect(service).not.toMatch(/latitude|longitude|coordinate|address|phone|email|documentStorageKey/i);
  });

  it("bounds age filtering to existing adult eligibility, calculates calendar age, and keeps server-confirmed filter concurrency intact", () => {
    const service = read("server/compatibilityService.ts");
    const router = read("server/routers.ts");
    const page = read("client/src/pages/CuratedDiscoveryPage.tsx");
    expect(service).toContain("const MIN_DISCOVERY_AGE = 18");
    expect(service).toContain("const MAX_DISCOVERY_AGE = 60");
    expect(service).toContain("validateDiscoveryAgeFilters");
    expect(service).toContain("today.getUTCMonth() < date.getUTCMonth()");
    expect(router).toContain("minAge: z.number().int().min(18).max(60)");
    expect(router).toContain("maxAge: z.number().int().min(18).max(60)");
    expect(service).toContain("Your saved discovery controls changed before this update");
    expect(page).toContain("expectedUpdatedAt: filters.data?.updatedAt");
    expect(page).toContain("Results use your last server-confirmed controls");
    expect(page).toContain("You appear offline. Discovery controls are unchanged");
  });

  it("applies the same current authorization to direct compatibility explanations rather than exposing hidden fields through a detail route", () => {
    const service = read("server/compatibilityService.ts");
    expect(service).toContain("candidateEligibility.discoveryEligible");
    expect(service).toContain("!candidate.searchVisible || candidate.profileVisibility === \"hidden\"");
    expect(service).toContain("permitsInternationalDiscovery(internationalState(viewer), internationalState(candidate))");
    expect(service).toContain("compatibilityDimensionIsVisible");
    expect(service).toContain("canViewerSeeProfileField(visibility.get(field)");
  });

  it("keeps recommendations current, policy-versioned, reciprocal, and free of raw location projection", () => {
    const service = read("server/recommendationService.ts");
    const page = read("client/src/pages/RecommendationsPage.tsx");
    expect(service).toContain("getMemberEligibility(profileId)");
    expect(service).toContain("permitsInternationalDiscovery(viewerInternationalState, internationalState(candidate))");
    expect(service).toContain("safeLocationDisplay");
    expect(service).toContain("locationDisplay");
    expect(service).not.toContain("city: candidate.city, country: candidate.country");
    expect(page).toContain("Policy version:");
    expect(page).toContain("item.locationDisplay");
    expect(page).toContain("ActivationRecoveryLink");
  });

  it("preserves recommendation withdrawal, mutual-interest-only connections, private notifications, Family Circle isolation, safety propagation, and Premium-neutral boundaries", () => {
    const recommendations = read("server/recommendationService.ts");
    const db = read("server/db.ts");
    const family = read("server/familyService.ts");
    const billing = read("server/billingService.ts");
    expect(recommendations).toContain("withdrawRecommendationsForProfilePair");
    expect(recommendations).toContain("withdrawRecommendationsForProfile");
    expect(db).toContain("existing?.status === \"pending\"");
    expect(db).toContain("mutual_interest");
    expect(db).toContain("createNotification");
    expect(family).toContain("locationDisplay");
    expect(billing).toContain("Premium");
  });
});
