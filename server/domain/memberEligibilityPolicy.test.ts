import { describe, expect, it } from "vitest";
import { deriveMemberEligibility, desiredProfileStatusForEligibility } from "./memberEligibilityPolicy";

const base = { profileStatus: "draft" as const, searchVisible: true, deletedAt: null, coreProfileComplete: true, approvedPhotoCount: 5, verificationStatus: "not_started" as const };

describe("member eligibility policy", () => {
  it("requires five approved photos before declaring a core profile complete or discovery eligible", () => {
    const state = deriveMemberEligibility({ ...base, approvedPhotoCount: 3 });
    expect(state).toMatchObject({ onboardingState: "NEEDS_ACTION", profileComplete: false, discoveryEligible: false, photosRemaining: 2, title: "Your profile isn't ready yet." });
  });

  it("activates only a core-complete profile with five approved photos while preserving paused and suspended states", () => {
    expect(desiredProfileStatusForEligibility({ profileStatus: "draft", coreProfileComplete: true, approvedPhotoCount: 5 })).toBe("active");
    expect(desiredProfileStatusForEligibility({ profileStatus: "active", coreProfileComplete: true, approvedPhotoCount: 4 })).toBe("draft");
    expect(desiredProfileStatusForEligibility({ profileStatus: "paused", coreProfileComplete: true, approvedPhotoCount: 5 })).toBe("paused");
    expect(desiredProfileStatusForEligibility({ profileStatus: "suspended", coreProfileComplete: true, approvedPhotoCount: 5 })).toBe("suspended");
  });

  it("never reports a suspended account as profile complete or discovery eligible", () => {
    const state = deriveMemberEligibility({ ...base, profileStatus: "suspended" });
    expect(state).toMatchObject({ onboardingState: "BLOCKED", profileComplete: false, discoveryEligible: false, connectionEligible: false });
  });
});
