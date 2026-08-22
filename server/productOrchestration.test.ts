import { describe, expect, it } from "vitest";
import { createControlledWorkflowFixtures } from "./controlledWorkflowFixtures";
import { roleCan } from "./domain/adminOperationsPolicy";
import { isEligibleForDiscovery } from "./domain/discoveryPolicy";
import { countryFeatureState, diasporaIsNeutral, internationalCompatibilityAllowed, normalizePhone, safeLocationDisplay, validTimezone } from "./domain/internationalPolicy";
import { deriveMemberEligibility } from "./domain/memberEligibilityPolicy";
import { canSendInConversation } from "./domain/messagingPolicy";
import { isPremiumSafetyNeutralBoundary } from "./domain/paymentPolicy";
import { DEFAULT_READINESS_POLICY, evaluateConnectionReadiness } from "./domain/readinessPolicy";
import { hasFreshSuccessStoryAuthentication, mayPublishSuccessStory, maySubmitSuccessStory, resolveSuccessDeclarationStatus, validateEditorialCopy } from "./domain/successDeclarationPolicy";

const activeDiscovery = { profileStatus: "active" as const, searchVisible: true, deletedAt: null as Date | null, profileVisibility: "members_only" as const, blocked: false };
const reciprocalSignals = {
  one: { messagesSent: 6, voiceNotesSent: 2, activeDays: 4, firstActivityAt: new Date("2026-08-01"), lastActivityAt: new Date("2026-08-04") },
  two: { messagesSent: 6, voiceNotesSent: 2, activeDays: 4, firstActivityAt: new Date("2026-08-01"), lastActivityAt: new Date("2026-08-04") },
};
const clearReadinessGates = { noActiveBlock: true, noSeriousSafetyRestriction: true, noOpenSeriousReport: true, noInteractionIntegrityConcern: true, accountsActive: true, hardCompatibilityEligible: true, identityVerified: true, voiceConsentsGranted: true, videoConsentsGranted: true };

describe("end-to-end product orchestration with fictional-only fixtures", () => {
  it("connects new-member completion to eligible discovery, mutual communication, and separate consent-based readiness without premature access", () => {
    const fixtures = createControlledWorkflowFixtures();
    const unready = deriveMemberEligibility({ ...fixtures.member, approvedPhotoCount: 0 });
    expect(unready.discoveryEligible).toBe(false);

    const eligible = deriveMemberEligibility({ ...fixtures.member, profileStatus: "active", coreProfileComplete: true, approvedPhotoCount: 5, verificationStatus: "approved" });
    expect(eligible).toMatchObject({ discoveryEligible: true, connectionEligible: true });
    expect(isEligibleForDiscovery(activeDiscovery)).toBe(true);

    expect(canSendInConversation({ isParticipant: true, isBlocked: false, state: "active" })).toBe(true);
    expect(canSendInConversation({ isParticipant: false, isBlocked: false, state: "active" })).toBe(false);
    const readiness = evaluateConnectionReadiness({ one: reciprocalSignals.one, two: reciprocalSignals.two, gates: clearReadinessGates });
    expect(readiness).toMatchObject({ status: "approved_voice", voiceEligible: true, videoEligible: false, reviewRequired: true });
    expect(DEFAULT_READINESS_POLICY.requireHumanReviewForVideo).toBe(true);
  });

  it("orchestrates any block, restriction, report, suspension, hard incompatibility, integrity hold, or consent loss into dependent discovery, messaging, and readiness denial", () => {
    const revokedGates = [
      { noActiveBlock: false },
      { noSeriousSafetyRestriction: false },
      { noOpenSeriousReport: false },
      { accountsActive: false },
      { hardCompatibilityEligible: false },
      { noInteractionIntegrityConcern: false },
      { voiceConsentsGranted: false },
    ];
    for (const change of revokedGates) {
      const readiness = evaluateConnectionReadiness({ one: reciprocalSignals.one, two: reciprocalSignals.two, gates: { ...clearReadinessGates, ...change } });
      if ("voiceConsentsGranted" in change) expect(readiness.voiceEligible).toBe(false);
      else if ("hardCompatibilityEligible" in change) expect(readiness).toMatchObject({ readyForReview: false, voiceEligible: false, videoEligible: false });
      else expect(readiness).toMatchObject({ status: "restricted", voiceEligible: false, videoEligible: false });
    }
    expect(isEligibleForDiscovery({ ...activeDiscovery, blocked: true })).toBe(false);
    expect(isEligibleForDiscovery({ ...activeDiscovery, profileStatus: "suspended" })).toBe(false);
    expect(canSendInConversation({ isParticipant: true, isBlocked: true, state: "active" })).toBe(false);
    expect(canSendInConversation({ isParticipant: true, isBlocked: false, state: "restricted" })).toBe(false);
  });

  it("keeps editorial publication consent-scoped, independently approved, recently authenticated, and immediately removable from public eligibility", () => {
    const now = new Date("2026-08-22T12:00:00.000Z");
    expect(resolveSuccessDeclarationStatus(false)).toBe("private");
    expect(resolveSuccessDeclarationStatus(true)).toBe("consent_recorded");
    expect(hasFreshSuccessStoryAuthentication(new Date(now.getTime() - 10 * 60 * 1000), now.getTime())).toBe(true);
    expect(hasFreshSuccessStoryAuthentication(new Date(now.getTime() - 16 * 60 * 1000), now.getTime())).toBe(false);
    expect(maySubmitSuccessStory({ publicStoryConsent: true, storySummary: "A private voluntary reflection." })).toBe(true);
    expect(validateEditorialCopy("A carefully screened, consented public story about a marriage journey.")).toContain("screened");
    expect(mayPublishSuccessStory({ editorialStatus: "approved", publicStoryConsent: true, publicPhotoAuthorized: false, publicPhotoId: null, independentApprovalGranted: true })).toBe(true);
    expect(mayPublishSuccessStory({ editorialStatus: "withdrawn", publicStoryConsent: true, publicPhotoAuthorized: true, publicPhotoId: 1, independentApprovalGranted: true })).toBe(false);
  });

  it("keeps premium, country, and staff orchestration policy-bound across modules", () => {
    for (const boundary of ["matching_rank", "safety", "privacy", "consent", "verification", "family_circle", "connection_readiness"]) expect(isPremiumSafetyNeutralBoundary(boundary)).toBe(true);
    expect(diasporaIsNeutral()).toBe(true);
    expect(countryFeatureState({ lifecycle: "active", active: true, policyStatus: "active", availability: "available" })).toBe("available");
    expect(normalizePhone("GM", "220 123 4567")).toBe("+2201234567");
    expect(normalizePhone("SN", "221 123456789")).toBe("+221123456789");
    expect(validTimezone("Africa/Banjul")).toBe(true);
    expect(safeLocationDisplay({ visibility: "matches_only", detail: "city", countryName: "The Gambia", city: "Banjul", relationship: "eligible" })).toBe(null);
    expect(internationalCompatibilityAllowed({ locationEnabled: true, relocationEnabled: false, longDistanceEnabled: true })).toEqual({ location: true, relocation: false, longDistance: true });
    expect(roleCan("verification_officer", "verification.review")).toBe(true);
    expect(roleCan("verification_officer", "finance.refunds.create")).toBe(false);
    expect(roleCan("finance_officer", "finance.refunds.create")).toBe(true);
    expect(roleCan("customer_support_officer", "safety.actions.create")).toBe(false);
  });
});
