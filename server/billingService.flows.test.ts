import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), createAuditLog: vi.fn(), createNotification: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb, createAuditLog: mocks.createAuditLog, createNotification: mocks.createNotification }));

import { cancelSubscriptionRenewal, getMemberReceipt, handleBillingAccountClosure, initiatePayment, processProviderWebhook, requestMemberRefund, requestRefund, reviewRefundRequest, saveBillingPlanConfiguration, saveMemberBillingSettings, savePaymentProviderAvailability } from "./billingService";
import { registerPaymentProvider } from "./paymentProvider";

function fakeDb(rows: unknown[][]) {
  const inserts: Array<{ table: unknown; values: Record<string, unknown> }> = [];
  const updates: Array<{ table: unknown; values: Record<string, unknown> }> = [];
  const select = () => {
    const result = rows.shift() ?? [];
    const query = { limit: async () => result, orderBy: async () => result, for: async () => result, then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) };
    return { from: () => ({ where: () => query }) };
  };
  const insert = (table: unknown) => ({ values: (values: Record<string, unknown>) => { inserts.push({ table, values }); const result = Object.assign([{ id: inserts.length }], { $returningId: async () => [{ id: inserts.length }], onDuplicateKeyUpdate: async () => undefined }); return result; } });
  const update = (table: unknown) => ({ set: (values: Record<string, unknown>) => ({ where: async () => { updates.push({ table, values }); } }) });
  const db = { select, insert, update, transaction: async (callback: (tx: any) => Promise<unknown>) => callback(db) };
  return { db, inserts, updates };
}

const plan = { id: 1, membershipLevel: "premium", status: "active", code: "premium", displayName: "Bantabato Premium" };
const version = { id: 2, membershipPlanId: 1, versionCode: "premium-monthly-v1", status: "active", featureKeys: ["advanced_discovery"], gracePeriodDays: 7, graceEntitlementsActive: false };
const price = { id: 3, membershipPlanVersionId: 2, currency: "GMD", amountMinor: 15000, taxMinor: 0, billingInterval: "monthly", status: "active", provider: "paystack" };

