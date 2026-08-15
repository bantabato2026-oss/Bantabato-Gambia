import { describe, expect, it, vi } from "vitest";
import { FixedWindowRateLimiter, applyNoStoreForApi, applySecurityHeaders, rateRuleForOperations, trpcOperationsFromUrl } from "./security";
import { isPublicStorageKey } from "./_core/storageProxy";

function responseRecorder() {
  const headers = new Map<string, string>();
  return {
    setHeader: vi.fn((key: string, value: string) => headers.set(key, value)),
    headers,
  } as any;
}

describe("Phase 14 transport and abuse controls", () => {
  it("uses the strictest sensitive rate rule for a batched tRPC request", () => {
    const operations = trpcOperationsFromUrl("/api/trpc/messaging.sendText,uploads.uploadIdentityDocument?batch=1");
    expect(operations).toEqual(["messaging.sendText", "uploads.uploadIdentityDocument"]);
    expect(rateRuleForOperations(operations)).toMatchObject({ key: "identity-upload", maxRequests: 4, windowMs: 60 * 60_000 });
  });

  it("rejects requests once the fixed-window threshold is exceeded", () => {
    const limiter = new FixedWindowRateLimiter();
    const rule = { key: "test", maxRequests: 2, windowMs: 1_000 };
    expect(limiter.consume("203.0.113.1", rule, 1).allowed).toBe(true);
    expect(limiter.consume("203.0.113.1", rule, 2).allowed).toBe(true);
    expect(limiter.consume("203.0.113.1", rule, 3).allowed).toBe(false);
    expect(limiter.consume("203.0.113.1", rule, 1_001).allowed).toBe(true);
  });

  it("applies anti-sniffing, framing, referrer, permission, and API no-store defenses", () => {
    const response = responseRecorder();
    const next = vi.fn();
    applySecurityHeaders({} as any, response, next);
    applyNoStoreForApi({} as any, response, next);
    expect(next).toHaveBeenCalledTimes(2);
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(response.headers.get("Permissions-Policy")).toContain("camera=(self)");
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
  });

  it("only permits explicitly public storage keys through the unauthenticated redirect proxy", () => {
    expect(isPublicStorageKey("public/brand/logo.svg")).toBe(true);
    expect(isPublicStorageKey("members/7/verification/identity_abc.pdf")).toBe(false);
    expect(isPublicStorageKey("public/../members/7/document.pdf")).toBe(false);
    expect(isPublicStorageKey("public\\members\\7\\document.pdf")).toBe(false);
  });
});
