import { describe, expect, it } from "vitest";
import { actionRequiresSecondApproval, allowedRestrictionScopes, assertPermittedIntegrityMetadata, canBeLimitedAutomaticProtectiveAction, defaultMemberSafeSafetyMessage, isEligibleForAppeal, isPermanentAction, priorityForSeverity, validateRestrictionScope } from "./integrityPolicy";

describe("Phase 10 integrity policy", () => {
  it("maps explainable severity to operational case priority without creating an opaque score", () => {
    expect(priorityForSeverity("informational")).toBe("low");
    expect(priorityForSeverity("medium")).toBe("normal");
    expect(priorityForSeverity("high")).toBe("high");
    expect(priorityForSeverity("critical")).toBe("critical");
  });

  it("rejects protected characteristics and never accepts a Trust Score as safety input", () => {
    expect(() => assertPermittedIntegrityMetadata({ trait: "religion" })).toThrow(/protected characteristics/i);
    expect(() => assertPermittedIntegrityMetadata({ score: "Trust Score 87" })).toThrow(/protected characteristics/i);
    expect(() => assertPermittedIntegrityMetadata({ reason: "reported financial solicitation" })).not.toThrow();
  });

  it("rejects Premium, revenue, popularity, and engagement value as integrity inputs", () => {
    for (const value of ["premium membership", "revenue potential", "profile view count", "conversion probability"]) expect(() => assertPermittedIntegrityMetadata({ value })).toThrow(/Premium status|engagement value/i);
  });

  it("uses explicit, proportionate scopes rather than disabling unrelated functionality", () => {
    expect(allowedRestrictionScopes("messaging_restriction")).toEqual(["messaging"]);
    expect(() => validateRestrictionScope("messaging_restriction", ["messaging"])).not.toThrow();
    expect(() => validateRestrictionScope("messaging_restriction", ["account"])).toThrow(/scope/i);
    expect(() => validateRestrictionScope("integrity_hold", [])).toThrow(/explicit/i);
  });

  it("requires a distinct second approval for high-impact temporary suspension and permanent removal", () => {
    expect(actionRequiresSecondApproval("temporary_suspension")).toBe(true);
    expect(actionRequiresSecondApproval("permanent_account_removal")).toBe(true);
    expect(actionRequiresSecondApproval("messaging_restriction")).toBe(false);
    expect(isPermanentAction("permanent_account_removal")).toBe(true);
  });

  it("never treats a permanent removal as a limited automatic protective action", () => {
    expect(canBeLimitedAutomaticProtectiveAction("integrity_hold")).toBe(true);
    expect(canBeLimitedAutomaticProtectiveAction("verification_hold")).toBe(true);
    expect(canBeLimitedAutomaticProtectiveAction("permanent_account_removal")).toBe(false);
  });

  it("defines a member-safe explanation that does not expose reporter identity, evidence, or detection logic", () => {
    const message = defaultMemberSafeSafetyMessage("temporary_suspension");
    expect(message).toMatch(/temporarily suspended/i);
    expect(message).not.toMatch(/reporter|evidence|signal|rule|fraud score/i);
  });

  it("keeps eligible appeal pathways for proportionate restrictions while warnings remain non-appealable", () => {
    expect(isEligibleForAppeal("warning")).toBe(false);
    expect(isEligibleForAppeal("messaging_restriction")).toBe(true);
    expect(isEligibleForAppeal("temporary_suspension")).toBe(true);
  });
});
