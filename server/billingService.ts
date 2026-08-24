import { and, asc, desc, eq, inArray, isNull, lte, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { memberBillingSettings, memberProfiles, membershipPlans, membershipPlanVersions, membershipPrices, paymentProviderConfigurations, paymentReconciliations, paymentRefunds, paymentTransactions, paymentWebhookEvents, subscriptionEntitlements, subscriptions } from "../drizzle/schema";
import { createAuditLog, createNotification, getDb } from "./db";
import { assertPaymentTransition, entitlementIsActive, normalizeCurrency, safeBillingSummary, safePaymentFailureMessage, subscriptionStatusAfterPaymentFailure, type EntitlementKey, type PaymentStatus, type SubscriptionStatus } from "./domain/paymentPolicy";
import { getPaymentProvider, payloadHash, requireConfiguredProvider } from "./paymentProvider";

export const PAYMENT_PROVIDERS = ["paystack", "flutterwave"] as const;
export type PaymentProviderKey = (typeof PAYMENT_PROVIDERS)[number] | string;
export type ProviderCheckoutState = "payment_not_configured" | "checkout_unavailable" | "sandbox" | "live";

async function profileUser(profileId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({ userId: memberProfiles.userId }).from(memberProfiles).where(eq(memberProfiles.id, profileId)).limit(1);
  return rows[0]?.userId ?? null;
}

async function activePlanVersion(db: any, membershipPriceId: number) {
  const price = await db.select().from(membershipPrices).where(eq(membershipPrices.id, membershipPriceId)).limit(1);
  if (!price[0] || price[0].status !== "active") throw new Error("This membership price is not available.");
  const version = await db.select().from(membershipPlanVersions).where(eq(membershipPlanVersions.id, price[0].membershipPlanVersionId)).limit(1);
  if (!version[0] || version[0].status !== "active") throw new Error("This membership version is not available.");
  const plan = await db.select().from(membershipPlans).where(eq(membershipPlans.id, version[0].membershipPlanId)).limit(1);
  if (!plan[0] || plan[0].status !== "active") throw new Error("This membership plan is not available.");
	  if (!isPriceEffective(price[0])) throw new Error("This membership price is not currently available.");
  return { price: price[0], version: version[0], plan: plan[0] };
}

async function historicalPlanVersion(db: any, membershipPriceId: number) {
	const price = await db.select().from(membershipPrices).where(eq(membershipPrices.id, membershipPriceId)).limit(1);
	if (!price[0]) throw new Error("The recorded membership price is unavailable for reconciliation.");
	const version = await db.select().from(membershipPlanVersions).where(eq(membershipPlanVersions.id, price[0].membershipPlanVersionId)).limit(1);
	const plan = version[0] ? await db.select().from(membershipPlans).where(eq(membershipPlans.id, version[0].membershipPlanId)).limit(1) : [];
	if (!version[0] || !plan[0]) throw new Error("The historical membership terms are unavailable for reconciliation.");
	return { price: price[0], version: version[0], plan: plan[0] };
}

function isPriceEffective(price: { effectiveFrom?: Date | null; effectiveUntil?: Date | null }, now = new Date()) {
	return (!price.effectiveFrom || price.effectiveFrom <= now) && (!price.effectiveUntil || price.effectiveUntil > now);
}

function providerCheckoutState(provider: string | null | undefined, configuration: { enabled: boolean; environment?: "not_configured" | "sandbox" | "live" } | undefined): ProviderCheckoutState {
	if (!provider || !configuration || !configuration.enabled || configuration.environment === "not_configured" || !configuration.environment) return "payment_not_configured";
	if (!getPaymentProvider(provider)) return "checkout_unavailable";
	return configuration.environment;
}

async function membershipCatalog(currency: string, publicOnly: boolean) {
	const db = await getDb();
	if (!db) return [];
	const normalizedCurrency = normalizeCurrency(currency);
	const now = new Date();
	const [plans, versions, configurations] = await Promise.all([
		db.select().from(membershipPlans).where(eq(membershipPlans.status, "active")).orderBy(asc(membershipPlans.displayName)),
		db.select().from(membershipPlanVersions).where(eq(membershipPlanVersions.status, "active")),
		db.select().from(paymentProviderConfigurations),
	]);
	const planIds = new Set(plans.map(plan => plan.id));
	const activeVersions = versions.filter(version => planIds.has(version.membershipPlanId));
	const versionIds = activeVersions.map(version => version.id);
	const prices = versionIds.length ? await db.select().from(membershipPrices).where(and(inArray(membershipPrices.membershipPlanVersionId, versionIds), eq(membershipPrices.currency, normalizedCurrency), eq(membershipPrices.status, "active"))) : [];
	const versionById = new Map(activeVersions.map(version => [version.id, version]));
	const currentPrices = prices.filter(price => isPriceEffective(price, now)).filter(price => {
		const version = versionById.get(price.membershipPlanVersionId);
		if (!version) return false;
		return !prices.some(candidate => {
			const candidateVersion = versionById.get(candidate.membershipPlanVersionId);
			if (!candidateVersion || candidate.id === price.id || candidateVersion.membershipPlanId !== version.membershipPlanId || candidate.currency !== price.currency || candidate.billingInterval !== price.billingInterval || !isPriceEffective(candidate, now)) return false;
			const candidateEffectiveAt = candidate.effectiveFrom?.getTime() ?? 0;
			const effectiveAt = price.effectiveFrom?.getTime() ?? 0;
			return candidateEffectiveAt > effectiveAt || (candidateEffectiveAt === effectiveAt && candidate.id > price.id);
		});
	});
	return plans.flatMap(plan => activeVersions.filter(version => version.membershipPlanId === plan.id).flatMap(version => currentPrices.filter(price => price.membershipPlanVersionId === version.id).map(price => {
		const config = price.provider ? configurations.find(item => item.provider === price.provider) : undefined;
		const checkoutState = providerCheckoutState(price.provider, config);
		return {
			plan: { code: plan.code, displayName: plan.displayName, membershipLevel: plan.membershipLevel, description: plan.description },
			version: { id: version.id, versionCode: version.versionCode, featureKeys: version.featureKeys, renewalTerms: version.renewalTerms, cancelAtPeriodEndAllowed: version.cancelAtPeriodEndAllowed },
			price: { id: price.id, amountMinor: price.amountMinor, taxMinor: price.taxMinor, currency: price.currency, billingInterval: price.billingInterval, effectiveFrom: price.effectiveFrom ?? null, effectiveUntil: price.effectiveUntil ?? null },
			checkoutState,
			providerLabel: price.provider ? price.provider : null,
		};
	})));
}

export async function listMembershipOptions(currency = "GMD") {
	return membershipCatalog(currency, false);
}

/** Public catalog exposes only commercial terms and truthful availability labels, never provider credentials, secret configuration, or member financial data. */
export async function listPublicMembershipCatalog(currency = "GMD") { return membershipCatalog(currency, true); }

export async function getMemberBilling(profileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Billing is temporarily unavailable.");
  const [settings, subscriptionsForProfile, transactions] = await Promise.all([
    db.select().from(memberBillingSettings).where(eq(memberBillingSettings.profileId, profileId)).limit(1),
    db.select().from(subscriptions).where(eq(subscriptions.profileId, profileId)).orderBy(desc(subscriptions.createdAt)).limit(20),
    db.select().from(paymentTransactions).where(eq(paymentTransactions.profileId, profileId)).orderBy(desc(paymentTransactions.createdAt)).limit(50),
  ]);
  const transactionIds = transactions.map((transaction: any) => transaction.id);
  const priceIds = transactions.map((transaction: any) => transaction.membershipPriceId).filter((value: unknown): value is number => typeof value === "number");
  const prices = priceIds.length ? await db.select().from(membershipPrices).where(inArray(membershipPrices.id, priceIds)) : [];
  const versionIds = prices.map((price: any) => price.membershipPlanVersionId);
  const versions = versionIds.length ? await db.select().from(membershipPlanVersions).where(inArray(membershipPlanVersions.id, versionIds)) : [];
  const planIds = versions.map((version: any) => version.membershipPlanId);
  const plans = planIds.length ? await db.select().from(membershipPlans).where(inArray(membershipPlans.id, planIds)) : [];
  const refunds = transactionIds.length ? await db.select().from(paymentRefunds).where(inArray(paymentRefunds.paymentTransactionId, transactionIds)).orderBy(desc(paymentRefunds.createdAt)).limit(50) : [];
  const active = subscriptionsForProfile.find((subscription: any) => ["trial", "active", "past_due", "grace_period"].includes(subscription.status)) ?? null;
  const membershipRecord = active ?? subscriptionsForProfile[0] ?? null;
  const pendingCheckout = transactions.find((transaction: any) => ["created", "pending", "processing"].includes(transaction.status)) ?? null;
  return {
	    membership: membershipRecord ? { subscriptionId: membershipRecord.id, level: membershipRecord.plan === "premium" ? "premium" : "free", status: membershipRecord.status, currentPeriodEndsAt: membershipRecord.currentPeriodEndsAt, gracePeriodEndsAt: membershipRecord.gracePeriodEndsAt, cancelAtPeriodEnd: membershipRecord.cancelAtPeriodEnd, autoRenew: membershipRecord.autoRenew, updatedAt: membershipRecord.updatedAt } : { subscriptionId: null, level: "free", status: "not_subscribed", currentPeriodEndsAt: null, gracePeriodEndsAt: null, cancelAtPeriodEnd: false, autoRenew: false, updatedAt: null },
    checkout: pendingCheckout ? { transactionId: pendingCheckout.id, status: pendingCheckout.status, reference: pendingCheckout.internalReference, createdAt: pendingCheckout.createdAt, membershipPriceId: pendingCheckout.membershipPriceId } : null,
    billingSettings: settings[0] ?? { preferredCurrency: "GMD", receiptEmail: null },
    transactions: transactions.map((transaction: any) => {
      const price = prices.find((candidate: any) => candidate.id === transaction.membershipPriceId);
      const version = versions.find((candidate: any) => candidate.id === price?.membershipPlanVersionId);
      const plan = plans.find((candidate: any) => candidate.id === version?.membershipPlanId);
      return { id: transaction.id, ...safeBillingSummary(transaction), planName: plan?.displayName ?? null, planVersion: version?.versionCode ?? null, billingInterval: price?.billingInterval ?? null, taxMinor: transaction.taxMinor, feeMinor: transaction.feeMinor, discountMinor: transaction.discountMinor };
    }),
    refunds: refunds.map((refund: any) => ({ id: refund.id, transactionId: refund.paymentTransactionId, transactionReference: transactions.find((transaction: any) => transaction.id === refund.paymentTransactionId)?.internalReference ?? "Private payment record", amountMinor: refund.amountMinor, status: refund.status, createdAt: refund.createdAt, processedAt: refund.processedAt ?? null })),
  };
}

/** A member-owned internal record, not a tax invoice or a provider-issued receipt. */
export async function getMemberReceipt(profileId: number, transactionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Billing is temporarily unavailable.");
  const [transaction] = await db.select().from(paymentTransactions).where(and(eq(paymentTransactions.id, transactionId), eq(paymentTransactions.profileId, profileId))).limit(1);
  if (!transaction) throw new Error("This payment record is unavailable.");
  const price = transaction.membershipPriceId ? (await db.select().from(membershipPrices).where(eq(membershipPrices.id, transaction.membershipPriceId)).limit(1))[0] : null;
  const version = price ? (await db.select().from(membershipPlanVersions).where(eq(membershipPlanVersions.id, price.membershipPlanVersionId)).limit(1))[0] : null;
  const plan = version ? (await db.select().from(membershipPlans).where(eq(membershipPlans.id, version.membershipPlanId)).limit(1))[0] : null;
  const available = ["successful", "partially_refunded", "refunded"].includes(transaction.status);
  return { available, status: transaction.status, reference: transaction.internalReference, createdAt: transaction.createdAt, completedAt: transaction.completedAt ?? null, amountMinor: transaction.amountMinor, taxMinor: transaction.taxMinor, feeMinor: transaction.feeMinor, discountMinor: transaction.discountMinor, currency: normalizeCurrency(transaction.currency), planName: plan?.displayName ?? "Recorded membership plan", planVersion: version?.versionCode ?? null, billingInterval: price?.billingInterval ?? null, notice: available ? "This internal payment record uses authoritative confirmed transaction data. It is not a tax invoice or a provider-issued receipt." : "A final receipt is unavailable until authoritative payment confirmation. No invoice number or tax claim is generated." };
}

export async function saveMemberBillingSettings(profileId: number, actorUserId: number, input: { preferredCurrency: string; receiptEmail?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Billing is temporarily unavailable.");
  const preferredCurrency = normalizeCurrency(input.preferredCurrency);
  const receiptEmail = input.receiptEmail?.trim() || null;
  await db.insert(memberBillingSettings).values({ profileId, preferredCurrency, receiptEmail }).onDuplicateKeyUpdate({ set: { preferredCurrency, receiptEmail } });
  await createAuditLog(actorUserId, "billing.settings_updated", "member_billing_settings", String(profileId), { preferredCurrency, receiptEmailConfigured: Boolean(receiptEmail) });
  return { preferredCurrency, receiptEmail };
}

/** Creates only a server-side pending transaction. No entitlement exists until a provider result is independently verified. */
export async function initiatePayment(profileId: number, actorUserId: number, input: { membershipPriceId: number; provider: PaymentProviderKey; idempotencyKey: string; acknowledgedTerms: boolean; returnUrl?: string }) {
	if (!input.acknowledgedTerms) throw new Error("Please confirm the plan, price, renewal, and cancellation terms before continuing.");
	const db = await getDb();
	if (!db) throw new Error("Billing is temporarily unavailable.");
	  const existing = await db.select().from(paymentTransactions).where(eq(paymentTransactions.idempotencyKey, input.idempotencyKey)).limit(1);
	  if (existing[0]) {
		if (existing[0].profileId !== profileId) throw new Error("This checkout request key cannot be reused.");
		const configuration = await db.select().from(paymentProviderConfigurations).where(and(eq(paymentProviderConfigurations.provider, existing[0].provider), eq(paymentProviderConfigurations.enabled, true))).limit(1);
		const checkoutState = providerCheckoutState(existing[0].provider, configuration[0]);
			return { transaction: safeBillingSummary(existing[0]), redirectUrl: undefined, providerAvailable: checkoutState === "sandbox" || checkoutState === "live", checkoutState, duplicate: true, message: ["created", "pending", "processing"].includes(existing[0].status) ? "A checkout attempt for this plan is already pending. No duplicate transaction was created; wait for authoritative confirmation or return after its status changes." : "This checkout request has already reached a final state. Review private payment history before starting a new checkout." };
		  }
	  const { price, version, plan } = await activePlanVersion(db, input.membershipPriceId);
  if (plan.membershipLevel !== "premium") throw new Error("This plan is not available for checkout.");
	  if (!price.provider || price.provider !== input.provider) throw new Error("This selected plan does not have the requested payment method available.");
  const providerConfig = await db.select().from(paymentProviderConfigurations).where(and(eq(paymentProviderConfigurations.provider, input.provider), eq(paymentProviderConfigurations.enabled, true))).limit(1);
	  const checkoutState = providerCheckoutState(input.provider, providerConfig[0]);
	  if (checkoutState === "payment_not_configured" || checkoutState === "checkout_unavailable") {
		await createAuditLog(actorUserId, "billing.checkout_unavailable", "membership_price", String(price.id), { provider: input.provider, checkoutState, planVersion: version.versionCode });
		return { transaction: null, redirectUrl: undefined, providerAvailable: false, checkoutState, duplicate: false, message: checkoutState === "payment_not_configured" ? "Payment is not configured for this plan. No charge, transaction, or Premium entitlement was created." : "A payment provider is listed but its secure checkout adapter is unavailable. No charge, transaction, or Premium entitlement was created." };
	  }
  const internalReference = `bnt_${nanoid(20)}`;
  let transactionId = 0;
  try { transactionId = Number((await db.insert(paymentTransactions).values({ profileId, membershipPriceId: price.id, provider: input.provider, internalReference, idempotencyKey: input.idempotencyKey, transactionType: "initial", status: "created", amountMinor: price.amountMinor, currency: price.currency, taxMinor: price.taxMinor }).$returningId())[0]?.id ?? 0); }
  catch (error) {
    const raced = await db.select().from(paymentTransactions).where(eq(paymentTransactions.idempotencyKey, input.idempotencyKey)).limit(1);
    if (raced[0] && raced[0].profileId === profileId) return { transaction: safeBillingSummary(raced[0]), redirectUrl: undefined, providerAvailable: false, checkoutState: "checkout_unavailable" as const, duplicate: true, message: "A concurrent checkout request was already recorded. No duplicate transaction was created." };
    throw error;
  }
  await createAuditLog(actorUserId, "billing.payment_initiated", "payment_transaction", String(transactionId), { provider: input.provider, membershipPriceId: price.id, currency: price.currency, amountMinor: price.amountMinor, planVersion: version.versionCode });
	  const adapter = getPaymentProvider(input.provider);
	  if (!adapter) throw new Error("Secure provider checkout is unavailable. No charge or membership change was created.");
	  const providerResult = await adapter.createPayment({ amountMinor: price.amountMinor, currency: price.currency, internalReference, returnUrl: input.returnUrl });
	  assertPaymentTransition("created", providerResult.status);
	  await db.update(paymentTransactions).set({ providerTransactionId: providerResult.providerTransactionId, status: providerResult.status, failureCode: providerResult.failureCode ?? null, failureMessage: providerResult.failureMessage ?? null }).where(eq(paymentTransactions.id, transactionId));
	  const userId = await profileUser(profileId);
	  if (userId) await createNotification(userId, "billing", "Checkout started", "Your provider-hosted payment step has started. Membership changes only after authoritative payment confirmation.", "/app/billing", `billing-checkout-started:${transactionId}`);
	  return { transaction: { amountMinor: price.amountMinor, currency: price.currency, status: providerResult.status, reference: internalReference, createdAt: new Date(), completedAt: null }, redirectUrl: providerResult.redirectUrl, providerAvailable: true, checkoutState, duplicate: false };
}

async function activateTransaction(db: any, transaction: any, actorUserId: number | null, providerTransactionId?: string, completedAt = new Date()) {
  if (transaction.status === "successful") return { alreadyProcessed: true, subscriptionId: transaction.subscriptionId };
  assertPaymentTransition(transaction.status, "successful");
	  const { price, version, plan } = await historicalPlanVersion(db, transaction.membershipPriceId);
  const existing = await db.select().from(subscriptions).where(and(eq(subscriptions.profileId, transaction.profileId), eq(subscriptions.membershipPlanVersionId, version.id), inArray(subscriptions.status, ["active", "trial", "past_due", "grace_period"]))).limit(1);
  const periodEnd = new Date(completedAt.getTime() + intervalMilliseconds(price.billingInterval));
  const subscriptionId = existing[0]?.id ?? Number((await db.insert(subscriptions).values({ profileId: transaction.profileId, membershipPlanVersionId: version.id, plan: plan.membershipLevel === "premium" ? "premium" : "free", status: "active", provider: transaction.provider, startsAt: completedAt, endsAt: periodEnd, currentPeriodStartsAt: completedAt, currentPeriodEndsAt: periodEnd, autoRenew: true }).$returningId())[0]?.id ?? 0);
  if (existing[0]) await db.update(subscriptions).set({ status: "active", currentPeriodStartsAt: completedAt, currentPeriodEndsAt: periodEnd, endsAt: periodEnd, gracePeriodEndsAt: null, autoRenew: true, cancelAtPeriodEnd: false }).where(eq(subscriptions.id, subscriptionId));
  const featureKeys = Array.isArray(version.featureKeys) ? version.featureKeys.filter((value: unknown): value is EntitlementKey => typeof value === "string" && ["advanced_discovery", "expanded_discovery_controls", "profile_visibility_controls", "enhanced_recommendation_controls", "profile_management_convenience"].includes(value)) : [];
  for (const entitlementKey of featureKeys) await db.insert(subscriptionEntitlements).values({ subscriptionId, entitlementKey, status: "active", startsAt: completedAt, endsAt: periodEnd }).onDuplicateKeyUpdate({ set: { status: "active", startsAt: completedAt, endsAt: periodEnd, revokedAt: null } });
  await db.update(paymentTransactions).set({ subscriptionId, providerTransactionId: providerTransactionId ?? transaction.providerTransactionId, status: "successful", completedAt, providerVerifiedAt: completedAt, failureCode: null, failureMessage: null }).where(eq(paymentTransactions.id, transaction.id));
  const userId = transaction.profileId ? await profileUser(transaction.profileId) : null;
  if (userId) await createNotification(userId, "billing", "Premium membership activated", "Your payment was confirmed securely and your available membership conveniences are now active. Safety, privacy, matching, and consent rules are unchanged.", "/app/billing", `billing-activated:${transaction.id}`);
  await createAuditLog(actorUserId, "billing.payment_confirmed", "payment_transaction", String(transaction.id), { subscriptionId, provider: transaction.provider, currency: transaction.currency, amountMinor: transaction.amountMinor });
  await createAuditLog(actorUserId, "billing.entitlements_granted", "subscription", String(subscriptionId), { entitlementCount: featureKeys.length, planVersion: version.versionCode });
  return { alreadyProcessed: false, subscriptionId };
}

/** A redirect is never authoritative: a configured provider adapter must independently verify a reference first. */
export async function verifyPaymentServerSide(actorUserId: number | null, transactionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Billing is temporarily unavailable.");
  const transaction = await db.select().from(paymentTransactions).where(eq(paymentTransactions.id, transactionId)).limit(1);
  if (!transaction[0]) throw new Error("Payment transaction not found.");
  if (transaction[0].status === "successful") return activateTransaction(db, transaction[0], actorUserId);
  if (!transaction[0].providerTransactionId) throw new Error("This payment has not been confirmed by a provider.");
  const provider = requireConfiguredProvider(transaction[0].provider);
  const result = await provider.verifyPayment({ providerTransactionId: transaction[0].providerTransactionId });
  if (result.status !== "successful") return markPaymentTerminal(db, transaction[0], result.status === "cancelled" || result.status === "expired" ? result.status : "failed", result.failureCode, result.failureMessage, actorUserId);
  return activateTransaction(db, transaction[0], actorUserId, result.providerTransactionId, result.completedAt ?? new Date());
}

async function markPaymentTerminal(db: any, transaction: any, nextStatus: "failed" | "cancelled" | "expired", failureCode?: string, failureMessage?: string, actorUserId: number | null = null) {
  if (!["created", "pending", "processing"].includes(transaction.status)) return { status: transaction.status };
  assertPaymentTransition(transaction.status, nextStatus);
  await db.update(paymentTransactions).set({ status: nextStatus, failureCode: failureCode ?? null, failureMessage: failureMessage ?? (nextStatus === "failed" ? safePaymentFailureMessage() : null) }).where(eq(paymentTransactions.id, transaction.id));
  if (nextStatus === "failed" && transaction.subscriptionId) {
    const subscription = await db.select().from(subscriptions).where(eq(subscriptions.id, transaction.subscriptionId)).limit(1);
    if (subscription[0]) {
      const version = subscription[0].membershipPlanVersionId ? await db.select().from(membershipPlanVersions).where(eq(membershipPlanVersions.id, subscription[0].membershipPlanVersionId)).limit(1) : [];
      const next = subscriptionStatusAfterPaymentFailure(new Date(), version[0]?.gracePeriodDays ?? 0);
      await db.update(subscriptions).set({ status: next.status, gracePeriodEndsAt: next.gracePeriodEndsAt }).where(eq(subscriptions.id, subscription[0].id));
    }
  }
  const userId = transaction.profileId ? await profileUser(transaction.profileId) : null;
  if (userId) await createNotification(userId, "billing", nextStatus === "failed" ? "Payment needs attention" : nextStatus === "cancelled" ? "Checkout cancelled" : "Checkout expired", nextStatus === "failed" ? safePaymentFailureMessage() : "No payment was confirmed and your membership has not changed. Review current plan availability before trying again.", "/app/billing", `billing-payment-${nextStatus}:${transaction.id}`);
  await createAuditLog(actorUserId, `billing.payment_${nextStatus}`, "payment_transaction", String(transaction.id), { provider: transaction.provider, failureCode: failureCode ?? null });
  return { status: nextStatus };
}

export async function processProviderWebhook(input: { provider: string; rawPayload: string; signature?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Billing is temporarily unavailable.");
  const provider = requireConfiguredProvider(input.provider);
  const event = await provider.verifyWebhook({ rawPayload: input.rawPayload, signature: input.signature });
  const existing = await db.select().from(paymentWebhookEvents).where(and(eq(paymentWebhookEvents.provider, input.provider), eq(paymentWebhookEvents.providerEventId, event.providerEventId))).limit(1);
  if (existing[0]) return { duplicate: true, processed: existing[0].status === "processed" };
  if (!event.valid) {
    await db.insert(paymentWebhookEvents).values({ provider: input.provider, providerEventId: event.providerEventId, eventType: event.eventType, payloadHash: event.payloadHash || payloadHash(input.rawPayload), signatureValid: false, status: "rejected" });
    await createAuditLog(null, "billing.webhook_rejected", "payment_webhook", event.providerEventId, { provider: input.provider, eventType: event.eventType });
    throw new Error("Payment webhook signature could not be verified.");
  }
  const transaction = event.providerTransactionId ? await db.select().from(paymentTransactions).where(and(eq(paymentTransactions.provider, input.provider), eq(paymentTransactions.providerTransactionId, event.providerTransactionId))).limit(1) : [];
	  let webhookId = 0;
	  try {
		const inserted = await db.insert(paymentWebhookEvents).values({ provider: input.provider, providerEventId: event.providerEventId, eventType: event.eventType, payloadHash: event.payloadHash || payloadHash(input.rawPayload), signatureValid: true, status: "verified", paymentTransactionId: transaction[0]?.id ?? null }).$returningId();
		webhookId = Number(inserted[0]?.id ?? 0);
	  } catch (error) {
		const raced = await db.select().from(paymentWebhookEvents).where(and(eq(paymentWebhookEvents.provider, input.provider), eq(paymentWebhookEvents.providerEventId, event.providerEventId))).limit(1);
		if (raced[0]) return { duplicate: true, processed: raced[0].status === "processed" };
		throw error;
	  }
  if (!transaction[0] || !event.status) { await db.update(paymentWebhookEvents).set({ status: "failed" }).where(eq(paymentWebhookEvents.id, webhookId)); return { duplicate: false, processed: false, reason: "transaction_not_found" }; }
  if (event.status === "successful") await activateTransaction(db, transaction[0], null, event.providerTransactionId, event.completedAt ?? new Date());
  else if (event.status === "failed" || event.status === "cancelled" || event.status === "expired") await markPaymentTerminal(db, transaction[0], event.status, undefined, undefined, null);
  await db.update(paymentWebhookEvents).set({ status: "processed", processedAt: new Date() }).where(eq(paymentWebhookEvents.id, webhookId));
  await createAuditLog(null, "billing.webhook_processed", "payment_webhook", event.providerEventId, { provider: input.provider, transactionId: transaction[0].id, status: event.status });
  return { duplicate: false, processed: true };
}

export async function hasEntitlement(profileId: number, entitlementKey: EntitlementKey, now = new Date()) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ entitlementStatus: subscriptionEntitlements.status, startsAt: subscriptionEntitlements.startsAt, endsAt: subscriptionEntitlements.endsAt, subscriptionStatus: subscriptions.status, graceEntitlementsActive: membershipPlanVersions.graceEntitlementsActive }).from(subscriptionEntitlements).innerJoin(subscriptions, eq(subscriptionEntitlements.subscriptionId, subscriptions.id)).innerJoin(membershipPlanVersions, eq(subscriptions.membershipPlanVersionId, membershipPlanVersions.id)).where(and(eq(subscriptions.profileId, profileId), eq(subscriptionEntitlements.entitlementKey, entitlementKey)));
  return rows.some((row: any) => entitlementIsActive({ subscriptionStatus: row.subscriptionStatus, entitlementStatus: row.entitlementStatus, startsAt: row.startsAt, endsAt: row.endsAt, graceEntitlementsActive: row.graceEntitlementsActive, now }));
}