describe("Phase 8 billing service flows", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a truthful unavailable checkout state without creating a transaction or Premium entitlement when no provider boundary is configured", async () => {
    const fake = fakeDb([[], [price], [version], [plan], []]);
    mocks.getDb.mockResolvedValue(fake.db);
    const result = await initiatePayment(3, 9, { membershipPriceId: 3, provider: "paystack", idempotencyKey: "idempotency-key-0001", acknowledgedTerms: true });

    expect(result.providerAvailable).toBe(false);
    expect(result.checkoutState).toBe("payment_not_configured");
	  expect(result.transaction).toBeNull();
	  expect(fake.inserts.some(entry => entry.values.status === "created" && entry.values.idempotencyKey === "idempotency-key-0001")).toBe(false);
    expect(fake.inserts.flatMap(entry => Object.keys(entry.values))).not.toEqual(expect.arrayContaining(["entitlementKey", "cardNumber", "cvv", "providerSecret"]));
	  expect(mocks.createAuditLog).toHaveBeenCalledWith(9, "billing.checkout_unavailable", "membership_price", "3", expect.objectContaining({ checkoutState: "payment_not_configured", planVersion: "premium-monthly-v1" }));
  });

  it("requires explicit checkout consent before creating even a pending transaction", async () => {
    await expect(initiatePayment(3, 9, { membershipPriceId: 3, provider: "paystack", idempotencyKey: "idempotency-key-0002", acknowledgedTerms: false })).rejects.toThrow("confirm the plan");
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("saves member billing preferences without mixing them into the public profile or Family Circle data", async () => {
    const fake = fakeDb([]);
    mocks.getDb.mockResolvedValue(fake.db);
    await expect(saveMemberBillingSettings(3, 9, { preferredCurrency: "gmd", receiptEmail: "member@example.test" })).resolves.toEqual({ preferredCurrency: "GMD", receiptEmail: "member@example.test" });
    expect(fake.inserts.some(entry => entry.values.profileId === 3 && entry.values.receiptEmail === "member@example.test")).toBe(true);
    expect(mocks.createAuditLog).toHaveBeenCalledWith(9, "billing.settings_updated", "member_billing_settings", "3", { preferredCurrency: "GMD", receiptEmailConfigured: true });
  });

  it("cancels renewal at period end without deleting an account or immediately removing a valid current subscription", async () => {
    const subscription = { id: 7, profileId: 3, status: "active", currentPeriodEndsAt: new Date("2026-09-01"), cancelAtPeriodEnd: false };
    const fake = fakeDb([[subscription]]);
    mocks.getDb.mockResolvedValue(fake.db);
    await expect(cancelSubscriptionRenewal(3, 9, 7)).resolves.toEqual({ cancelAtPeriodEnd: true, currentPeriodEndsAt: subscription.currentPeriodEndsAt, alreadyCancelled: false });
    expect(fake.updates.some(entry => entry.values.cancelAtPeriodEnd === true && entry.values.autoRenew === false && entry.values.cancelledAt instanceof Date)).toBe(true);
    expect(fake.updates.flatMap(entry => Object.keys(entry.values))).not.toContain("profileStatus");
  });

  it("records only a role-controlled pending refund request within the confirmed amount without falsely marking payment completion or invoking a provider", async () => {
    const transaction = { id: 8, profileId: 3, status: "successful", amountMinor: 15000, provider: "paystack" };
    const fake = fakeDb([[transaction], []]);
    mocks.getDb.mockResolvedValue(fake.db);
    await expect(requestRefund(99, 8, 5000, "Member request")).resolves.toEqual({ refundId: 1, status: "requested" });
    expect(fake.inserts.some(entry => entry.values.paymentTransactionId === 8 && entry.values.status === "requested" && entry.values.amountMinor === 5000)).toBe(true);
    expect(fake.updates.some(entry => entry.values.status === "partially_refunded" || entry.values.status === "refunded")).toBe(false);
    expect(mocks.createAuditLog).toHaveBeenCalledWith(99, "billing.refund_requested", "payment_refund", "1", { transactionId: 8, amountMinor: 5000 });
  });

  it("lets a member request review only for their own confirmed payment, records the remaining amount once, and denies duplicate pending requests", async () => {
    const transaction = { id: 8, profileId: 3, status: "successful", amountMinor: 15000, provider: "paystack" };
    const created = fakeDb([[transaction], [], [{ userId: 9 }]]);
    mocks.getDb.mockResolvedValue(created.db);
    await expect(requestMemberRefund(3, 9, 8, "I need finance to review this confirmed payment.")).resolves.toEqual({ refundId: 1, amountMinor: 15000, status: "requested" });
    expect(created.inserts.some(entry => entry.values.paymentTransactionId === 8 && entry.values.amountMinor === 15000 && entry.values.status === "requested" && entry.values.requestedByUserId === 9)).toBe(true);
    expect(created.updates.some(entry => entry.values.status === "refunded" || entry.values.status === "partially_refunded")).toBe(false);
    expect(mocks.createAuditLog).toHaveBeenCalledWith(9, "billing.member_refund_requested", "payment_refund", "1", { transactionId: 8, amountMinor: 15000 });

    const duplicate = fakeDb([[transaction], [{ amountMinor: 15000, status: "requested" }]]);
    mocks.getDb.mockResolvedValue(duplicate.db);
    await expect(requestMemberRefund(3, 9, 8, "I need finance to review this confirmed payment.")).rejects.toThrow("already under review");
    expect(duplicate.inserts).toHaveLength(0);
  });

  it("allows scoped finance review to prepare or close a member request without treating either decision as provider confirmation", async () => {
    const refund = { id: 21, paymentTransactionId: 8, status: "requested", amountMinor: 15000 };
    const reviewed = fakeDb([[refund], [{ profileId: 3 }], [{ userId: 9 }]]);
    mocks.getDb.mockResolvedValue(reviewed.db);
    await expect(reviewRefundRequest(99, 21, "approve_for_provider")).resolves.toEqual({ refundId: 21, status: "processing" });
    expect(reviewed.updates.some(entry => entry.values.status === "processing" && entry.values.processedAt instanceof Date)).toBe(true);
    expect(reviewed.updates.some(entry => entry.values.status === "succeeded" || entry.values.status === "refunded")).toBe(false);
    expect(mocks.createAuditLog).toHaveBeenCalledWith(99, "billing.refund_reviewed", "payment_refund", "21", { decision: "approve_for_provider", providerMovement: false });
  });

  it("rejects invalid signed-webhook results and deduplicates an already-seen provider event", async () => {
    registerPaymentProvider({ key: "webhook-test", createPayment: async () => ({ providerTransactionId: "tx", status: "pending" }), verifyPayment: async () => ({ providerTransactionId: "tx", status: "successful" }), verifyWebhook: async () => ({ providerEventId: "evt-invalid", eventType: "payment.failed", valid: false, payloadHash: "hash" }) });
    const invalid = fakeDb([[]]);
    mocks.getDb.mockResolvedValue(invalid.db);
    await expect(processProviderWebhook({ provider: "webhook-test", rawPayload: "{}", signature: "invalid" })).rejects.toThrow("signature");
    expect(invalid.inserts.some(entry => entry.values.signatureValid === false && entry.values.status === "rejected")).toBe(true);

    const duplicate = fakeDb([[{ id: 1, status: "processed" }]]);
    mocks.getDb.mockResolvedValue(duplicate.db);
    await expect(processProviderWebhook({ provider: "webhook-test", rawPayload: "{}", signature: "valid" })).resolves.toEqual({ duplicate: true, processed: true });
  });

	  it("handles account closure by stopping renewal while preserving transaction and financial audit records", async () => {
    const fake = fakeDb([[{ id: 10, profileId: 3, status: "active" }, { id: 11, profileId: 3, status: "grace_period" }]]);
    mocks.getDb.mockResolvedValue(fake.db);
    await expect(handleBillingAccountClosure(3, 9)).resolves.toEqual({ subscriptionsCancelled: 2 });
    expect(fake.updates).toHaveLength(2);
    expect(fake.updates.every(entry => entry.values.autoRenew === false && entry.values.cancelAtPeriodEnd === true)).toBe(true);
	    expect(mocks.createAuditLog).toHaveBeenCalledWith(9, "billing.account_closure_handled", "member_profile", "3", { subscriptionsCancelled: 2 });
	  });

	  it("creates a new auditable plan version and price rather than silently changing any existing member subscription terms", async () => {
	    const fake = fakeDb([[], []]);
	    mocks.getDb.mockResolvedValue(fake.db);
	    await expect(saveBillingPlanConfiguration(99, { planCode: "premium", displayName: "Bantabato Premium", versionCode: "premium-monthly-v1", featureKeys: ["advanced_discovery"], gracePeriodDays: 7, graceEntitlementsActive: false, cancelAtPeriodEndAllowed: true, currency: "gmd", amountMinor: 15000, taxMinor: 0, billingInterval: "monthly", provider: "paystack", activate: false })).resolves.toEqual({ planId: 1, versionId: 2 });
	    expect(fake.inserts.some(entry => entry.values.versionCode === "premium-monthly-v1" && entry.values.status === "draft")).toBe(true);
	    expect(fake.inserts.some(entry => entry.values.membershipPlanVersionId === 2 && entry.values.currency === "GMD" && entry.values.amountMinor === 15000)).toBe(true);
	    expect(mocks.createAuditLog).toHaveBeenCalledWith(99, "billing.plan_version_created", "membership_plan_version", "2", expect.objectContaining({ planCode: "premium", versionCode: "premium-monthly-v1" }));
	  });

  it("records provider availability environment metadata without accepting or persisting live credentials", async () => {
	    const fake = fakeDb([]);
	    mocks.getDb.mockResolvedValue(fake.db);
	    await expect(savePaymentProviderAvailability(99, { provider: "Paystack", enabled: false, environment: "not_configured", supportedCurrencies: ["gmd", "usd"], supportedMethods: ["provider_hosted"], configurationNote: "No credentials stored" })).resolves.toEqual({ provider: "paystack", enabled: false, environment: "not_configured", supportedCurrencies: ["GMD", "USD"] });
	    expect(fake.inserts.some(entry => entry.values.provider === "paystack" && entry.values.enabled === false && Array.isArray(entry.values.supportedCurrencies))).toBe(true);
	    expect(fake.inserts.flatMap(entry => Object.keys(entry.values))).not.toEqual(expect.arrayContaining(["apiKey", "secret", "webhookSecret", "password"]));
	  });

  it("returns a member-owned internal payment record only for the owning profile and never fabricates an invoice or provider receipt", async () => {
    const transaction = { id: 8, profileId: 3, membershipPriceId: 3, status: "successful", internalReference: "bnt_private", amountMinor: 15000, taxMinor: 0, feeMinor: 0, discountMinor: 0, currency: "GMD", createdAt: new Date("2026-08-01"), completedAt: new Date("2026-08-01") };
    const fake = fakeDb([[transaction], [price], [version], [plan]]);
    mocks.getDb.mockResolvedValue(fake.db);
    await expect(getMemberReceipt(3, 8)).resolves.toMatchObject({ available: true, reference: "bnt_private", planName: "Bantabato Premium", planVersion: "premium-monthly-v1" });
    expect(fake.inserts).toHaveLength(0);
  });

  it("returns the current pending checkout state for a duplicate request key without creating a second financial record", async () => {
    const pending = { id: 8, profileId: 3, provider: "paystack", status: "pending", internalReference: "bnt_pending", amountMinor: 15000, currency: "GMD", createdAt: new Date(), completedAt: null };
    const fake = fakeDb([[pending], [{ provider: "paystack", enabled: true, environment: "live" }]]);
    mocks.getDb.mockResolvedValue(fake.db);
    const result = await initiatePayment(3, 9, { membershipPriceId: 3, provider: "paystack", idempotencyKey: "idempotency-key-duplicate", acknowledgedTerms: true });
    expect(result.duplicate).toBe(true);
    expect(result.transaction?.status).toBe("pending");
    expect(fake.inserts).toHaveLength(0);
  });

  it("treats an already-scheduled period-end cancellation as idempotent and avoids repeated lifecycle side effects", async () => {
    const subscription = { id: 7, profileId: 3, status: "active", currentPeriodEndsAt: new Date("2026-09-01"), cancelAtPeriodEnd: true };
    const fake = fakeDb([[subscription]]);
    mocks.getDb.mockResolvedValue(fake.db);
    await expect(cancelSubscriptionRenewal(3, 9, 7)).resolves.toEqual({ alreadyCancelled: true, currentPeriodEndsAt: subscription.currentPeriodEndsAt });
    expect(fake.updates).toHaveLength(0);
    expect(mocks.createNotification).not.toHaveBeenCalled();
  });
});
