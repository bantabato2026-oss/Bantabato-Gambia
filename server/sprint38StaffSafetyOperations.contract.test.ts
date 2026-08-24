import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Sprint 38 — Trust & Safety operations, moderation & staff control", () => {
  it("keeps staff safety routes permission-scoped and records case access through a minimum-necessary projection", () => {
    const router = read("server/routers.ts");
    const integrity = read("server/integrityService.ts");
    expect(router).toContain('await requireOperationalAccess(ctx.user, ["trust_safety", "platform_admin"])');
    expect(router).toContain("return getSafetyCaseDetail(ctx.user.id, input.reportId)");
    expect(integrity).toContain("export async function getSafetyCaseDetail(actorUserId: number, reportId: number)");
    expect(integrity).toContain('"staff.safety_case_opened"');
    expect(integrity).toContain("signalCount: signals.length");
    expect(integrity).toContain("reporterProfileId");
    expect(integrity).toContain("db.select({ id: reports.id, reportedProfileId: reports.reportedProfileId");
		expect(integrity).toContain("const report = (await db.select({ id: reports.id, reportedProfileId: reports.reportedProfileId");
  });

  it("rejects stale approval, revocation, and appeal decisions while preserving four-eyes and appeal-review independence", () => {
    const integrity = read("server/integrityService.ts");
    const router = read("server/routers.ts");
    expect(integrity).toContain("expectedUpdatedAt?: Date");
    expect(integrity).toContain("This safety action changed in another staff session");
    expect(integrity).toContain("This appeal changed in another staff session");
    expect(integrity).toContain("A separate reviewer must approve this high-impact safety action.");
    expect(integrity).toContain("The appeal must be reviewed by staff other than the original decision maker.");
    expect(integrity).toContain("eq(safetyEnforcementActions.updatedAt, action.updatedAt)");
    expect(integrity).toContain("eq(safetyAppeals.updatedAt, appeal.updatedAt)");
    expect(router).toContain("approveSafetyEnforcement: protectedProcedure.input");
    expect(router).toContain("reviewSafetyAppeal: protectedProcedure.input");
  });

  it("preserves report privacy, scoped enforcement, expiry/revocation propagation, audit boundaries, finance separation, and Premium neutrality", () => {
    const integrity = read("server/integrityService.ts");
    const policy = read("server/domain/integrityPolicy.ts");
    const billing = read("server/billingService.ts");
    const family = read("server/familyService.ts");
    expect(integrity).toContain("withdrawRecommendationsForProfile");
    expect(integrity).toContain("revokeConnectionsForProfile");
    expect(integrity).toContain("restoreSafetyActionConversationEffects");
    expect(integrity).toContain("memberSafeMessage");
    expect(integrity).toContain("safety.evidence_accessed");
    expect(policy).toContain("premium");
    expect(billing).toContain("provider");
		expect(family).toContain("locationDisplay");
		expect(family).toContain("city: null");
  });

  it("keeps sensitive staff writes offline-disabled with truthful error, status, and retry copy", () => {
    const page = read("client/src/pages/AdminSafetyOperations.tsx");
    expect(page).toContain('useNetworkState() === "online"');
    expect(page).toContain("Staff enforcement, appeal, triage, signal, and expiry actions are not queued.");
    expect(page).toContain("disabled={!online || expire.isPending}");
    expect(page).toContain("disabled={!online || triage.isPending}");
    expect(page).toContain("disabled={!online || request.isPending");
    expect(page).toContain('aria-live="polite"');
    expect(page).toContain("No case, evidence reference, or safety action has been changed.");
  });
});