export async function cancelSubscriptionRenewal(profileId: number, actorUserId: number, subscriptionId: number, expectedUpdatedAt?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Billing is temporarily unavailable.");

  const result = await db.transaction(async tx => {
    const record = await tx.select().from(subscriptions).where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.profileId, profileId))).for("update");
	    if (!record[0]) throw new Error("Subscription not found.");
	    if (!["active", "trial", "past_due", "grace_period"].includes(record[0].status)) throw new Error("This subscription is not eligible for renewal cancellation.");
		if (expectedUpdatedAt && record[0].updatedAt.getTime() !== expectedUpdatedAt.getTime()) throw new Error("This membership changed in another session. Refresh billing before trying again.");
	    if (record[0].cancelAtPeriodEnd) return { alreadyCancelled: true, currentPeriodEndsAt: record[0].currentPeriodEndsAt };
	    const updated = await tx.update(subscriptions).set({ cancelAtPeriodEnd: true, autoRenew: false, cancelledAt: new Date() }).where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.updatedAt, record[0].updatedAt), eq(subscriptions.cancelAtPeriodEnd, false)));
		const summary = Array.isArray(updated) ? updated[0] : updated;
		if (typeof (summary as { affectedRows?: unknown } | undefined)?.affectedRows === "number" && (summary as { affectedRows: number }).affectedRows === 0) throw new Error("This membership changed in another session. Refresh billing before trying again.");
    return { alreadyCancelled: false, currentPeriodEndsAt: record[0].currentPeriodEndsAt };
  });

  if (result.alreadyCancelled) return result;
	  const userId = await profileUser(profileId);
	  if (userId) await createNotification(userId, "billing", "Renewal cancelled", "Your membership will remain available until the current period ends. Your profile, safety protections, and account data are unchanged.", "/app/billing", `billing-renewal-cancelled:${subscriptionId}`);
  await createAuditLog(actorUserId, "billing.renewal_cancelled", "subscription", String(subscriptionId), { cancelAtPeriodEnd: true });
  return { cancelAtPeriodEnd: true, currentPeriodEndsAt: result.currentPeriodEndsAt, alreadyCancelled: false };
}

