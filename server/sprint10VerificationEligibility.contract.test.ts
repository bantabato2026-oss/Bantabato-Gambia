import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Sprint 10 verification, credibility, and eligibility contracts", () => {
  it("accepts identity submissions only through private upload, protects storage references, and records factual submit evidence", () => {
    const db = read("server/db.ts");
    const router = read("server/routers.ts");
    expect(router).not.toContain("submitIdentity:");
    expect(db).not.toContain("export async function submitIdentityVerification");
    expect(db).toContain("members/${profileId}/verification/identity-${randomUUID()}");
    expect(db).toContain("documentStorageKey: stored.key");
    expect(db).toContain('"verification.submitted"');
    expect(db).toContain('`verification:${result.verificationId}:submitted`');
    expect(db).toContain("getVerificationDocumentForReview");
  });

  it("uses the latest identity lifecycle record for member-safe verification status without making verification a hidden discovery bypass", () => {
    const db = read("server/db.ts");
    const policy = read("server/domain/memberEligibilityPolicy.ts");
    expect(db).toContain("orderBy(desc(verificationRecords.createdAt)).limit(1)");
    expect(db).toContain("const latestVerificationStatus = verifications[0]?.status");
    expect(policy).toContain("input.verificationStatus === \"pending_review\"");
    expect(policy).not.toContain("premium");
  });

  it("reuses factual readiness across the Command Center, Verification Center, and Profile Preview without scores or unsafe badge claims", () => {
    const readiness = read("client/src/components/ProfileReadinessPanel.tsx");
    const dashboard = read("client/src/pages/MemberDashboardPage.tsx");
    const verification = read("client/src/pages/VerificationCenter.tsx");
    const preview = read("client/src/pages/ProfilePreviewPage.tsx");
    expect(readiness).toContain("Clear next steps, not a score.");
    expect(readiness).toContain("does not rank you");
    expect(readiness).toContain("five approved-photo requirement");
    expect(dashboard).toContain("<ProfileReadinessPanel");
    expect(verification).toContain("<ProfileReadinessPanel");
    expect(preview).toContain("<ProfileReadinessPanel");
    expect(verification).toContain("not shown in discovery, messages, Family Circle, profile preview, stories, or notifications");
  });

  it("keeps prerequisite recovery factual by disabling protected member queries until a profile exists", () => {
    const dashboard = read("client/src/pages/MemberDashboardPage.tsx");
    const verification = read("client/src/pages/VerificationCenter.tsx");
    const photos = read("client/src/pages/ProfileMediaPage.tsx");
    const preview = read("client/src/pages/ProfilePreviewPage.tsx");
    expect(dashboard).toContain("const profilePresent = Boolean(profile.data?.id)");
    expect(dashboard).toContain("enabled: profilePresent");
    expect(dashboard).toContain("No verification, photo, connection, message, Family Circle, billing, safety, or notification query was requested");
    expect(verification).toContain("enabled: profilePresent");
    expect(photos).toContain("enabled: profilePresent");
    expect(preview).toContain("enabled: profilePresent");
    expect(preview).toContain("No profile field, photo, verification record, privacy setting, or member-visible information has been shown.");
  });

  it("keeps staff review assigned, concurrent-safe, auditable, and member-safe without leaking sensitive reasoning", () => {
    const operations = read("server/operations.ts");
    expect(operations).toContain("already assigned to another reviewer");
    expect(operations).toContain("changed before it could be claimed");
    expect(operations).toContain("changed before the decision was recorded");
    expect(operations).toContain("memberSafeVerificationMessage");
    expect(operations).toContain("suspected_fraud");
    expect(operations).toContain("`verification:${input.verificationId}:${input.decision}`");
    expect(operations).not.toContain("`verification:${input.verificationId}:${input.decision}:${Date.now()}`");
  });

  it("retains the server-authoritative five-photo, privacy, relationship, recommendation, and premium-neutral boundaries", () => {
    const photos = read("server/db.ts");
    const discovery = read("server/domain/discoveryPolicy.ts");
    const payments = read("server/domain/paymentPolicy.ts");
    const connections = read("client/src/pages/ConnectionsPage.tsx");
    expect(photos).toContain("assertProfilePhotoCapacity(existing.length)");
    expect(photos).toContain("synchronizeProfileEligibility(profileId)");
    expect(discovery).toContain("isEligibleForDiscovery");
    expect(payments).toContain('"verification"');
    expect(payments).toContain('"matching_rank"');
    expect(connections).toContain("profileComplete === true");
  });
});
