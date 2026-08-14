export const ENTITLEMENT_KEYS = ["advanced_discovery", "expanded_discovery_controls", "profile_visibility_controls", "enhanced_recommendation_controls", "profile_management_convenience"] as const;
export type EntitlementKey = (typeof ENTITLEMENT_KEYS)[number];

export const PREMIUM_NEUTRAL_BOUNDARIES = [
  "compatibility", "matching_rank", "safety", "moderation", "verification", "blocks", "privacy", "hard_compatibility", "consent", "family_circle", "connection_readiness", "voice_eligibility", "video_eligibility",
] as const;

export type PaymentStatus = "created" | "pending" | "processing" | "successful" | "failed" | "cancelled" | "expired" | "refunded" | "partially_refunded" | "disputed";
export type SubscriptionStatus = "trial" | "active" | "past_due" | "grace_period" | "cancelled" | "expired" | "suspended" | "refunded" | "inactive";

const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  created: ["pending", "processing", "cancelled", "expired", "failed"],
  pending: ["processing", "successful", "failed", "cancelled", "expired"],
  processing: ["successful", "failed", "cancelled", "disputed"],
  successful: ["refunded", "partially_refunded", "disputed"],
  failed: [], cancelled: [], expired: [], refunded: [], partially_refunded: ["refunded", "disputed"], disputed: ["successful", "refunded", "partially_refunded"],
};

export function canTransitionPayment(current: PaymentStatus, next: PaymentStatus) { return PAYMENT_TRANSITIONS[current].includes(next); }
export function assertPaymentTransition(current: PaymentStatus, next: PaymentStatus) { if (current !== next && !canTransitionPayment(current, next)) throw new Error(`Payment cannot move from ${current} to ${next}`); }

export function subscriptionStatusAfterPaymentFailure(now: Date, gracePeriodDays: number): { status: "past_due" | "grace_period"; gracePeriodEndsAt: Date | null } {
  if (gracePeriodDays <= 0) return { status: "past_due", gracePeriodEndsAt: null };
  const endsAt = new Date(now.getTime() + gracePeriodDays * 86_400_000);
  return { status: "grace_period", gracePeriodEndsAt: endsAt };
}

export function entitlementIsActive(input: { subscriptionStatus: SubscriptionStatus; entitlementStatus: "active" | "revoked" | "expired"; startsAt: Date; endsAt?: Date | null; graceEntitlementsActive: boolean; now: Date }) {
  if (input.entitlementStatus !== "active" || input.startsAt > input.now || (input.endsAt && input.endsAt <= input.now)) return false;
  return input.subscriptionStatus === "active" || input.subscriptionStatus === "trial" || (input.subscriptionStatus === "grace_period" && input.graceEntitlementsActive);
}

export function normalizeCurrency(currency: string) {
  const value = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(value)) throw new Error("Use a three-letter currency code.");
  return value;
}

export function safePaymentFailureMessage() { return "We could not confirm this payment. Your membership and safety access have not been changed. You may try again or choose another available method."; }

export function safeBillingSummary(input: { amountMinor: number; currency: string; status: PaymentStatus; internalReference: string; createdAt: Date; completedAt?: Date | null }) {
  return { amountMinor: input.amountMinor, currency: normalizeCurrency(input.currency), status: input.status, reference: input.internalReference, createdAt: input.createdAt, completedAt: input.completedAt ?? null };
}

export function isPremiumSafetyNeutralBoundary(key: string) { return (PREMIUM_NEUTRAL_BOUNDARIES as readonly string[]).includes(key); }