export async function expireDueSubscriptions(now = new Date()) {
  const db = await getDb();
  if (!db) return { expired: 0 };
	  const due = await db.select().from(subscriptions).where(or(and(eq(subscriptions.status, "grace_period"), lte(subscriptions.gracePeriodEndsAt, now)), and(eq(subscriptions.cancelAtPeriodEnd, true), lte(subscriptions.currentPeriodEndsAt, now)), and(eq(subscriptions.status, "past_due"), lte(subscriptions.currentPeriodEndsAt, now))));
  for (const subscription of due) {
    await db.update(subscriptions).set({ status: "expired", endedAt: now }).where(eq(subscriptions.id, subscription.id));
    await db.update(subscriptionEntitlements).set({ status: "expired", revokedAt: now }).where(and(eq(subscriptionEntitlements.subscriptionId, subscription.id), eq(subscriptionEntitlements.status, "active")));
    const userId = subscription.profileId ? await profileUser(subscription.profileId) : null;
	    if (userId) await createNotification(userId, "billing", "Membership conveniences ended", "Your membership conveniences have ended. Your profile, safety protections, and existing account data remain available under the usual rules.", "/app/billing", `billing-expired:${subscription.id}`);
    await createAuditLog(null, "billing.subscription_expired", "subscription", String(subscription.id), {});
  }
  return { expired: due.length };
}

