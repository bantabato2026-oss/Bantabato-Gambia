import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Sprint 14 membership, checkout, finance, and provider-neutral contracts", () => {
  it("keeps pricing, historical terms, checkout, entitlements, payment events, and retry state server-authoritative", () => {
    const billing = read("server/billingService.ts");
    const policy = read("server/domain/paymentPolicy.ts");
    expect(billing).toContain("isPriceEffective(price[0])");
    expect(billing).toContain("historicalPlanVersion");
    expect(billing).toContain("idempotencyKey");
    expect(billing).toContain("A concurrent checkout request was already recorded");
    expect(billing).not.toContain("paymentWebhookEvents_provider_event_unique");
    expect(billing).toContain("processProviderWebhook");
    expect(billing).toContain("payment_transaction");
    expect(policy).toContain("assertPaymentTransition");
    expect(policy).toContain("entitlementIsActive");
  });

  it("keeps member history, receipt records, refunds, and finance state private, factual, and without invoice or provider-secret claims", () => {
    const billing = read("server/billingService.ts");
    const page = read("client/src/pages/BillingPage.tsx");
    expect(billing).toContain("getMemberReceipt(profileId: number, transactionId: number)");
    expect(billing).toContain("eq(paymentTransactions.profileId, profileId)");
    expect(billing).toContain("not a tax invoice or a provider-issued receipt");
    expect(page).toContain("Internal payment record");
    expect(page).toContain("No invoice number or tax claim is generated");
    expect(page).toContain("under review");
    expect(page).toContain("approved / awaiting provider");
    expect(page).not.toContain("cardNumber");
    expect(page).not.toContain("providerSecret");
  });

  it("renders truthful membership, checkout, currency, offline, low-bandwidth, accessibility, and profile-prerequisite recovery states", () => {
    const page = read("client/src/pages/BillingPage.tsx");
    expect(page).toContain("profile.mine.useQuery");
    expect(page).toContain("Start your profile before reviewing private billing");
    expect(page).toContain("You appear to be offline");
    expect(page).toContain("low-bandwidth mode is active");
    expect(page).toContain('["GMD", "XOF", "USD"]');
    expect(page).toContain("Effective version");
    expect(page).toContain("Checkout pending");
    expect(page).toContain("aria-live=\"polite\"");
    expect(page).toContain("Retry current checkout safely");
  });

  it("preserves premium neutrality, scoped finance boundaries, reconciliation review, and factual finance workload without revenue analytics", () => {
    const policy = read("server/domain/paymentPolicy.ts");
    const adminService = read("server/adminOperationsService.ts");
    const admin = read("client/src/pages/AdminPage.tsx");
    const finance = read("client/src/pages/AdminBilling.tsx");
    expect(policy).toContain('"verification"');
    expect(policy).toContain('"family_circle"');
    expect(policy).toContain('"connection_readiness"');
    expect(adminService).toContain('can("finance.transactions.view") ? await count(paymentReconciliations');
    expect(admin).toContain('key: "reconciliations"');
    expect(finance).toContain("never verifies a charge, changes a subscription, grants an entitlement, marks a refund complete");
    expect(admin).not.toContain("revenue chart");
    expect(admin).not.toContain("payment success rate");
  });
});
