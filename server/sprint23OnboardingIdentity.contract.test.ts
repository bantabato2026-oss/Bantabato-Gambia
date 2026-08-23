import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Sprint 23 onboarding, profile completion, and member identity contracts", () => {
  it("keeps secure entry provider-bound, factual, branded, low-bandwidth-safe, and non-enumerating", () => {
    const entry = read("client/src/pages/PublicPages.tsx");
    const styles = read("client/src/index.css");
    expect(entry).toContain("Secure entry");
    expect(entry).toContain("Create account / sign in");
    expect(entry).toContain("no profile, payment, verification, or membership state has changed");
    expect(entry).toContain("Restricted or eligibility-specific information is shown only after secure account access.");
    expect(entry).not.toContain("account already exists");
    expect(styles).toContain('html[data-low-bandwidth="true"] .signup-intro-orbit{display:none}');
    expect(styles).toContain("prefers-reduced-motion:reduce");
  });

  it("provides text-first welcome guidance without fabricating audio playback, external accounts, verification, eligibility, or Family Circle access", () => {
    const welcome = read("client/src/pages/OnboardingWelcomePage.tsx");
    expect(welcome).toContain("Audio guidance is not connected");
    expect(welcome).toContain("manual review");
    expect(welcome).toContain("never private messages, voice notes, identity documents, safety records, account controls, or call consent");
    expect(welcome).toContain("Exact locations are not part of discovery.");
    expect(welcome).toContain("/app/onboarding");
    expect(welcome).not.toContain("playAudio");
    expect(welcome).not.toContain("external provider");
  });

  it("keeps the three-step onboarding flow recoverable with local drafts, required-step focus, profile-version protection, and a factual Command Center handoff", () => {
    const onboarding = read("client/src/pages/MemberPages.tsx");
    const dashboard = read("client/src/pages/MemberDashboardPage.tsx");
    expect(onboarding).toContain('"Essentials"');
    expect(onboarding).toContain('"Life & marriage"');
    expect(onboarding).toContain('"Privacy"');
    expect(onboarding).toContain("saveSafeDraft(onboardingDraftKey, form)");
    expect(onboarding).toContain("clearSafeDraft(onboardingDraftKey)");
    expect(onboarding).toContain("document.getElementById(missing.id)?.focus()");
    expect(onboarding).toContain("expectedUpdatedAt: current.data?.updatedAt");
    expect(onboarding).toContain('setLocation("/app")');
    expect(dashboard).toContain('href="/app/welcome"');
    expect(dashboard).toContain("Review your marriage preferences");
  });

  it("rejects stale profile updates server-side while preserving current callers that do not supply an observed version", () => {
    const db = read("server/db.ts");
    const router = read("server/routers.ts");
    const details = read("client/src/pages/ProfileDetailsPage.tsx");
    expect(db).toContain("saveMemberProfile(userId: number, input: ProfileUpdate, expectedUpdatedAt?: Date)");
    expect(db).toContain("current.updatedAt.getTime() !== expectedUpdatedAt.getTime()");
    expect(db).toContain("eq(memberProfiles.updatedAt, expectedUpdatedAt)");
    expect(db).toContain("Your profile changed before this save.");
    expect(router).toContain("expectedUpdatedAt: z.date().optional()");
    expect(router).toContain("const { expectedUpdatedAt, ...profileInput } = input;");
    expect(details).toContain('draftKey("profile", "details")');
    expect(details).toContain("expectedUpdatedAt: profile.data?.updatedAt");
    expect(details).toContain("profile-detail draft stays on this device");
  });

  it("retains the factual five-photo, verification, eligibility, preview, privacy, Family Circle, and premium-neutral boundaries", () => {
    const photos = read("client/src/pages/ProfileMediaPage.tsx");
    const verification = read("client/src/pages/VerificationCenter.tsx");
    const preview = read("client/src/pages/ProfilePreviewPage.tsx");
    const eligibility = read("server/domain/memberEligibilityPolicy.ts");
    const payments = read("server/domain/paymentPolicy.ts");
    const safety = read("client/src/pages/SafetyCenterPage.tsx");
    expect(photos).toContain("5 approved photos");
    expect(photos).toContain("The selected file stays only on this page until you reconnect.");
    expect(photos).not.toContain("mediaStorageKey");
    expect(verification).toContain("not shown in discovery, messages, Family Circle, profile preview, stories, or notifications");
    expect(preview).toContain("This privacy-aware preview");
    expect(preview).toContain("Contact details, verification documents, messages, and Family Circle information are never previewed here.");
    expect(eligibility).toContain("MIN_APPROVED_PROFILE_PHOTOS");
    expect(eligibility).toContain("Your account is not available for introductions.");
    expect(payments).toContain('"matching_rank"');
    expect(safety).toContain("Family Circle participants cannot see reports, safety cases, enforcement decisions, private conversations, verification documents, or internal safety information.");
  });
});
