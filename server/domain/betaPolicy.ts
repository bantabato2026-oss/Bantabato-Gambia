export type BetaMode = "disabled" | "invite_only" | "paused" | "shutdown";
export type BetaEnrollmentStatus = "enrolled" | "suspended" | "removed";

export function betaModeAllowsEnrollment(mode: BetaMode) {
  return mode === "invite_only";
}

export function betaModeAllowsMemberAccess(mode: BetaMode, status?: BetaEnrollmentStatus | null) {
  if (mode === "disabled") return true;
  if (mode === "shutdown") return false;
  return status === "enrolled";
}

export function betaAccessFailureMessage(mode: BetaMode, status?: BetaEnrollmentStatus | null) {
  if (mode === "shutdown") return "Beta access is temporarily unavailable.";
  if (status === "suspended") return "Your beta access is currently suspended.";
  if (status === "removed") return "Your beta access is no longer active.";
  return "This account is not enrolled in the current beta.";
}
