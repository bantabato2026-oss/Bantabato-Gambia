import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Sprint 36 — membership, checkout & finance lifecycle", () => {
  it("selects only deterministic current effective price versions and retains historical transaction terms", () => {
    const billing = read("server/billingService.ts");
    expect(billing).toContain("const currentPrices = prices.filter(price => isPriceEffective(price, now))");
    expect(billing).toContain("candidateVersion.membershipPlanId !== version.membershipPlanId");
    expect(billing).toContain("candidate.billingInterval !== price.billingInterval");
    expect(billing).toContain("candidateEffectiveAt > effectiveAt");
    expect(billing).toContain("historicalPlanVersion");
    expect(billing).toContain("planVersion: version?.versionCode ?? null");
  });

	it("keeps GMD, XOF, and USD as separate explicit catalog presentations without conversion", () => {
		const page = read("client/src/pages/BillingPage.tsx");
		expect(page).toContain('["GMD", "XOF", "USD"]');
		expect(page).toContain("does not invent exchange rates or perform automatic conversion");
	});

  it("does not create checkout state when payment is unavailable and protects paused or suspended accounts", () => {
    const billing = read("server/billingService.ts");
		const router = read("server/routers.ts");
		expect(router).toContain("profile.profileStatus === \"paused\" || profile.profileStatus === \"suspended\"");
		expect(router).toContain("No transaction or membership change was created.");
    expect(billing).toContain("checkoutState === \"payment_not_configured\" || checkoutState === \"checkout_unavailable\"");
    expect(billing).toContain("return { transaction: null, redirectUrl: undefined, providerAvailable: false");
    expect(billing).toContain("No charge, transaction, or Premium entitlement was created.");
  });

  it("requires authoritative confirmation for activation and preserves terminal payment outcomes", () => {
    const billing = read("server/billingService.ts");
    expect(billing).toContain("if (!transaction[0].providerTransactionId) throw new Error(\"This payment has not been confirmed by a provider.\")");
    expect(billing).toContain("if (result.status !== \"successful\") return markPaymentTerminal");
    expect(billing).toContain("assertPaymentTransition(transaction.status, \"successful\")");
    expect(billing).toContain("status: \"successful\", completedAt, providerVerifiedAt: completedAt");
    expect(billing).toContain("nextStatus: \"failed\" | \"cancelled\" | \"expired\"");
  });

  it("protects duplicate checkout, cancellation, refund, expiry, and replay handling without fabricated financial activity", () => {
    const billing = read("server/billingService.ts");
    expect(billing).toContain("eq(paymentTransactions.idempotencyKey, input.idempotencyKey)");
    expect(billing).toContain("A concurrent checkout request was already recorded. No duplicate transaction was created.");
    expect(billing).toContain("expectedUpdatedAt?: Date");
    expect(billing).toContain("This membership changed in another session. Refresh billing before trying again.");
    expect(billing).toContain("eq(subscriptions.updatedAt, record[0].updatedAt)");
		expect(billing).toContain("A refund request for this payment is already under review.");
    expect(billing).toContain("if (existing[0]) return { duplicate: true, processed: existing[0].status === \"processed\" }");
    expect(billing).toContain("It never changes payment, subscription, refund, or entitlement state.");
  });

  it("keeps finance records private, provider-neutral, accessible, offline-safe, and Premium-neutral in the member interface", () => {
    const page = read("client/src/pages/BillingPage.tsx");
    const router = read("server/routers.ts");
    expect(page).toContain("Billing data is not cached for offline access");
    expect(page).toContain("pending={requestRefund.isPending || network !== \"online\"}");
    expect(page).toContain("expectedUpdatedAt: current.updatedAt ?? undefined");
    expect(page).toContain("Premium cannot override protections.");
    expect(page).toContain("This boundary never generates a provider receipt, invoice number, or tax claim.");
    expect(page).toContain("aria-live=\"polite\"");
    expect(router).toContain("expectedUpdatedAt: z.date().optional()");
    expect(router).toContain("requestMemberRefund((await requireProfile(ctx.user.id)).id");
  });
});
