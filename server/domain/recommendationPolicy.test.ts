import { describe, expect, it } from "vitest";
import { evaluateCompatibility, type CompatibilityResult } from "./compatibility";
import { buildRecommendationDecision, DEFAULT_RECOMMENDATION_POLICY, FAIRNESS_EXCLUSIONS, isEligibleForRecommendation, memberSafeExplanation, rankRecommendationCandidates, type RecommendationCandidate } from "./recommendationPolicy";

const now = new Date("2026-08-14T12:00:00Z");
const compatible: CompatibilityResult = { eligible: true, compatibleCount: 4, considerationCount: 0, dimensions: [{ dimension: "marriage_intent", result: "compatible", explanation: "Both members have shared a marriage intention.", required: false }, { dimension: "relocation", result: "compatible", explanation: "Relocation preference appears aligned.", required: false }] };

function candidate(id: number, overrides: Partial<RecommendationCandidate> = {}): RecommendationCandidate {
  return { id, profileStatus: "active", searchVisible: true, deletedAt: null, profileVisibility: "members_only", blocked: false, compatibility: compatible, identityVerified: false, completenessSignals: 3, updatedAt: new Date("2026-08-10T12:00:00Z"), createdAt: new Date("2026-08-05T12:00:00Z"), locationGroup: "The Gambia", recommendationEnabled: true, ...overrides };
}

