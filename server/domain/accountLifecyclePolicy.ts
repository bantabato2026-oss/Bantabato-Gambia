export const ACCOUNT_LIFECYCLE_STATUSES = ["active", "paused", "deletion_requested"] as const;
export const DATA_RIGHTS_STATUSES = ["requested", "processing", "ready", "expired", "cancelled", "unavailable", "failed"] as const;

export type AccountLifecycleStatus = (typeof ACCOUNT_LIFECYCLE_STATUSES)[number];
export type DataRightsStatus = (typeof DATA_RIGHTS_STATUSES)[number];
export type MemberProfileLifecycleStatus = "draft" | "under_review" | "active" | "paused" | "suspended";

export function mayPauseAccount(input: { accountStatus: AccountLifecycleStatus; profileStatus: MemberProfileLifecycleStatus }) {
  return input.accountStatus === "active" && input.profileStatus !== "suspended";
}

export function mayReactivateAccount(input: { accountStatus: AccountLifecycleStatus; profileStatus: MemberProfileLifecycleStatus }) {
  return input.accountStatus === "paused" && input.profileStatus !== "suspended";
}

export function mayRequestDeletion(input: { accountStatus: AccountLifecycleStatus; profileStatus: MemberProfileLifecycleStatus; recentAuthentication: boolean }) {
  return input.accountStatus !== "deletion_requested" && input.profileStatus !== "suspended" && input.recentAuthentication;
}

export function mayCancelDataRight(status: DataRightsStatus) {
  return status === "requested" || status === "processing";
}

export function restoredProfileStatus(previous: MemberProfileLifecycleStatus | null | undefined): Exclude<MemberProfileLifecycleStatus, "paused" | "suspended"> {
  if (previous === "draft" || previous === "under_review" || previous === "active") return previous;
  return "draft";
}

/** Account lifecycle is member-controlled but cannot restore safety, eligibility, consent, verification, block, or premium-bypassed access. */
export function accountLifecycleNeverOverrides(input: { safetyRestricted: boolean; eligibilityMet: boolean; consentGranted: boolean; premium: boolean }) {
  return !input.safetyRestricted && input.eligibilityMet && input.consentGranted && !input.premium;
}