export async function requestRefund(actorUserId: number, transactionId: number, amountMinor: number, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Billing is temporarily unavailable.");
  const transaction = await db.select().from(paymentTransactions).where(eq(paymentTransactions.id, transactionId)).limit(1);
  if (!transaction[0] || !["successful", "partially_refunded"].includes(transaction[0].status)) throw new Error("Only confirmed payments can enter the refund workflow.");
  if (!Number.isInteger(amountMinor) || amountMinor <= 0 || amountMinor > transaction[0].amountMinor) throw new Error("Refund amount must be within the confirmed payment amount.");
  const refunded = await db.select({ amountMinor: paymentRefunds.amountMinor, status: paymentRefunds.status }).from(paymentRefunds).where(eq(paymentRefunds.paymentTransactionId, transactionId));
  const alreadyRefunded = refunded.filter((row: any) => ["requested", "processing", "succeeded"].includes(row.status)).reduce((sum: number, row: any) => sum + row.amountMinor, 0);
  if (alreadyRefunded + amountMinor > transaction[0].amountMinor) throw new Error("Refunds cannot exceed the confirmed payment amount.");
  const inserted = await db.insert(paymentRefunds).values({ paymentTransactionId: transactionId, amountMinor, reason: reason?.trim() || null, requestedByUserId: actorUserId, status: "requested" }).$returningId();
  const refundId = Number(inserted[0]?.id ?? 0);
  const userId = transaction[0].profileId ? await profileUser(transaction[0].profileId) : null;
  if (userId) await createNotification(userId, "billing", "Refund request received", "A refund request is recorded for provider review. Your membership conveniences and account protections have not changed while the request is pending.", "/app/billing", `billing-refund-requested:${refundId}`);
  await createAuditLog(actorUserId, "billing.refund_requested", "payment_refund", String(refundId), { transactionId, amountMinor });
  return { refundId, status: "requested" as const };
}

