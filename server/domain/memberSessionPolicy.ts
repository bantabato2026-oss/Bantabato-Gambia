export type MemberSessionStatus = "active" | "revoked" | "expired";

export function memberSessionIsUsable(status: MemberSessionStatus, expiresAt: Date, now = new Date()) {
  return status === "active" && expiresAt > now;
}

export function mayRevokeMemberSession(input: { ownerMatches: boolean; targetStatus: MemberSessionStatus; targetIsCurrent: boolean; observedUpdatedAt: Date; expectedUpdatedAt: Date }) {
  if (!input.ownerMatches) return { allowed: false as const, reason: "ownership" as const };
  if (input.targetIsCurrent) return { allowed: false as const, reason: "current" as const };
  if (input.targetStatus !== "active") return { allowed: false as const, reason: "inactive" as const };
  if (input.observedUpdatedAt.getTime() !== input.expectedUpdatedAt.getTime()) return { allowed: false as const, reason: "stale" as const };
  return { allowed: true as const, reason: "ok" as const };
}

/** Member security actions remain independent of paid status and never bypass safety, privacy, consent, or account authority. */
export function memberSecurityIsPremiumNeutral(input: { premium: boolean; safetyRestricted: boolean; privacyAllowed: boolean; consentGranted: boolean }) {
  return !input.premium && !input.safetyRestricted && input.privacyAllowed && input.consentGranted;
}
