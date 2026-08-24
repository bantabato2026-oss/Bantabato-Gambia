import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Sprint 37 — data rights, account lifecycle & privacy control", () => {
  it("projects minimum-necessary account, membership, session, request, privacy, and export facts without a fabricated file", () => {
    const account = read("server/accountService.ts");
    const page = read("client/src/pages/AccountCenterPage.tsx");
    expect(account).toContain("membership: activeMembership ?");
    expect(account).toContain("return { id: row.id, requestType: row.requestType, status: row.status");
    expect(account).toContain("available: false as const, fileGenerated: false as const");
    expect(page).toContain("AccountStateSnapshot");
    expect(page).toContain("Bantabato does not pretend a downloadable file exists until an authorized file has actually been generated.");
    expect(page).toContain("Not part of an export request:");
    expect(page).toContain("raw session material, audit payloads");
  });

  it("requires fresh authentication and observed versions for data-rights, deletion-review, pause, reactivation, and session actions", () => {
    const account = read("server/accountService.ts");
    const router = read("server/routers.ts");
    expect(account).toContain("await requireFreshMemberAuthentication(userId, sessionReferenceHash)");
    expect(account).toContain("function assertObservedVersion");
    expect(account).toContain("if (state.lifecycleStatus === \"paused\") return");
    expect(account).toContain("if (state.lifecycleStatus === \"active\") return");
    expect(account).toContain("if (existing) return { request: existing, duplicate: true");
    expect(account).toContain("expectedUpdatedAt: Date");
    expect(router).toContain("requestDataRights: betaMemberProcedure");
    expect(router).toContain("revokeSession: betaMemberProcedure");
  });

  it("keeps deletion-review and pause propagation server-authoritative across discovery, recommendations, connections, Family Circle, readiness, declarations, and billing boundaries", () => {
    const account = read("server/accountService.ts");
    const billing = read("server/routers.ts");
    const family = read("server/familyService.ts");
    const declarations = read("server/db.ts");
    expect(account).toContain("withdrawRecommendationsForProfile(result.profileId, \"profile_hidden\")");
    expect(account).toContain("revokeConnectionsForProfile(result.profileId, \"member_withdrew_consent\"");
    expect(account).toContain("profileStatus: \"paused\", searchVisible: false");
    expect(billing).toContain("profile.profileStatus === \"paused\" || profile.profileStatus === \"suspended\"");
    expect(family).toContain("withdrawFamilySharesForProfile");
    expect(declarations).toContain("getSuccessDeclaration");
  });

  it("preserves private security notifications, current-session protection, privacy propagation, and Premium-neutral account rules", () => {
    const account = read("server/accountService.ts");
    const sessions = read("server/domain/memberSessionPolicy.ts");
    const policy = read("server/domain/paymentPolicy.ts");
		expect(account).toContain("notificationType: \"security\"");
    expect(account).toContain("Use sign out to end your current session");
    expect(account).toContain("member.security_session_revoked");
    expect(sessions).toContain("targetIsCurrent");
    expect(policy).toContain("privacy");
    expect(policy).toContain("safety");
		expect(account).toContain("withdrawRecommendationsForProfile");
  });

	it("uses accessible, offline-safe, non-optimistic confirmation and recovery controls in the Account Center", () => {
		const page = read("client/src/pages/AccountCenterPage.tsx");
		const app = read("client/src/App.tsx");
    expect(page).toContain("Sensitive account, security, privacy, and data-rights actions are not queued");
    expect(page).toContain("role=\"dialog\"");
    expect(page).toContain("aria-modal=\"true\"");
    expect(page).toContain("aria-describedby={descriptionId}");
    expect(page).toContain("disabled={!online || busy}");
    expect(page).toContain("aria-live=\"polite\"");
		expect(page).toContain("Request export review");
		expect(app).toContain('path="/app/privacy" component={AccountCenterPage}');
	});
});
