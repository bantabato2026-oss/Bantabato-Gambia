import { describe, expect, it } from "vitest";
import { accountLifecycleNeverOverrides, mayCancelDataRight, mayPauseAccount, mayReactivateAccount, mayRequestDeletion, restoredProfileStatus } from "./accountLifecyclePolicy";

describe("account lifecycle policy", () => {
  it("allows a member-controlled pause only for an active, non-suspended profile", () => {
    expect(mayPauseAccount({ accountStatus: "active", profileStatus: "active" })).toBe(true);
    expect(mayPauseAccount({ accountStatus: "paused", profileStatus: "active" })).toBe(false);
    expect(mayPauseAccount({ accountStatus: "active", profileStatus: "suspended" })).toBe(false);
  });

  it("reactivates only a paused account and never restores suspension", () => {
    expect(mayReactivateAccount({ accountStatus: "paused", profileStatus: "active" })).toBe(true);
    expect(mayReactivateAccount({ accountStatus: "deletion_requested", profileStatus: "active" })).toBe(false);
    expect(mayReactivateAccount({ accountStatus: "paused", profileStatus: "suspended" })).toBe(false);
    expect(restoredProfileStatus("active")).toBe("active");
    expect(restoredProfileStatus("paused")).toBe("draft");
    expect(restoredProfileStatus("suspended")).toBe("draft");
  });

  it("requires a fresh authentication boundary for deletion and only cancels open requests", () => {
    expect(mayRequestDeletion({ accountStatus: "active", profileStatus: "active", recentAuthentication: true })).toBe(true);
    expect(mayRequestDeletion({ accountStatus: "active", profileStatus: "active", recentAuthentication: false })).toBe(false);
    expect(mayRequestDeletion({ accountStatus: "deletion_requested", profileStatus: "active", recentAuthentication: true })).toBe(false);
    expect(["requested", "processing"].every(mayCancelDataRight)).toBe(true);
    expect(["ready", "expired", "cancelled", "unavailable", "failed"].some(mayCancelDataRight)).toBe(false);
  });

  it("keeps account lifecycle unable to override safety, eligibility, consent, or premium-neutral product rules", () => {
    expect(accountLifecycleNeverOverrides({ safetyRestricted: false, eligibilityMet: true, consentGranted: true, premium: false })).toBe(true);
    expect(accountLifecycleNeverOverrides({ safetyRestricted: true, eligibilityMet: true, consentGranted: true, premium: false })).toBe(false);
    expect(accountLifecycleNeverOverrides({ safetyRestricted: false, eligibilityMet: true, consentGranted: true, premium: true })).toBe(false);
  });
});
