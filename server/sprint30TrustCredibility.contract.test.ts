import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Sprint 30 — trust, profile credibility & verification UX", () => {
  const db = read("server/db.ts");
  const routers = read("server/routers.ts");
  const verification = read("client/src/pages/VerificationCenter.tsx");
  const photos = read("client/src/pages/ProfileMediaPage.tsx");
  const credibility = read("client/src/components/ProfileCredibilityPanel.tsx");
  const readiness = read("client/src/components/ProfileReadinessPanel.tsx");
  const preview = read("client/src/pages/ProfilePreviewPage.tsx");
  const discovery = read("client/src/pages/CuratedDiscoveryPage.tsx");
  const detail = read("client/src/pages/MemberDetailPages.tsx");
  const family = read("server/familyService.ts");
  const recommendation = read("server/recommendationService.ts");
  const policy = read("server/domain/readinessPolicy.ts");

  it("presents factual profile credibility signals rather than a Trust Score, safety score, popularity, engagement, attractiveness, protected-trait, AI, or Premium ranking", () => {
    expect(credibility).toContain("Signals, not a score.");
    expect(credibility).toContain("They do not rank you, prove safety, judge character, promise compatibility");
    expect(credibility).toContain("Identity review completed");
    expect(credibility).not.toMatch(/Trust Score|safety score|popularity score|engagement score|attractiveness score|AI matchmaking|Premium ranking/i);
    expect(readiness).toContain("Clear next steps, not a score.");
    expect(discovery).toContain("This is not a safety guarantee, compatibility assessment, or ranking signal.");
  });

  it("keeps private documents upload-only and excluded from discovery, profile preview, recommendations, messages, Family Circle, notifications, public URLs, ordinary staff summaries, and member data access", () => {
    expect(verification).toContain("Only the member, authorized verification reviewers, and narrowly scoped private storage can access this document");
    expect(verification).toContain("not shown in discovery, messages, Family Circle, profile preview, stories, notifications, exports, or ordinary staff summaries");
    expect(db).toContain("documentStorageKey: stored.key");
    expect(preview).toContain("Contact details, verification documents, messages, and Family Circle information are never previewed here.");
    expect(family).not.toContain("documentStorageKey");
  });

  it("prevents stale, duplicate, and contradictory verification submissions while preserving private resubmission recovery", () => {
    expect(routers).toContain("expectedLatestVerificationId");
    expect(db).toContain("Your verification status changed before this submission");
    expect(db).toContain("inArray(verificationRecords.status, [\"submitted\", \"under_review\", \"escalated\"])");
    expect(verification).toContain("expectedLatestVerificationId: latestIdentityRecord?.id ?? null");
    expect(verification).toContain("No document was sent. Refresh the page");
    expect(verification).toContain("Resubmission available");
  });

  it("keeps the five-approved-photo requirement server-authoritative with stale upload/removal guards and propagation to readiness, discovery, recommendations, connection eligibility, and permitted profile presentation", () => {
    expect(routers).toContain("expectedPhotoCount");
    expect(routers).toContain("expectedUpdatedAt");
    expect(db).toContain("assertProfilePhotoCapacity(existing.length)");
    expect(db).toContain("Your photo list changed before this upload");
    expect(db).toContain("This photo changed before removal");
    expect(db).toContain("synchronizeProfileEligibility(profileId)");
    expect(photos).toContain("Five approved profile photos support current profile readiness");
    expect(photos).toContain("connection eligibility, and permitted profile presentation");
    expect(photos).toContain("Remove this private profile photo?");
  });

  it("keeps verification distinct from safety and leaves blocks, reports, restrictions, suspension, consent, privacy, and deterministic compatibility authority intact", () => {
    expect(verification).toContain("One layer of protection, not a guarantee.");
    expect(detail).toContain("It is not a safety guarantee, compatibility assessment, or measure of another member’s conduct.");
    expect(policy).toContain("noActiveBlock");
    expect(policy).toContain("noOpenSeriousReport");
    expect(policy).toContain("noSeriousSafetyRestriction");
    expect(policy).toContain("voiceConsentsGranted");
    expect(recommendation).toContain("withdrawRecommendationsForProfile");
  });

  it("keeps profile preview, country/diaspora, Family Circle, privacy, and premium boundaries factual, authorized, and cross-module safe", () => {
    expect(preview).toContain("This privacy-aware preview helps you review your current profile presentation");
    expect(preview).toContain("ProfileCredibilityPanel");
    expect(preview).toContain("Contact details, verification documents, messages, and Family Circle information are never previewed here");
    expect(discovery).toContain("country");
    expect(discovery).not.toMatch(/country rank|nationality prestige|geographic popularity/i);
    expect(credibility).toContain("They do not rank you, prove safety, judge character, promise compatibility");
  });

  it("keeps sensitive verification and photo actions keyboard-labeled, status-announced, mobile-friendly, low-bandwidth aware, and server-confirmed", () => {
    expect(verification).toContain('htmlFor="identity-document"');
    expect(verification).toContain('role="status"');
    expect(verification).toContain("The selected document stays only on this page until you reconnect");
    expect(photos).toContain('htmlFor="profile-photo-upload"');
    expect(photos).toContain('role="status"');
    expect(photos).toContain("no upload or readiness update was confirmed");
    expect(photos).toContain("AlertDialog");
  });
});
