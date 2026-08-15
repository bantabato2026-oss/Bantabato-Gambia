import type { NextFunction, Request, Response } from "express";

export const API_BODY_LIMIT = "16mb";
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

type RateRule = {
  key: string;
  maxRequests: number;
  windowMs: number;
};

type RateWindow = {
  count: number;
  resetAt: number;
};

const DEFAULT_API_RULE: RateRule = {
  key: "api",
  maxRequests: 240,
  windowMs: 60_000,
};

const OPERATION_RULES: Record<string, RateRule> = {
  "messaging.sendText": { key: "message", maxRequests: 12, windowMs: 60_000 },
  "messaging.uploadVoice": { key: "voice-upload", maxRequests: 4, windowMs: 10 * 60_000 },
  "uploads.uploadProfilePhoto": { key: "photo-upload", maxRequests: 10, windowMs: 10 * 60_000 },
  "uploads.uploadIdentityDocument": { key: "identity-upload", maxRequests: 4, windowMs: 60 * 60_000 },
  "safety.report": { key: "safety-report", maxRequests: 8, windowMs: 60 * 60_000 },
  "messaging.reportMessage": { key: "message-report", maxRequests: 8, windowMs: 60 * 60_000 },
  "family.report": { key: "family-report", maxRequests: 8, windowMs: 60 * 60_000 },
  "family.invite": { key: "family-invite", maxRequests: 5, windowMs: 60 * 60_000 },
  "verification.submitIdentity": { key: "verification-submit", maxRequests: 5, windowMs: 60 * 60_000 },
  "billing.initiate": { key: "payment-initiate", maxRequests: 5, windowMs: 10 * 60_000 },
};

export function trpcOperationsFromUrl(url: string) {
  const pathname = url.split("?", 1)[0] ?? "";
  const prefix = "/api/trpc/";
  if (!pathname.startsWith(prefix)) return [];
  return pathname
    .slice(prefix.length)
    .split(",")
    .map(operation => {
      try {
        return decodeURIComponent(operation);
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}

export function rateRuleForOperations(operations: string[]): RateRule {
  const matched = operations
    .map(operation => OPERATION_RULES[operation])
    .filter((rule): rule is RateRule => Boolean(rule));
  if (!matched.length) return DEFAULT_API_RULE;
  return matched.reduce((strictest, rule) =>
    rule.maxRequests / rule.windowMs < strictest.maxRequests / strictest.windowMs
      ? rule
      : strictest,
  );
}

export class FixedWindowRateLimiter {
  private readonly windows = new Map<string, RateWindow>();

  consume(identity: string, rule: RateRule, now = Date.now()) {
    const key = `${rule.key}:${identity}`;
    const current = this.windows.get(key);
    const window = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + rule.windowMs }
      : current;
    window.count += 1;
    this.windows.set(key, window);

    if (this.windows.size > 10_000) {
      this.windows.forEach((entry, entryKey) => {
        if (entry.resetAt <= now) this.windows.delete(entryKey);
      });
    }

    return {
      allowed: window.count <= rule.maxRequests,
      remaining: Math.max(0, rule.maxRequests - window.count),
      resetAt: window.resetAt,
    };
  }
}

function requesterIdentity(req: Request) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

export function createTrpcRateLimitMiddleware(limiter = new FixedWindowRateLimiter()) {
  return (req: Request, res: Response, next: NextFunction) => {
    const rule = rateRuleForOperations(trpcOperationsFromUrl(req.originalUrl));
    const result = limiter.consume(requesterIdentity(req), rule);
    res.setHeader("RateLimit-Limit", String(rule.maxRequests));
    res.setHeader("RateLimit-Remaining", String(result.remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
    if (!result.allowed) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))));
      res.status(429).json({ error: "Too many requests. Please pause briefly and try again." });
      return;
    }
    next();
  };
}

export function createFixedRateLimitMiddleware(rule: RateRule, limiter = new FixedWindowRateLimiter()) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = limiter.consume(requesterIdentity(req), rule);
    res.setHeader("RateLimit-Limit", String(rule.maxRequests));
    res.setHeader("RateLimit-Remaining", String(result.remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
    if (!result.allowed) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))));
      res.status(429).json({ error: "Too many requests. Please pause briefly and try again." });
      return;
    }
    next();
  };
}

export const OAUTH_CALLBACK_RATE_RULE: RateRule = {
  key: "oauth-callback",
  maxRequests: 20,
  windowMs: 60_000,
};

export function applySecurityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(), payment=(), usb=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");

  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' https:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https:; media-src 'self' blob: https:; worker-src 'self' blob:; manifest-src 'self'",
    );
  }
  next();
}

export function applyNoStoreForApi(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  next();
}
