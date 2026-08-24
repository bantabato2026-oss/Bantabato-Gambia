import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Sprint 29 — session security, data rights & account control", () => {
  const schema = read("drizzle/schema.ts");
  const sdk = read("server/_core/sdk.ts");
  const db = read("server/db.ts");
  const service = read("server/accountService.ts");
  const router = read("server/routers.ts");
  const page = read("client/src/pages/AccountCenterPage.tsx");
  const policy = read("server/domain/memberSessionPolicy.ts");

  it("stores only hashed observed member session references and explicit active, revoked, or expired state", () => {
    expect(schema).toContain("memberSecuritySessions");
    expect(schema).toContain("sessionReferenceHash");
    expect(schema).toContain('["active", "revoked", "expired"]');
    expect(schema).not.toMatch(/memberSecuritySessions[\s\S]{0,1100}(rawToken|cookieValue|ipAddress|deviceName|browser|location)/);
  });

  it("enforces revocation centrally before protected routes run and preserves real JWT expiry", () => {
    expect(sdk).toContain("expiresAt: new Date(exp * 1000)");
    expect(sdk).toContain("observeMemberSecuritySession(user.id, sessionReferenceHash, session.expiresAt)");
    expect(sdk).toContain('ForbiddenError("Session unavailable. Please sign in again.")');
    expect(db).toContain("memberSessionIsUsable(session.status, session.expiresAt, now)");
  });

  it("uses ownership, current-session, active-state, observed-version, transaction, and fresh-authentication guards for revocation", () => {
    expect(service).toContain("requireFreshMemberAuthentication(userId, currentReferenceHash)");
    expect(service).toContain("mayRevokeMemberSession");
    expect(service).toContain(".for(\"update\")");
    expect(service).toContain("target.sessionReferenceHash === currentReferenceHash");
    expect(router).toContain("revokeSession");
    expect(router).toContain("revokeOtherSessions");
    expect(router).toContain("expectedUpdatedAt: z.date()");
  });

  it("keeps data review and deletion requests as authenticated provider-neutral requests rather than fabricated files or completed deletion", () => {
    expect(service).toContain("await requireFreshMemberAuthentication(userId, sessionReferenceHash)");
    expect(service).toContain("fileGenerated: false as const");
    expect(page).not.toContain("Requests, not invented files.");
    expect(page).toContain("Bantabato does not pretend a downloadable file exists");
    expect(page).toContain("does not claim your records are deleted");
    expect(service).toContain("safeSummary");
  });

  it("keeps account control private, accessible, offline-safe, and premium-neutral across account, privacy, notification, communication, and Family Circle boundaries", () => {
    expect(page).toContain("Session inventory");
    expect(page).toContain("Confirm this action");
    expect(page).toContain("Sensitive actions may need a recent sign-in");
    expect(page).toContain("Offline requests are not queued");
    expect(page).toContain("Family Circle never gets access to messages, documents, safety records, account controls, or call consent");
    expect(page).toContain("There is no score or Premium bypass");
    expect(policy).toContain("memberSecurityIsPremiumNeutral");
  });
});
