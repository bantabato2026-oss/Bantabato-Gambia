import { describe, expect, it } from "vitest";
import { availableProviderKeys, constantTimeSignatureEquals, getPaymentProvider, payloadHash, registerPaymentProvider, requireConfiguredProvider, type PaymentProvider } from "./paymentProvider";

describe("Phase 8 payment provider boundary", () => {
  it("starts without a live payment provider and rejects an unconfigured provider", () => {
    expect(getPaymentProvider("provider-not-configured")).toBeNull();
    expect(() => requireConfiguredProvider("provider-not-configured")).toThrow("not configured");
  });

  it("registers provider adapters behind a named boundary instead of coupling payment logic to a vendor", async () => {
    const provider: PaymentProvider = { key: "test-provider", createPayment: async () => ({ providerTransactionId: "tx_1", status: "pending" }), verifyPayment: async () => ({ providerTransactionId: "tx_1", status: "successful" }), verifyWebhook: async () => ({ providerEventId: "evt_1", eventType: "payment", valid: true, payloadHash: "hash" }) };
    registerPaymentProvider(provider);
    expect(requireConfiguredProvider("test-provider")).toBe(provider);
    expect(availableProviderKeys()).toContain("test-provider");
  });

  it("compares adapter-provided signature material in constant time and rejects missing or mismatched material", () => {
    expect(constantTimeSignatureEquals("same", "same")).toBe(true);
    expect(constantTimeSignatureEquals("other", "same")).toBe(false);
    expect(constantTimeSignatureEquals(undefined, "same")).toBe(false);
  });

  it("records only a deterministic payload hash at the common boundary", () => {
    expect(payloadHash('{"event":"paid"}')).toHaveLength(64);
    expect(payloadHash('{"event":"paid"}')).not.toBe(payloadHash('{"event":"failed"}'));
  });
});
