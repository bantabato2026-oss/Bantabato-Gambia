import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextFor(role: "user" | "admin", openId: string): TrpcContext {
  return {
    user: {
      id: role === "admin" ? 998_001 : 998_002,
      openId,
      email: `${role}@example.test`,
      name: `${role} test user`,
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("admin operational authorization", () => {
	  it("rejects ordinary members before they can query or operate any scoped administrative case", async () => {
	    const caller = appRouter.createCaller(contextFor("user", "member-without-admin-access"));
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
	  });

  it("rejects a base administrator without an active operational scope", async () => {
    const caller = appRouter.createCaller(contextFor("admin", "unscoped-admin-regression-test"));
    await expect(caller.admin.verificationQueue()).rejects.toMatchObject({ code: "FORBIDDEN" });
	    await expect(caller.admin.reportQueue()).rejects.toMatchObject({ code: "FORBIDDEN" });
	    await expect(caller.admin.decideVerification({ verificationId: 1, decision: "approved" })).rejects.toMatchObject({ code: "FORBIDDEN" });
	    await expect(caller.admin.decideReport({ reportId: 1, status: "resolved" })).rejects.toMatchObject({ code: "FORBIDDEN" });
	    await expect(caller.admin.decideConnectionReview({ reviewId: 1, decision: "approved_voice" })).rejects.toMatchObject({ code: "FORBIDDEN" });
	    await expect(caller.admin.claimConnectionReview({ reviewId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
	    await expect(caller.admin.flagConnectionIntegrity({ conversationId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
	    await expect(caller.admin.familyMetadata()).rejects.toMatchObject({ code: "FORBIDDEN" });
	    await expect(caller.admin.restrictFamilyParticipant({ familyLinkId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
	    await expect(caller.admin.reviewWaliGuardian({ familyLinkId: 1, decision: "verified" })).rejects.toMatchObject({ code: "FORBIDDEN" });
	    await expect(caller.admin.recommendationPolicies()).rejects.toMatchObject({ code: "FORBIDDEN" });
	    await expect(caller.admin.saveRecommendationPolicy({ policyVersion: "recommendation-test", categories: ["recommended_for_you"], weights: { compatibility: 4, verification: 1, completeness: 1, recency: 1 }, requireDiscoveryEligibility: true, excludeIntegrityHeld: true, maxPerLocationGroup: 2, activate: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
	  });
});
