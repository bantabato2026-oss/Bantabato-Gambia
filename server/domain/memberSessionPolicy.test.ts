import { describe, expect, it } from "vitest";
import { mayRevokeMemberSession, memberSecurityIsPremiumNeutral, memberSessionIsUsable } from "./memberSessionPolicy";

describe("member session policy", () => {
  const now = new Date("2026-08-24T12:00:00Z");
  const current = new Date("2026-08-24T12:01:00Z");

  it("uses only active and unexpired observed session states", () => {
    expect(memberSessionIsUsable("active", current, now)).toBe(true);
    expect(memberSessionIsUsable("revoked", current, now)).toBe(false);
    expect(memberSessionIsUsable("expired", current, now)).toBe(false);
    expect(memberSessionIsUsable("active", now, now)).toBe(false);
  });

  it("rejects cross-member, current-session, inactive, and stale individual revocation attempts", () => {
    const base = { ownerMatches: true, targetStatus: "active" as const, targetIsCurrent: false, observedUpdatedAt: now, expectedUpdatedAt: now };
    expect(mayRevokeMemberSession(base)).toEqual({ allowed: true, reason: "ok" });
    expect(mayRevokeMemberSession({ ...base, ownerMatches: false }).reason).toBe("ownership");
    expect(mayRevokeMemberSession({ ...base, targetIsCurrent: true }).reason).toBe("current");
    expect(mayRevokeMemberSession({ ...base, targetStatus: "revoked" }).reason).toBe("inactive");
    expect(mayRevokeMemberSession({ ...base, expectedUpdatedAt: current }).reason).toBe("stale");
  });

  it("keeps security and account control independent of Premium, safety bypass, privacy bypass, and consent bypass", () => {
    expect(memberSecurityIsPremiumNeutral({ premium: false, safetyRestricted: false, privacyAllowed: true, consentGranted: true })).toBe(true);
    expect(memberSecurityIsPremiumNeutral({ premium: true, safetyRestricted: false, privacyAllowed: true, consentGranted: true })).toBe(false);
    expect(memberSecurityIsPremiumNeutral({ premium: false, safetyRestricted: true, privacyAllowed: true, consentGranted: true })).toBe(false);
  });
});
