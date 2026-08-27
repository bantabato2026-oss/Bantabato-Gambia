import { describe, expect, it, vi } from "vitest";
import { FREE_LAUNCH_CHECKOUT_NOTICE, getCommercialMode, isFreeLaunch } from "./commercialMode";

describe("Free Launch commercial mode", () => {
  it("fails safe to FREE_LAUNCH when no paid-mode configuration is present", () => {
    const previous = process.env.BANTABATO_COMMERCIAL_MODE;
    delete process.env.BANTABATO_COMMERCIAL_MODE;
    expect(getCommercialMode()).toBe("FREE_LAUNCH");
    expect(isFreeLaunch()).toBe(true);
    if (previous === undefined) delete process.env.BANTABATO_COMMERCIAL_MODE;
    else process.env.BANTABATO_COMMERCIAL_MODE = previous;
  });

  it("recognizes FUTURE_PAID only when explicitly configured", () => {
    const previous = process.env.BANTABATO_COMMERCIAL_MODE;
    process.env.BANTABATO_COMMERCIAL_MODE = "FUTURE_PAID";
    expect(getCommercialMode()).toBe("FUTURE_PAID");
    expect(isFreeLaunch()).toBe(false);
    if (previous === undefined) delete process.env.BANTABATO_COMMERCIAL_MODE;
    else process.env.BANTABATO_COMMERCIAL_MODE = previous;
  });

  it("keeps unknown configuration values fail-closed", () => {
    const previous = process.env.BANTABATO_COMMERCIAL_MODE;
    process.env.BANTABATO_COMMERCIAL_MODE = "UNSAFE_INPUT";
    expect(getCommercialMode()).toBe("FREE_LAUNCH");
    expect(FREE_LAUNCH_CHECKOUT_NOTICE).toContain("No checkout");
    if (previous === undefined) delete process.env.BANTABATO_COMMERCIAL_MODE;
    else process.env.BANTABATO_COMMERCIAL_MODE = previous;
  });
});

describe("Free Launch billing boundaries", () => {
  it("does not access the database when checkout is requested during Free Launch", async () => {
    const db = await import("./db");
    const getDbSpy = vi.spyOn(db, "getDb");
    const { initiatePayment } = await import("./billingService");
    await expect(initiatePayment(1, 1, { membershipPriceId: 1, provider: "paystack", idempotencyKey: "free-launch-checkout-001", acknowledgedTerms: true })).rejects.toThrow("currently free");
    expect(getDbSpy).not.toHaveBeenCalled();
    getDbSpy.mockRestore();
  });
});