describe("Phase 7 deterministic recommendation policy", () => {
  it("keeps an explicit hard incompatibility out of recommendations even when verification and completeness are high", () => {
    const hardBlocked = candidate(1, { identityVerified: true, completenessSignals: 6, compatibility: { ...compatible, eligible: false, dimensions: [{ dimension: "relocation", result: "not_compatible", explanation: "Relocation preference does not meet a stated requirement.", required: true }] } });
    expect(isEligibleForRecommendation(hardBlocked)).toBe(false);
    expect(rankRecommendationCandidates([hardBlocked], DEFAULT_RECOMMENDATION_POLICY, now)).toEqual([]);
  });

  it("keeps soft considerations discoverable rather than treating them as rejection criteria", () => {
    const softDifference = candidate(2, { compatibility: { ...compatible, considerationCount: 1, dimensions: [{ dimension: "location", result: "consideration", explanation: "Location preference may be worth discussing.", required: false }] } });
    expect(isEligibleForRecommendation(softDifference)).toBe(true);
    expect(rankRecommendationCandidates([softDifference], DEFAULT_RECOMMENDATION_POLICY, now)).toHaveLength(1);
  });

  it("excludes blocked, hidden, suspended, paused, deleted, opted-out, and integrity-held profiles before ordering", () => {
    const base = candidate(3);
    expect([candidate(4, { blocked: true }), candidate(5, { profileVisibility: "hidden" }), candidate(6, { profileStatus: "suspended" }), candidate(7, { profileStatus: "paused" }), candidate(8, { deletedAt: now }), candidate(9, { recommendationEnabled: false }), candidate(10, { integrityHeld: true })].every(item => !isEligibleForRecommendation(item))).toBe(true);
    expect(isEligibleForRecommendation(base)).toBe(true);
  });

  it("supports married members, polygyny, children, relocation, location, family involvement, and timelines through explicit compatibility preferences", () => {
    const viewer = { id: 1, marriageIntent: "marriage", maritalStatus: "married" as const, relocationWillingness: "open" as const, desireChildren: "yes" as const, familyInvolvementPreference: "active" as const, marriageTimeline: "within a year", polygynyOpenness: "open" as const };
    const other = { id: 2, marriageIntent: "marriage", maritalStatus: "married" as const, relocationWillingness: "open" as const, hasChildren: true, desireChildren: "yes" as const, familyInvolvementPreference: "active" as const, marriageTimeline: "within a year", polygynyOpenness: "open" as const, country: "The Gambia" };
    const result = evaluateCompatibility(viewer, other, { preferredMaritalStatuses: ["married"], preferredPolygynyOpenness: ["open"], childrenPreference: "open_to_children", desiredChildrenPreference: "yes", preferredRelocation: ["open"], preferredLocations: ["The Gambia"], preferredMarriageTimelines: ["within a year"], preferredFamilyInvolvement: ["active"], preferenceImportance: { marital_status: "required", polygyny: "required", children: "preferred", desired_children: "preferred", relocation: "preferred", location: "preferred", marriage_timeline: "preferred", family_involvement: "preferred" } });
    expect(result.eligible).toBe(true);
    expect(result.dimensions.filter(item => item.result === "compatible").map(item => item.dimension)).toEqual(expect.arrayContaining(["marital_status", "polygyny", "children", "desired_children", "relocation", "location", "marriage_timeline", "family_involvement"]));
  });

  it("does not use protected characteristics, wealth, popularity, profile views, or subscription status as recommendation inputs", () => {
    expect(FAIRNESS_EXCLUSIONS).toEqual(expect.arrayContaining(["ethnicity", "tribe", "wealth", "income", "physical_attractiveness", "popularity", "profile_views", "paid_subscription"]));
    expect(Object.keys(DEFAULT_RECOMMENDATION_POLICY.weights)).toEqual(["compatibility", "verification", "completeness", "recency"]);
  });

  it("makes verification and completeness secondary signals that cannot bypass eligibility", () => {
    const eligible = candidate(11, { identityVerified: true, completenessSignals: 6 });
    const blocked = candidate(12, { identityVerified: true, completenessSignals: 6, compatibility: { ...compatible, eligible: false } });
    expect(rankRecommendationCandidates([blocked, eligible], DEFAULT_RECOMMENDATION_POLICY, now).map(item => item.id)).toEqual([11]);
  });

  it("uses recency only as a secondary tie-break signal after compatible stated preferences", () => {
    const strongerOlder = candidate(13, { compatibility: { ...compatible, compatibleCount: 5 }, updatedAt: new Date("2026-07-01T12:00:00Z") });
    const weakerRecent = candidate(14, { compatibility: { ...compatible, compatibleCount: 1 }, updatedAt: new Date("2026-08-14T10:00:00Z") });
    expect(rankRecommendationCandidates([weakerRecent, strongerOlder], DEFAULT_RECOMMENDATION_POLICY, now).map(item => item.id)).toEqual([13, 14]);
  });

  it("keeps ordering deterministic and introduces bounded location diversity only after eligibility", () => {
    const candidates = [candidate(20, { locationGroup: "The Gambia" }), candidate(21, { locationGroup: "The Gambia" }), candidate(22, { locationGroup: "The Gambia" }), candidate(23, { locationGroup: "Senegal" }), candidate(24, { profileStatus: "suspended", locationGroup: "Senegal" })];
    const ordered = rankRecommendationCandidates(candidates, { ...DEFAULT_RECOMMENDATION_POLICY, maxPerLocationGroup: 2 }, now);
    expect(ordered.map(item => item.id)).toEqual(expect.arrayContaining([20, 21, 22, 23]));
    expect(ordered.some(item => item.id === 24)).toBe(false);
    expect(ordered.slice(0, 3).filter(item => item.locationGroup === "The Gambia")).toHaveLength(2);
  });

  it("creates member-safe explanation keys only from visibility-approved dimensions and never produces a percentage", () => {
    const decision = buildRecommendationDecision(candidate(30), [{ dimension: "marriage_intent", result: "compatible", explanation: "private implementation detail", required: false }, { dimension: "location", result: "consideration", explanation: "private implementation detail", required: false }], DEFAULT_RECOMMENDATION_POLICY, now);
    const rendered = decision.explanationKeys.map(memberSafeExplanation).join(" ");
    expect(decision.explanationKeys).toEqual(["marriage_intent"]);
    expect(rendered).toContain("marriage intention");
    expect(rendered).not.toMatch(/%|score|soulmate|private implementation detail/i);
  });

  it("does not let a premium-like field alter recommendation ordering because no such field is accepted by the policy contract", () => {
    const standard = candidate(40);
    const premiumLike = { ...candidate(41), premium: true } as RecommendationCandidate & { premium: boolean };
    expect(rankRecommendationCandidates([standard, premiumLike], DEFAULT_RECOMMENDATION_POLICY, now).map(item => item.id)).toEqual([41, 40]);
  });
});
