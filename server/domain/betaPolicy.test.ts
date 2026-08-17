import { describe, expect, it } from "vitest";
import { betaAccessFailureMessage, betaModeAllowsEnrollment, betaModeAllowsMemberAccess } from "./betaPolicy";

describe("closed-beta policy", () => {
  it("allows every member only while beta enforcement is disabled", () => {
    expect(betaModeAllowsMemberAccess("disabled", undefined)).toBe(true);
    expect(betaModeAllowsEnrollment("disabled")).toBe(false);
  });

  it("allows only enrolled members during invite-only and paused modes", () => {
    expect(betaModeAllowsEnrollment("invite_only")).toBe(true);
    expect(betaModeAllowsMemberAccess("invite_only", "enrolled")).toBe(true);
    expect(betaModeAllowsMemberAccess("paused", "enrolled")).toBe(true);
    expect(betaModeAllowsMemberAccess("invite_only", undefined)).toBe(false);
    expect(betaModeAllowsMemberAccess("paused", "suspended")).toBe(false);
  });

  it("blocks all beta member access during emergency shutdown", () => {
    expect(betaModeAllowsEnrollment("shutdown")).toBe(false);
    expect(betaModeAllowsMemberAccess("shutdown", "enrolled")).toBe(false);
    expect(betaAccessFailureMessage("shutdown", "enrolled")).toMatch(/temporarily unavailable/i);
  });
});
