import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextFor(role: "user" | "admin", openId: string): TrpcContext {
  return { user: { id: role === "admin" ? 998_001 : 998_002, openId, email: `${role}@example.test`, name: `${role} test user`, loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] };
}

async function expectAllScopedAdministrativeAccessDenied(caller: ReturnType<typeof appRouter.createCaller>) {
  await expect(caller.admin.verificationQueue()).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.verificationDocument({ verificationId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.reportQueue()).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.connectionReviewQueue()).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.connectionReviewCase({ reviewId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.claimConnectionReview({ reviewId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.addConnectionReviewNote({ reviewId: 1, body: "Private operational note" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.escalateConnectionReview({ reviewId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.flagConnectionIntegrity({ conversationId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.familyMetadata()).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.restrictFamilyParticipant({ familyLinkId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.reviewWaliGuardian({ familyLinkId: 1, decision: "verified" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.recommendationPolicies()).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.saveRecommendationPolicy({ policyVersion: "recommendation-test", categories: ["recommended_for_you"], weights: { compatibility: 4, verification: 1, completeness: 1, recency: 1 }, requireDiscoveryEligibility: true, excludeIntegrityHeld: true, maxPerLocationGroup: 2, activate: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.paymentTransactions()).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.paymentReconciliationQueue()).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.requestPaymentRefund({ transactionId: 1, amountMinor: 100 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.notificationOperations()).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.notificationConfiguration()).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.processNotificationQueue({ limit: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.saveNotificationTemplate({ eventType: "product_update", channel: "in_app", locale: "en", templateVersion: "v1", subject: "Bantabato notification", body: "You have an update to review securely in Bantabato.", allowedVariables: [], activate: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.saveNotificationProviderAvailability({ provider: "provider", channel: "email", enabled: false, supportedLocales: ["en"] })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.safetyOperations()).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.safetyCaseDetail({ reportId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.createIntegritySignal({ subjectProfileId: 1, source: "staff_observation", category: "account_security", severity: "medium", evidenceConfidence: "unverified", idempotencyKey: "integrity-auth-test" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.triageIntegritySignal({ signalId: 1, outcome: "investigate" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.addSafetyEvidence({ reportId: 1, evidenceType: "report_reference", sourceRecordType: "report", sourceRecordId: "1", evidenceConfidence: "unverified" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.safetyEvidence({ reportId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.requestSafetyEnforcement({ reportId: 1, subjectProfileId: 1, actionType: "integrity_hold", scope: ["discovery"], reasonCode: "review_required", expiresAt: new Date(Date.now() + 60_000), idempotencyKey: "enforcement-auth-test" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.approveSafetyEnforcement({ enforcementActionId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.revokeSafetyEnforcement({ enforcementActionId: 1, reason: "reviewed" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.expireSafetyEnforcements({ limit: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.reviewSafetyAppeal({ appealId: 1, status: "upheld", decisionSummary: "The decision remains proportionate after separate review." })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.admin.saveIntegrityPolicy({ policyVersion: "integrity-v2", activate: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
}

describe("admin operational authorization", () => {
  it("rejects ordinary members before they can query or operate scoped administrative cases, finance records, or refunds", async () => {
    await expectAllScopedAdministrativeAccessDenied(appRouter.createCaller(contextFor("user", "member-without-admin-access")));
  });

  it("rejects a base administrator without an active operational scope", async () => {
    const caller = appRouter.createCaller(contextFor("admin", "unscoped-admin-regression-test"));
    await expect(caller.admin.decideVerification({ verificationId: 1, decision: "approved" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.decideReport({ reportId: 1, status: "resolved" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.decideConnectionReview({ reviewId: 1, decision: "approved_voice" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expectAllScopedAdministrativeAccessDenied(caller);
  });
});
