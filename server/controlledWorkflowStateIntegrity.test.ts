import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createControlledWorkflowFixtures } from "./controlledWorkflowFixtures";
import { isEligibleForDiscovery } from "./domain/discoveryPolicy";
import { deriveMemberEligibility, desiredProfileStatusForEligibility } from "./domain/memberEligibilityPolicy";
import { MAX_PROFILE_PHOTOS, MIN_APPROVED_PROFILE_PHOTOS, approvedPhotoProgress } from "./domain/profilePhotoPolicy";

const dbSource = readFileSync(join(process.cwd(), "server/db.ts"), "utf8");
const schemaSource = readFileSync(join(process.cwd(), "drizzle/schema.ts"), "utf8");
const integritySource = readFileSync(join(process.cwd(), "server/integrityService.ts"), "utf8");
const operationsSource = readFileSync(join(process.cwd(), "server/adminOperationsService.ts"), "utf8");
const notificationSource = readFileSync(join(process.cwd(), "server/notificationService.ts"), "utf8");
const readinessSource = readFileSync(join(process.cwd(), "server/readinessService.ts"), "utf8");

function approvedProfilePhotoCount(photos: ReturnType<typeof createControlledWorkflowFixtures>["profilePhotos"]) {
  return photos.filter(photo => photo.photoPurpose === "profile" && photo.reviewStatus === "approved" && photo.deletedAt === null).length;
}

