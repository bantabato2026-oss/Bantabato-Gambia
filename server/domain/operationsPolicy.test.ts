import { describe, expect, it } from "vitest";
import { canAccessVerificationDocument, canDecideVerification, hasOperationalScope, isFutureDualAuthorizationAction, safeVerificationStatusMessage } from "./operationsPolicy";

describe("Bantabato operational permission and case policies", () => {
  it("limits private verification documents to verification staff or platform administrators", () => {
    expect(canAccessVerificationDocument(["verification_reviewer"])).toBe(true);
    expect(canAccessVerificationDocument(["platform_admin"])).toBe(true);
    expect(canAccessVerificationDocument(["trust_safety"])).toBe(false);
    expect(canAccessVerificationDocument(["support_agent"])).toBe(false);
  });

  it("recognizes a platform administrator as an explicit scoped operational override", () => {
    expect(hasOperationalScope(["platform_admin"], ["trust_safety"])).toBe(true);
    expect(hasOperationalScope(["support_agent"], ["trust_safety"])).toBe(false);
  });

  it("permits verification decisions only for operationally active case states", () => {
    expect(canDecideVerification("submitted")).toBe(true);
    expect(canDecideVerification("under_review")).toBe(true);
    expect(canDecideVerification("escalated")).toBe(true);
    expect(canDecideVerification("approved")).toBe(false);
    expect(canDecideVerification("requires_resubmission")).toBe(false);
  });

  it("keeps sensitive fraud indicators out of default member-facing verification wording", () => {
    const message = safeVerificationStatusMessage("rejected");
    expect(message.toLowerCase()).not.toContain("fraud");
    expect(message.toLowerCase()).not.toContain("duplicate");
  });

  it("marks irreversible and sensitive operations for future dual authorization", () => {
    expect(isFutureDualAuthorizationAction("permanent_ban")).toBe(true);
    expect(isFutureDualAuthorizationAction("sensitive_data_export")).toBe(true);
    expect(isFutureDualAuthorizationAction("temporary_suspend")).toBe(false);
  });
});
