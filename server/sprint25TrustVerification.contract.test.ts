import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Sprint 25 trust, verification, and credibility contracts", () => {
  it("keeps the member Verification Center factual, private, low-bandwidth-aware, and recovery-safe across lifecycle states", () => {
    const verification = read("client/src/pages/VerificationCenter.tsx");
    expect(verification).toContain("Requirements incomplete");
    expect(verification).toContain("Ready to submit");
    expect(verification).toContain("Awaiting manual review");
    expect(verification).toContain("Pending manual review");
    expect(verification).toContain("Resubmission available");
    expect(verification).toContain("Approved after manual review");
    expect(verification).toContain("Unavailable or restricted");
    expect(verification).toContain("Clear selected file");
    expect(verification).toContain("Your selected file remains on this page so you can retry");
    expect(verification).toContain("No document preview is loaded automatically after upload");
    expect(verification).toContain("never send money because of a verification indicator");
    expect(verification).not.toContain("documentStorageKey");
    expect(verification).not.toContain("reviewNotes");
  });

  it("uses unique private identity submissions, serialized open-review recovery, private audit evidence, and no ordinary storage-key projection", () => {
    const db = read("server/db.ts");
    expect(db).toContain("members/${profileId}/verification/identity-${randomUUID()}");
    expect(db).toContain("documentStorageKey: stored.key");
    expect(db).toContain('inArray(verificationRecords.status, ["submitted", "under_review", "escalated"])');
    expect(db).toContain('return { submitted: true, duplicate: true');
    expect(db).toContain('"verification.submitted"');
    expect(db).toContain('verification_submission_received');
    expect(db).toContain("getVerificationSummary");
    expect(db).not.toContain("documentStorageKey: verificationRecords.documentStorageKey, memberMessage");
  });

  it("emits factual privacy-safe verification lifecycle notifications through the existing preference, quiet-hours, expiry, dismissal, and in-app boundary", () => {
    const policy = read("server/domain/notificationPolicy.ts");
    const service = read("server/notificationService.ts");
    const operations = read("server/operations.ts");
    expect(policy).toContain("verification_submission_received");
    expect(policy).toContain("verification_pending_review");
    expect(policy).toContain("verification_changes_required");
    expect(policy).toContain("verification_completed");
    expect(policy).toContain("verification_additional_review");
    expect(policy).toContain('["security", "safety", "verification", "billing"].includes(event.category)');
    expect(service).toContain("quietHoursOutcome");
    expect(service).toContain("dismissNotification");
    expect(service).toContain("expiresAt");
    expect(operations).toContain("verification_pending_review");
    expect(operations).toContain("verification_changes_required");
    expect(operations).toContain("verification_completed");
    expect(policy).not.toContain("document number");
  });

  it("requires assigned, permission-scoped, observed-version verification review and rejects stale or duplicate decisions before member updates", () => {
    const operations = read("server/operations.ts");
    const router = read("server/routers.ts");
    const admin = read("client/src/pages/AdminOperations.tsx");
    expect(operations).toContain("expectedUpdatedAt?: Date");
    expect(operations).toContain("eq(verificationRecords.updatedAt, input.expectedUpdatedAt)");
    expect(operations).toContain("assigned to another reviewer");
    expect(operations).toContain("changed before the decision was recorded");
    expect(operations).toContain("synchronizeProfileEligibility?.(record[0].profileId)");
    expect(router).toContain("expectedUpdatedAt: z.coerce.date().optional()");
    expect(admin).toContain("expectedUpdatedAt: caseRecord.updatedAt");
    expect(admin).toContain("This verification case changed.");
    expect(admin).toContain("Open the private document only when needed for this decision.");
    expect(admin).not.toContain("documentStorageKey");
  });

  it("keeps factual credibility presentation clear and non-scoring across preview, discovery, photo readiness, safety, and premium boundaries", () => {
    const preview = read("client/src/pages/ProfilePreviewPage.tsx");
    const discovery = read("client/src/pages/CuratedDiscoveryPage.tsx");
    const photos = read("client/src/pages/ProfileMediaPage.tsx");
    const eligibility = read("server/db.ts");
    const payments = read("server/domain/paymentPolicy.ts");
    expect(preview).toContain("Five approved photos, Identity verification, and Marriage preferences are shown as current status only");
    expect(discovery).toContain("This is not a safety guarantee, compatibility assessment, or ranking signal.");
    expect(discovery).toContain("Identity reviewed");
    expect(photos).toContain("recalculates your current readiness immediately");
    expect(eligibility).toContain("synchronizeProfileEligibility(profileId)");
    expect(eligibility).toContain("getMemberEligibility(targetProfileId)");
    expect(payments).toContain('"verification"');
    expect(payments).toContain('"matching_rank"');
  });

  it("retains strict document isolation from ordinary member, Family Circle, and staff-summary surfaces", () => {
    const verification = read("client/src/pages/VerificationCenter.tsx");
    const preview = read("client/src/pages/ProfilePreviewPage.tsx");
    const family = read("server/familyService.ts");
    const staff = read("server/adminOperationsService.ts");
    expect(verification).toContain("not shown in discovery, messages, Family Circle, profile preview, stories, notifications");
    expect(verification).toContain("exports, or ordinary staff summaries");
    expect(preview).toContain("Contact details, verification documents, messages, and Family Circle information are never previewed here.");
    expect(family).not.toContain("documentStorageKey");
    expect(family).not.toContain("identity_document");
    expect(staff).not.toContain("documentStorageKey");
  });
});
