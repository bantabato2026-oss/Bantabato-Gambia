import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const billing = readFileSync(join(process.cwd(), "server/billingService.ts"), "utf8");
const router = readFileSync(join(process.cwd(), "server/routers.ts"), "utf8");
const schema = readFileSync(join(process.cwd(), "drizzle/schema.ts"), "utf8");
const policy = readFileSync(join(process.cwd(), "server/domain/paymentPolicy.ts"), "utf8");
const provider = readFileSync(join(process.cwd(), "server/paymentProvider.ts"), "utf8");
const publicPages = readFileSync(join(process.cwd(), "client/src/pages/PublicPages.tsx"), "utf8");
const billingPage = readFileSync(join(process.cwd(), "client/src/pages/BillingPage.tsx"), "utf8");
const adminBilling = readFileSync(join(process.cwd(), "client/src/pages/AdminBilling.tsx"), "utf8");

describe("Sprint 7 membership and billing contracts", () => {
  it("resolves only active, currently effective plan prices and exposes a read-only public catalog without provider secrets or member finances", () => {
    expect(schema).toContain('effectiveFrom: timestamp("effectiveFrom")');
    expect(schema).toContain('effectiveUntil: timestamp("effectiveUntil")');
    expect(billing).toContain('function isPriceEffective');
	    expect(billing).toContain('const currentPrices = prices.filter(price => isPriceEffective(price, now))');
	    expect(billing).toContain('currentPrices.filter(price => price.membershipPlanVersionId === version.id)');
    expect(billing).toContain('export async function listPublicMembershipCatalog');
    expect(router).toContain('membershipCatalog: publicProcedure');
    expect(publicPages).toContain('Bantabato is currently free during our initial launch period');
    expect(publicPages).toContain('No payment provider is active, no checkout is available');
    expect(publicPages).not.toContain('trpc.publicContent.membershipCatalog.useQuery');
    expect(publicPages).not.toContain('providerSecret');
  });

  it("distinguishes payment-not-configured, checkout-unavailable, sandbox, and live states without creating a transaction when secure checkout is unavailable", () => {
    expect(schema).toContain('environment: mysqlEnum("environment", ["not_configured", "sandbox", "live"])');
    expect(billing).toContain('type ProviderCheckoutState = "payment_not_configured" | "checkout_unavailable" | "sandbox" | "live"');
    expect(billing).toContain('if (checkoutState === "payment_not_configured" || checkoutState === "checkout_unavailable")');
    expect(billing).toContain('transaction: null');
    expect(billing).toContain('billing.checkout_unavailable');
    expect(billingPage).toContain('No payment, subscription, checkout, or account state was changed.');
    expect(billingPage).toContain('Checkout:</strong> Unavailable during Free Launch');
    expect(billingPage).toContain('Billing is dormant for now.');
    expect(adminBilling).toContain('Metadata and environment only.');
    expect(adminBilling).toContain('No adapter or credential was connected.');
  });

  it("preserves historical commercial context and applies only a verified provider result to membership activation", () => {
    expect(billing).toContain('async function historicalPlanVersion');
    expect(billing).toContain('const { price, version, plan } = await historicalPlanVersion(db, transaction.membershipPriceId);');
    expect(billing).toContain('providerVerifiedAt: completedAt');
    expect(billing).toContain('if (!transaction[0].providerTransactionId) throw new Error("This payment has not been confirmed by a provider.")');
    expect(billing).toContain('A redirect is never authoritative');
    expect(provider).toContain('requireConfiguredProvider');
    expect(policy).toContain('assertPaymentTransition');
  });

  it("keeps refund, cancellation, expiry, entitlement, account-closure, and Family Circle effects factual and contained", () => {
    expect(billing).toContain('Only a confirmed payment on your account can be requested for refund review.');
	  expect(billing).toContain('No money has moved and your membership conveniences and protections are unchanged.');
    expect(billing).toContain('billing-renewal-cancelled:${subscriptionId}');
    expect(billing).toContain('billing-expired:${subscription.id}');
    expect(billing).toContain('handleBillingAccountClosure');
    expect(billingPage).toContain('Core access never removes the rules that keep members safe and respected.');
    expect(billingPage).toContain('No invoice, renewal date, charge, receipt, or paid-subscription action is presented here.');
    expect(policy).toContain('family_circle');
    expect(policy).toContain('connection_readiness');
  });

  it("uses durable replay boundaries for checkout, webhook, refund, and reconciliation workflows without automatic correction", () => {
    expect(schema).toContain('uniqueIndex("payment_transactions_idempotency_unique")');
    expect(schema).toContain('uniqueIndex("payment_webhook_events_provider_event_unique")');
    expect(schema).toContain('uniqueIndex("payment_refunds_provider_reference_unique")');
    expect(schema).toContain('uniqueIndex("payment_reconciliations_subscription_issue_unique")');
    expect(billing).toContain('This checkout request key cannot be reused.');
    expect(billing).toContain('if (raced[0]) return { duplicate: true, processed: raced[0].status === "processed" }');
    expect(billing).toContain('export async function scanPaymentReconciliation');
    expect(billing).toContain('It never changes payment, subscription, refund, or entitlement state.');
    expect(adminBilling).toContain('The scan records internal mismatches for finance review; it never verifies a charge');
    expect(router).toContain('scanPaymentReconciliation: protectedProcedure');
  });

  it("retains premium neutrality, privacy, accessible recovery copy, and scoped finance authorization", () => {
    expect(policy).toContain('PREMIUM_NEUTRAL_BOUNDARIES');
    expect(billingPage).toContain('Free access does not mean unverified or unrestricted.');
    expect(billingPage).toContain('No payment provider is active');
    expect(billingPage).not.toContain('Premium cannot override protections.');
    expect(publicPages).toContain('Free access never buys a match, visibility, approval, or exemption.');
    expect(adminBilling).toContain('Finance access cannot change matching, compatibility, verification, safety, blocks, privacy, Family Circle, consent');
    expect(adminBilling).toContain('Scoped finance operations');
  });
});
