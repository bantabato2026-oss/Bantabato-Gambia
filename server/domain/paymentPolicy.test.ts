import { describe, expect, it } from "vitest";
import { assertPaymentTransition, canTransitionPayment, entitlementIsActive, isPremiumSafetyNeutralBoundary, normalizeCurrency, PREMIUM_NEUTRAL_BOUNDARIES, safeBillingSummary, safePaymentFailureMessage, subscriptionStatusAfterPaymentFailure } from "./paymentPolicy";

describe("Phase 8 payment and entitlement policy", () => {
  const now = new Date("2026-08-14T12:00:00Z");

  it("keeps payment and subscription lifecycle concepts separate", () => {
    expect(canTransitionPayment("created", "pending")).toBe(true);
    expect(canTransitionPayment("pending", "successful")).toBe(true);
    expect(canTransitionPayment("successful", "refunded")).toBe(true);
    expect(canTransitionPayment("successful", "failed")).toBe(false);
  });

  it("rejects invalid payment transitions rather than collapsing provider responses", () => {
    expect(() => assertPaymentTransition("failed", "successful")).toThrow("Payment cannot move");
    expect(() => assertPaymentTransition("cancelled", "processing")).toThrow("Payment cannot move");
  });

  it("uses configurable grace-period state rather than a hard-coded entitlement extension", () => {
    expect(subscriptionStatusAfterPaymentFailure(now, 0)).toEqual({ status: "past_due", gracePeriodEndsAt: null });
    expect(subscriptionStatusAfterPaymentFailure(now, 7)).toEqual({ status: "grace_period", gracePeriodEndsAt: new Date("2026-08-21T12:00:00Z") });
  });

  it("only grants an entitlement for active or configured grace subscriptions within its own time bounds", () => {
    const active = { entitlementStatus: "active" as const, startsAt: new Date("2026-08-01"), endsAt: new Date("2026-09-01"), now };
    expect(entitlementIsActive({ ...active, subscriptionStatus: "active", graceEntitlementsActive: false })).toBe(true);
    expect(entitlementIsActive({ ...active, subscriptionStatus: "grace_period", graceEntitlementsActive: false })).toBe(false);
    expect(entitlementIsActive({ ...active, subscriptionStatus: "grace_period", graceEntitlementsActive: true })).toBe(true);
    expect(entitlementIsActive({ ...active, subscriptionStatus: "suspended", graceEntitlementsActive: true })).toBe(false);
    expect(entitlementIsActive({ ...active, subscriptionStatus: "active", entitlementStatus: "revoked", graceEntitlementsActive: false })).toBe(false);
  });

  it("expires entitlements at the configured period end without deleting membership data", () => {
    expect(entitlementIsActive({ subscriptionStatus: "active", entitlementStatus: "active", startsAt: new Date("2026-08-01"), endsAt: now, graceEntitlementsActive: false, now })).toBe(false);
  });

  it("uses ISO-style currency codes and rejects unsafe currency input", () => {
    expect(normalizeCurrency(" gmd ")).toBe("GMD");
    expect(normalizeCurrency("usd")).toBe("USD");
    expect(() => normalizeCurrency("GMD;DROP")).toThrow("three-letter currency");
  });

  it("returns only a member-safe billing receipt summary", () => {
    expect(safeBillingSummary({ amountMinor: 2500, currency: "gmd", status: "successful", internalReference: "bnt_private_ref", createdAt: now })).toEqual({ amountMinor: 2500, currency: "GMD", status: "successful", reference: "bnt_private_ref", createdAt: now, completedAt: null });
  });

  it("uses a generic recovery message that does not leak provider credentials or private payment data", () => {
    expect(safePaymentFailureMessage()).toMatch(/could not confirm/i);
    expect(safePaymentFailureMessage()).not.toMatch(/card|cvv|password|secret/i);
  });

  it("defines Premium as safety-neutral, consent-neutral, Family Circle-neutral, and matching-neutral", () => {
    expect(PREMIUM_NEUTRAL_BOUNDARIES).toEqual(expect.arrayContaining(["safety", "blocks", "privacy", "hard_compatibility", "consent", "family_circle", "connection_readiness", "voice_eligibility", "video_eligibility", "matching_rank"]));
    expect(isPremiumSafetyNeutralBoundary("voice_eligibility")).toBe(true);
    expect(isPremiumSafetyNeutralBoundary("advanced_discovery")).toBe(false);
  });
});