/** Records a member-owned request only. It never moves money, changes a transaction result, or alters membership/entitlements. */
export async function requestMemberRefund(profileId: number, actorUserId: number, transactionId: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Billing is temporarily unavailable.");
  const normalizedReason = reason.trim();
  if (normalizedReason.length < 10) throw new Error("Please provide a short reason so the finance team can review your request.");
  const result = await db.transaction(async tx => {
    const transactions = await tx.select().from(paymentTransactions).where(and(eq(paymentTransactions.id, transactionId), eq(paymentTransactions.profileId, profileId))).for("update");
    const transaction = transactions[0];
    if (!transaction || !["successful", "partially_refunded"].includes(transaction.status)) throw new Error("Only a confirmed payment on your account can be requested for refund review.");
	    const existing = await tx.select({ amountMinor: paymentRefunds.amountMinor, status: paymentRefunds.status }).from(paymentRefunds).where(eq(paymentRefunds.paymentTransactionId, transactionId)).for("update");
	    if (existing.some((refund: any) => ["requested", "processing"].includes(refund.status))) throw new Error("A refund request for this payment is already under review.");
    const committedAmount = existing.filter((refund: any) => refund.status === "succeeded").reduce((sum: number, refund: any) => sum + refund.amountMinor, 0);
    const remainingAmount = transaction.amountMinor - committedAmount;
    if (remainingAmount <= 0) throw new Error("This payment has no remaining amount eligible for a refund request.");
    const inserted = await tx.insert(paymentRefunds).values({ paymentTransactionId: transactionId, amountMinor: remainingAmount, reason: normalizedReason, requestedByUserId: actorUserId, status: "requested" }).$returningId();
    return { refundId: Number(inserted[0]?.id ?? 0), amountMinor: remainingAmount };
  });
  await createNotification(actorUserId, "billing", "Refund request received", "Your request is awaiting scoped finance review. No money has moved and your membership conveniences and protections are unchanged.", "/app/billing", `member-refund-request:${result.refundId}`);
  await createAuditLog(actorUserId, "billing.member_refund_requested", "payment_refund", String(result.refundId), { transactionId, amountMinor: result.amountMinor });
	  return { ...result, status: "requested" as const };
}

