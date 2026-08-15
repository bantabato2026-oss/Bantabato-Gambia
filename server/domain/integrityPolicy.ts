export const INTEGRITY_SIGNAL_SOURCES = ["member_report", "staff_observation", "verification", "account_security", "messaging", "family_circle", "connection_readiness", "payment", "platform_rule", "policy_violation"] as const;
export const INTEGRITY_SIGNAL_CATEGORIES = ["account_behavior", "verification_anomaly", "messaging_behavior", "report_pattern", "block_pattern", "family_circle_behavior", "recommendation_abuse", "connection_readiness_abuse", "payment_abuse", "account_security", "session_anomaly", "multiple_account_indicator", "rapid_profile_change", "invitation_behavior", "repeated_policy_violation", "financial_solicitation", "other"] as const;
export const INTEGRITY_SEVERITIES = ["informational", "low", "medium", "high", "critical"] as const;
export const EVIDENCE_CONFIDENCES = ["unverified", "limited", "corroborated", "strong"] as const;
export const ENFORCEMENT_ACTIONS = ["warning", "feature_restriction", "messaging_restriction", "connection_restriction", "temporary_suspension", "verification_hold", "integrity_hold", "permanent_account_removal"] as const;

export type IntegritySignalSource = (typeof INTEGRITY_SIGNAL_SOURCES)[number];
export type IntegritySignalCategory = (typeof INTEGRITY_SIGNAL_CATEGORIES)[number];
export type IntegritySeverity = (typeof INTEGRITY_SEVERITIES)[number];
export type EvidenceConfidence = (typeof EVIDENCE_CONFIDENCES)[number];
export type EnforcementActionType = (typeof ENFORCEMENT_ACTIONS)[number];

export const DEFAULT_INTEGRITY_POLICY = {
  policyVersion: "integrity-v1",
  reportEscalationThreshold: 3,
  maximumTemporaryRestrictionDays: 30,
  appealEligibleActions: ["feature_restriction", "messaging_restriction", "connection_restriction", "temporary_suspension", "verification_hold", "integrity_hold", "permanent_account_removal"],
  retentionDays: { case: 730, evidenceReference: 730, appeal: 730, auditLog: 1095 },
} as const;

const prohibitedSafetyTerms = ["risk score", "trust score", "protected characteristic", "race", "ethnicity", "religion", "sexual orientation", "political", "health", "disability", "gender identity", "premium", "subscription", "revenue", "popularity", "profile view", "conversion probability"];

/** Safety metadata may carry a narrow operational reason, but never protected traits, premium state, engagement value, or a score. */
export function assertPermittedIntegrityMetadata(metadata: unknown) {
  const normalized = JSON.stringify(metadata ?? {}).toLowerCase();
  if (prohibitedSafetyTerms.some(term => normalized.includes(term))) throw new Error("Integrity signals may not use protected characteristics, Premium status, engagement value, or opaque scoring.");
}

export function priorityForSeverity(severity: IntegritySeverity): "low" | "normal" | "high" | "critical" {
  if (severity === "critical") return "critical";
  if (severity === "high") return "high";
  if (severity === "informational") return "low";
  return "normal";
}

export function actionRequiresSecondApproval(actionType: EnforcementActionType) {
  return actionType === "temporary_suspension" || actionType === "permanent_account_removal";
}

export function isPermanentAction(actionType: EnforcementActionType) {
  return actionType === "permanent_account_removal";
}

export function isEligibleForAppeal(actionType: EnforcementActionType) {
  return (DEFAULT_INTEGRITY_POLICY.appealEligibleActions as readonly string[]).includes(actionType);
}

export function allowedRestrictionScopes(actionType: EnforcementActionType) {
  const scopes: Record<EnforcementActionType, readonly string[]> = {
    warning: [],
    feature_restriction: ["discovery", "connection_initiation", "family_invitations"],
    messaging_restriction: ["messaging"],
    connection_restriction: ["connection_readiness", "calls"],
    temporary_suspension: ["account"],
    verification_hold: ["verification"],
    integrity_hold: ["discovery", "connection_initiation", "messaging", "connection_readiness", "calls", "verification"],
    permanent_account_removal: ["account"],
  };
  return scopes[actionType];
}

export function validateRestrictionScope(actionType: EnforcementActionType, scope: unknown) {
  if (!Array.isArray(scope) || scope.some(value => typeof value !== "string" || !allowedRestrictionScopes(actionType).includes(value))) throw new Error("The requested restriction scope is not permitted for this action.");
  if (actionType !== "warning" && scope.length === 0) throw new Error("A restriction must have an explicit, limited scope.");
}

export function defaultMemberSafeSafetyMessage(actionType: EnforcementActionType) {
  if (actionType === "warning") return "Please review Bantabato’s community and safety standards.";
  if (actionType === "temporary_suspension") return "Access to selected account features has been temporarily suspended while a Trust & Safety review is addressed.";
  if (actionType === "permanent_account_removal") return "Your account is subject to a Trust & Safety decision. You can review the available appeal information in the Safety Center.";
  return "Selected account functionality has been temporarily restricted while a Trust & Safety review is addressed.";
}

/** A signal can prompt narrow review or a reversible hold, never a permanent automatic outcome. */
export function canBeLimitedAutomaticProtectiveAction(actionType: EnforcementActionType) {
  return ["feature_restriction", "verification_hold", "integrity_hold"].includes(actionType);
}
