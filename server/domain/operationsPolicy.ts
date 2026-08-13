export type OperationalScope = "verification_reviewer" | "trust_safety" | "support_agent" | "subscription_manager" | "platform_admin";
export type VerificationOperationalStatus = "not_started" | "submitted" | "under_review" | "approved" | "rejected" | "requires_resubmission" | "escalated" | "expired";

export function hasOperationalScope(scopes: readonly OperationalScope[], allowedScopes: readonly OperationalScope[]) {
  return scopes.includes("platform_admin") || allowedScopes.some(scope => scopes.includes(scope));
}

export function canAccessVerificationDocument(scopes: readonly OperationalScope[]) {
  return hasOperationalScope(scopes, ["verification_reviewer"]);
}

export function canDecideVerification(status: VerificationOperationalStatus) {
  return ["submitted", "under_review", "escalated"].includes(status);
}

export function isFutureDualAuthorizationAction(action: string) {
  return ["permanent_ban", "permanent_account_deletion", "sensitive_data_export", "restricted_verification_access", "critical_security_change"].includes(action);
}

export function safeVerificationStatusMessage(status: VerificationOperationalStatus) {
  if (status === "approved") return "Your identity verification has been approved.";
  if (status === "requires_resubmission") return "Action is required before verification can continue. Please submit updated information.";
  if (status === "rejected") return "We could not approve this verification submission. You may submit a valid supported document for a new review.";
  return "Your verification is being reviewed. We will notify you when there is an update.";
}