export async function listRefundRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: paymentRefunds.id, transactionId: paymentRefunds.paymentTransactionId, transactionReference: paymentTransactions.internalReference, amountMinor: paymentRefunds.amountMinor, currency: paymentTransactions.currency, status: paymentRefunds.status, reason: paymentRefunds.reason, createdAt: paymentRefunds.createdAt, processedAt: paymentRefunds.processedAt }).from(paymentRefunds).innerJoin(paymentTransactions, eq(paymentTransactions.id, paymentRefunds.paymentTransactionId)).orderBy(asc(paymentRefunds.createdAt)).limit(100);
}

/** A finance decision prepares or closes a provider-bound request; it never sends funds or fabricates provider confirmation. */
export async function reviewRefundRequest(actorUserId: number, refundId: number, decision: "approve_for_provider" | "reject") {
  const db = await getDb();
  if (!db) throw new Error("Billing is temporarily unavailable.");
  const nextStatus = decision === "approve_for_provider" ? "processing" : "cancelled" as const;
  const transactionId = await db.transaction(async tx => {
    const refund = await tx.select().from(paymentRefunds).where(eq(paymentRefunds.id, refundId)).for("update");
    if (!refund[0] || refund[0].status !== "requested") throw new Error("This refund request is not awaiting finance review.");
    await tx.update(paymentRefunds).set({ status: nextStatus, processedAt: new Date() }).where(eq(paymentRefunds.id, refundId));
    return refund[0].paymentTransactionId;
  });
  const transaction = await db.select({ profileId: paymentTransactions.profileId }).from(paymentTransactions).where(eq(paymentTransactions.id, transactionId)).limit(1);
  const memberUserId = transaction[0]?.profileId ? await profileUser(transaction[0].profileId) : null;
  if (memberUserId) await createNotification(memberUserId, "billing", decision === "approve_for_provider" ? "Refund request prepared for provider review" : "Refund request review completed", decision === "approve_for_provider" ? "Finance prepared your request for a configured provider workflow. No refund is complete until provider confirmation is recorded." : "Finance could not approve this request for provider processing. No money moved and your membership protections are unchanged.", "/app/billing", `member-refund-review:${refundId}:${decision}`);
  await createAuditLog(actorUserId, "billing.refund_reviewed", "payment_refund", String(refundId), { decision, providerMovement: false });
  return { refundId, status: nextStatus };
}