describe("controlled workflow state integrity", () => {
  it("uses deterministic fictional-only fixture identities without representing real members or staff", () => {
    const fixtures = createControlledWorkflowFixtures();
    expect(fixtures.isTestFixture).toBe(true);
    expect([fixtures.member, fixtures.marriedMember, fixtures.parent, fixtures.waliGuardian, fixtures.reviewer, fixtures.trustSafetyReviewer, fixtures.approver, fixtures.editorialReviewer, fixtures.supportOperator, fixtures.financeOperator, fixtures.countryOperator].every(item => item.email.endsWith("@example.test"))).toBe(true);
    expect(fixtures.parent.role).toBe("parent");
    expect(fixtures.waliGuardian.role).toBe("wali_guardian");
  });

  it("keeps an incomplete member out of eligibility until core details and exactly five approved, active profile photos are present", () => {
    const fixtures = createControlledWorkflowFixtures();
    const approved = approvedProfilePhotoCount(fixtures.profilePhotos);
    expect(approved).toBe(MIN_APPROVED_PROFILE_PHOTOS);

    const newMember = deriveMemberEligibility({ ...fixtures.member, approvedPhotoCount: 0 });
    expect(newMember).toMatchObject({ onboardingState: "NOT_STARTED", profileComplete: false, discoveryEligible: false, connectionEligible: false });

    const missingPhotos = deriveMemberEligibility({ ...fixtures.member, coreProfileComplete: true, approvedPhotoCount: 4 });
    expect(missingPhotos).toMatchObject({ onboardingState: "NEEDS_ACTION", photosRemaining: 1, discoveryEligible: false });

    const profileUnderReview = deriveMemberEligibility({ ...fixtures.member, profileStatus: "under_review", coreProfileComplete: true, approvedPhotoCount: approved, verificationStatus: "pending_review" });
    expect(profileUnderReview).toMatchObject({ onboardingState: "PENDING_REVIEW", profileComplete: true, discoveryEligible: false });

    const active = deriveMemberEligibility({ ...fixtures.member, profileStatus: "active", coreProfileComplete: true, approvedPhotoCount: approved, verificationStatus: "approved" });
    expect(active).toMatchObject({ onboardingState: "COMPLETED", profileComplete: true, discoveryEligible: true, connectionEligible: true, photosRemaining: 0 });
    expect(desiredProfileStatusForEligibility({ profileStatus: "draft", coreProfileComplete: true, approvedPhotoCount: approved })).toBe("active");
  });

  it("does not count rejected, identity-document, or withdrawn profile photos and immediately removes eligibility when an approval is lost", () => {
    const fixtures = createControlledWorkflowFixtures();
    const counted = approvedProfilePhotoCount(fixtures.profilePhotos);
    expect(counted).toBe(5);
    expect(approvedPhotoProgress(counted)).toEqual({ approved: 5, required: 5, complete: true, remaining: 0 });

    const afterWithdrawal = deriveMemberEligibility({ ...fixtures.member, profileStatus: "active", coreProfileComplete: true, approvedPhotoCount: counted - 1, verificationStatus: "approved" });
    expect(afterWithdrawal).toMatchObject({ profileComplete: false, discoveryEligible: false, connectionEligible: false, photosRemaining: 1 });
    expect(desiredProfileStatusForEligibility({ profileStatus: "active", coreProfileComplete: true, approvedPhotoCount: counted - 1 })).toBe("draft");
  });

  it("preserves the serialized profile-photo capacity boundary for concurrent intent without claiming live database concurrency execution", () => {
    expect(MAX_PROFILE_PHOTOS).toBe(5);
    expect(dbSource).toContain("await db.transaction(async tx => {");
    expect(dbSource).toContain('.for("update")');
    expect(dbSource).toContain("assertProfilePhotoCapacity(existing.length)");
    expect(dbSource).toContain("profile-photos/${randomUUID()}.");
    expect(dbSource).toContain("await synchronizeProfileEligibility(profileId)");
  });

  it("excludes a synthetic profile from discovery immediately for block, hidden, paused, restriction, integrity-hold, or withdrawal-like state", () => {
    const base = { profileStatus: "active" as const, searchVisible: true, deletedAt: null as Date | null, profileVisibility: "members_only" as const, blocked: false };
    expect(isEligibleForDiscovery(base)).toBe(true);
    expect(isEligibleForDiscovery({ ...base, blocked: true })).toBe(false);
    expect(isEligibleForDiscovery({ ...base, profileVisibility: "hidden" })).toBe(false);
    expect(isEligibleForDiscovery({ ...base, profileStatus: "paused" })).toBe(false);
    expect(isEligibleForDiscovery({ ...base, profileStatus: "suspended" })).toBe(false);
    expect(isEligibleForDiscovery({ ...base, searchVisible: false })).toBe(false);
    expect(isEligibleForDiscovery({ ...base, deletedAt: new Date("2026-08-22T12:01:00.000Z") })).toBe(false);
  });

  it("retains implemented immediate revocation, four-eyes, session, and privacy-safe notification contracts across state machines", () => {
    expect(readinessSource).toContain("member_withdrew_consent");
    expect(readinessSource).toContain("hard_incompatibility");
    expect(readinessSource).toContain("safety_restriction");
    expect(integritySource).toContain('set({ searchVisible: false');
    expect(integritySource).toContain('set({ status: "restricted" })');
    expect(integritySource).toContain("revokeConnectionsForProfile");
    expect(integritySource).toContain("withdrawRecommendationsForProfile");
    expect(operationsSource).toContain("canDecideApproval(approval.requestedByUserId, actorUserId");
    expect(operationsSource).toContain("eq(operationalApprovals.status, \"pending\")");
    expect(operationsSource).toContain("This approval was already decided or is no longer available.");
    expect(operationsSource).toContain("This staff invitation is invalid, expired, or unavailable.");
    expect(notificationSource).toContain("privacySafeCopy");
    expect(notificationSource).toContain("idempotencyKey");
    expect(notificationSource).toContain("safeMetadata: null");
  });

  it("retains durable uniqueness or serialized-write guards for every supported duplicate-sensitive workflow", () => {
    expect(schemaSource).toContain("messages_sender_conversation_client_request_unique");
    expect(schemaSource).toContain("staff_profiles_user_unique");
    expect(schemaSource).toContain("staff_invitation_hash_unique");
    expect(schemaSource).toContain("notifications_event_unique");
    expect(schemaSource).toContain("notification_events_idempotency_unique");
    expect(schemaSource).toContain("family_links_invite_code_unique");
    expect(operationsSource).toContain("affectedRows === 0");
  });
});
