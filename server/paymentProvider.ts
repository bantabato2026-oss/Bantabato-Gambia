import { createHash, timingSafeEqual } from "node:crypto";
import type { PaymentStatus } from "./domain/paymentPolicy";

export type NormalizedProviderPayment = { providerTransactionId: string; status: PaymentStatus; redirectUrl?: string; providerCustomerReference?: string; completedAt?: Date; failureCode?: string; failureMessage?: string };
export type NormalizedWebhook = { providerEventId: string; eventType: string; providerTransactionId?: string; status?: PaymentStatus; completedAt?: Date; valid: boolean; payloadHash: string };

export interface PaymentProvider {
  readonly key: string;
  createPayment(input: { amountMinor: number; currency: string; internalReference: string; returnUrl?: string }): Promise<NormalizedProviderPayment>;
  verifyPayment(input: { providerTransactionId: string }): Promise<NormalizedProviderPayment>;
  verifyWebhook(input: { rawPayload: string; signature?: string }): Promise<NormalizedWebhook>;
  refundPayment?(input: { providerTransactionId: string; amountMinor: number; reason?: string }): Promise<{ providerRefundReference: string; status: "requested" | "processing" | "succeeded" | "failed" }>;
  cancelSubscription?(input: { providerSubscriptionReference: string }): Promise<{ cancelled: boolean }>;
  getTransaction?(input: { providerTransactionId: string }): Promise<NormalizedProviderPayment>;
}

const providers = new Map<string, PaymentProvider>();
export function registerPaymentProvider(provider: PaymentProvider) { providers.set(provider.key, provider); }
export function getPaymentProvider(key: string) { return providers.get(key) ?? null; }
export function availableProviderKeys() { return Array.from(providers.keys()); }

/** Use provider-specific secret verification in a configured adapter. This helper only provides constant-time comparison for adapter implementations. */
export function constantTimeSignatureEquals(received: string | undefined, expected: string) {
  if (!received) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function payloadHash(rawPayload: string) { return createHash("sha256").update(rawPayload).digest("hex"); }

/** Phase 8 intentionally registers no live provider. A provider must be explicitly configured with secure server-side credentials in a later integration. */
export function requireConfiguredProvider(key: string) {
  const provider = getPaymentProvider(key);
  if (!provider) throw new Error("This payment provider is not configured for live transactions.");
  return provider;
}