export async function listFinanceTransactions() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: paymentTransactions.id, provider: paymentTransactions.provider, internalReference: paymentTransactions.internalReference, status: paymentTransactions.status, amountMinor: paymentTransactions.amountMinor, currency: paymentTransactions.currency, createdAt: paymentTransactions.createdAt, completedAt: paymentTransactions.completedAt, profileId: paymentTransactions.profileId, providerTransactionId: paymentTransactions.providerTransactionId }).from(paymentTransactions).orderBy(desc(paymentTransactions.createdAt)).limit(100);
}

export async function listReconciliationQueue() {
  const db = await getDb();
  if (!db) return [];
	  return db.select().from(paymentReconciliations).where(inArray(paymentReconciliations.status, ["open", "needs_review"])).orderBy(asc(paymentReconciliations.createdAt)).limit(100);
}

/** Scans only for internal consistency gaps and creates finance-review records. It never changes payment, subscription, refund, or entitlement state. */
export async function scanPaymentReconciliation(actorUserId: number) {
	const db = await getDb();
	if (!db) throw new Error("Billing is temporarily unavailable.");
	const [transactions, records, refunds] = await Promise.all([
		db.select().from(paymentTransactions).orderBy(desc(paymentTransactions.createdAt)).limit(500),
		db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt)).limit(500),
		db.select().from(paymentRefunds).orderBy(desc(paymentRefunds.createdAt)).limit(500),
	]);
	let findings = 0;
	const recordTransactionIssue = async (transactionId: number, issueCode: string, note: string) => {
		await db.insert(paymentReconciliations).values({ paymentTransactionId: transactionId, issueCode, status: "needs_review", note }).onDuplicateKeyUpdate({ set: { status: "needs_review", note } });
		findings += 1;
	};
	const recordSubscriptionIssue = async (subscriptionId: number, issueCode: string, note: string) => {
		await db.insert(paymentReconciliations).values({ subscriptionId, issueCode, status: "needs_review", note }).onDuplicateKeyUpdate({ set: { status: "needs_review", note } });
		findings += 1;
	};
	for (const transaction of transactions) {
		if (transaction.status === "successful" && !transaction.subscriptionId) await recordTransactionIssue(transaction.id, "payment_without_subscription", "Confirmed payment has no linked subscription.");
		if (["created", "pending", "processing"].includes(transaction.status)) await recordTransactionIssue(transaction.id, "pending_provider_confirmation", "Payment remains pending provider confirmation.");
	}
	for (const subscription of records) {
		if (!["active", "trial", "past_due", "grace_period"].includes(subscription.status)) continue;
		const confirmed = transactions.some(transaction => transaction.subscriptionId === subscription.id && transaction.status === "successful");
		if (!confirmed) await recordSubscriptionIssue(subscription.id, "subscription_without_confirmed_payment", "Subscription is active without a linked confirmed payment.");
	}
	for (const refund of refunds) if (refund.status === "processing") await recordTransactionIssue(refund.paymentTransactionId, "refund_awaiting_provider", "Approved refund is awaiting independent provider confirmation.");
	await createAuditLog(actorUserId, "billing.reconciliation_scanned", "payment_reconciliation", undefined, { findings, transactionCount: transactions.length, subscriptionCount: records.length });
	return { findings };
}

export async function listBillingConfiguration() {
  const db = await getDb();
  if (!db) return { plans: [], providers: [] };
  const [plans, versions, prices, providers] = await Promise.all([db.select().from(membershipPlans).orderBy(asc(membershipPlans.code)), db.select().from(membershipPlanVersions).orderBy(desc(membershipPlanVersions.createdAt)), db.select().from(membershipPrices).orderBy(desc(membershipPrices.createdAt)), db.select().from(paymentProviderConfigurations).orderBy(asc(paymentProviderConfigurations.provider))]);
  return { plans: plans.map((plan: any) => ({ ...plan, versions: versions.filter((version: any) => version.membershipPlanId === plan.id).map((version: any) => ({ ...version, prices: prices.filter((price: any) => price.membershipPlanVersionId === version.id) })) })), providers };
}

/** Finance-scoped configuration creates a new version and price rather than silently rewriting historical member terms. */
export async function saveBillingPlanConfiguration(actorUserId: number, input: { planCode: string; displayName: string; description?: string; versionCode: string; featureKeys: EntitlementKey[]; renewalTerms?: string; gracePeriodDays: number; graceEntitlementsActive: boolean; cancelAtPeriodEndAllowed: boolean; currency: string; amountMinor: number; taxMinor: number; billingInterval: "monthly" | "quarterly" | "annual" | "one_time"; provider?: string | null; providerPriceReference?: string | null; effectiveFrom?: Date | null; effectiveUntil?: Date | null; activate: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Billing is temporarily unavailable.");
  if (!input.planCode.trim() || !input.versionCode.trim() || !input.displayName.trim()) throw new Error("Plan, version, and display names are required.");
  if (!Number.isInteger(input.amountMinor) || input.amountMinor < 0 || !Number.isInteger(input.taxMinor) || input.taxMinor < 0) throw new Error("Price amounts must be non-negative minor units.");
	  if (input.effectiveFrom && input.effectiveUntil && input.effectiveUntil <= input.effectiveFrom) throw new Error("A price end date must be after its effective start date.");
  const code = input.planCode.trim().toLowerCase();
  const existingPlan = await db.select().from(membershipPlans).where(eq(membershipPlans.code, code)).limit(1);
  const planId = existingPlan[0]?.id ?? Number((await db.insert(membershipPlans).values({ code, displayName: input.displayName.trim(), membershipLevel: "premium", status: input.activate ? "active" : "draft", description: input.description?.trim() || null }).$returningId())[0]?.id ?? 0);
  if (existingPlan[0]) await db.update(membershipPlans).set({ displayName: input.displayName.trim(), description: input.description?.trim() || null, status: input.activate ? "active" : existingPlan[0].status }).where(eq(membershipPlans.id, planId));
  const existingVersion = await db.select().from(membershipPlanVersions).where(eq(membershipPlanVersions.versionCode, input.versionCode.trim())).limit(1);
  if (existingVersion[0]) throw new Error("A plan version with this code already exists. Create a new version code instead of changing historical terms.");
  const versionId = Number((await db.insert(membershipPlanVersions).values({ membershipPlanId: planId, versionCode: input.versionCode.trim(), status: input.activate ? "active" : "draft", featureKeys: input.featureKeys, renewalTerms: input.renewalTerms?.trim() || null, gracePeriodDays: input.gracePeriodDays, graceEntitlementsActive: input.graceEntitlementsActive, cancelAtPeriodEndAllowed: input.cancelAtPeriodEndAllowed, createdByUserId: actorUserId, activatedAt: input.activate ? new Date() : null }).$returningId())[0]?.id ?? 0);
	  await db.insert(membershipPrices).values({ membershipPlanVersionId: versionId, currency: normalizeCurrency(input.currency), amountMinor: input.amountMinor, taxMinor: input.taxMinor, billingInterval: input.billingInterval, provider: input.provider?.trim() || null, providerPriceReference: input.providerPriceReference?.trim() || null, status: input.activate ? "active" : "archived", effectiveFrom: input.effectiveFrom ?? null, effectiveUntil: input.effectiveUntil ?? null });
  await createAuditLog(actorUserId, "billing.plan_version_created", "membership_plan_version", String(versionId), { planCode: code, versionCode: input.versionCode.trim(), currency: normalizeCurrency(input.currency), amountMinor: input.amountMinor, billingInterval: input.billingInterval, activate: input.activate });
  return { planId, versionId };
}

/** Availability metadata intentionally excludes provider credentials and webhook secrets. */
export async function savePaymentProviderAvailability(actorUserId: number, input: { provider: string; enabled: boolean; environment: "not_configured" | "sandbox" | "live"; supportedCurrencies: string[]; supportedMethods: string[]; configurationNote?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Billing is temporarily unavailable.");
  const provider = input.provider.trim().toLowerCase();
  if (!provider) throw new Error("Provider name is required.");
  const supportedCurrencies = Array.from(new Set(input.supportedCurrencies.map(normalizeCurrency)));
  const supportedMethods = input.supportedMethods.map(method => method.trim()).filter(Boolean);
	  const enabled = input.enabled && input.environment !== "not_configured";
	  await db.insert(paymentProviderConfigurations).values({ provider, enabled, environment: input.environment, supportedCurrencies, supportedMethods, configurationNote: input.configurationNote?.trim() || null, updatedByUserId: actorUserId }).onDuplicateKeyUpdate({ set: { enabled, environment: input.environment, supportedCurrencies, supportedMethods, configurationNote: input.configurationNote?.trim() || null, updatedByUserId: actorUserId } });
	  await createAuditLog(actorUserId, "billing.provider_availability_updated", "payment_provider_configuration", provider, { enabled, environment: input.environment, supportedCurrencies, methodCount: supportedMethods.length });
	  return { provider, enabled, environment: input.environment, supportedCurrencies };
}

/** Account closure stops renewal and detaches future product access while intentionally preserving necessary transaction evidence. */
export async function handleBillingAccountClosure(profileId: number, actorUserId: number | null) {
  const db = await getDb();
  if (!db) return { subscriptionsCancelled: 0 };
  const active = await db.select().from(subscriptions).where(and(eq(subscriptions.profileId, profileId), inArray(subscriptions.status, ["trial", "active", "past_due", "grace_period"])));
  for (const subscription of active) await db.update(subscriptions).set({ autoRenew: false, cancelAtPeriodEnd: true, cancelledAt: new Date() }).where(eq(subscriptions.id, subscription.id));
  await createAuditLog(actorUserId, "billing.account_closure_handled", "member_profile", String(profileId), { subscriptionsCancelled: active.length });
  return { subscriptionsCancelled: active.length };
}

function intervalMilliseconds(interval: "monthly" | "quarterly" | "annual" | "one_time") { return ({ monthly: 30, quarterly: 91, annual: 365, one_time: 0 } as Record<string, number>)[interval] * 86_400_000; }
