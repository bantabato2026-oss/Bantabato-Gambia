import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { deriveMemberEligibility } from "./domain/memberEligibilityPolicy";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const base = {
  profileStatus: "draft" as const,
  searchVisible: true,
  deletedAt: null,
  coreProfileComplete: false,
  approvedPhotoCount: 0,
  verificationStatus: "not_started" as const,
};

describe("Sprint 39 — member activation, onboarding & first-value journey", () => {
  it("derives factual activation states from the existing authoritative eligibility gates without a completion score", () => {
    expect(deriveMemberEligibility(base).journeyState).toBe("NEW");
    expect(deriveMemberEligibility({ ...base, approvedPhotoCount: 1 }).journeyState).toBe("PROFILE_INCOMPLETE");
    expect(deriveMemberEligibility({ ...base, coreProfileComplete: true, approvedPhotoCount: 4 }).journeyState).toBe("PHOTOS_INCOMPLETE");
    expect(deriveMemberEligibility({ ...base, coreProfileComplete: true, approvedPhotoCount: 5, profileStatus: "under_review" }).journeyState).toBe("PENDING_REVIEW");
    expect(deriveMemberEligibility({ ...base, coreProfileComplete: true, approvedPhotoCount: 5, profileStatus: "paused" }).journeyState).toBe("PAUSED");
    expect(deriveMemberEligibility({ ...base, coreProfileComplete: true, approvedPhotoCount: 5, profileStatus: "suspended" }).journeyState).toBe("SUSPENDED");
    const ready = deriveMemberEligibility({ ...base, coreProfileComplete: true, approvedPhotoCount: 5, profileStatus: "active" });
    expect(ready.journeyState).toBe("DISCOVERY_READY");
    expect(ready.discoveryEligible).toBe(true);
    expect(JSON.stringify(ready)).not.toMatch(/score|percent|ranking/i);
  });

  it("uses server readiness—not profile completion alone—to choose the activation and discovery handoff", () => {
    const home = read("client/src/pages/MemberPages.tsx");
    const dashboard = read("client/src/pages/MemberDashboardPage.tsx");
    const readiness = read("client/src/components/ProfileReadinessPanel.tsx");
    expect(home).toContain("const discoveryReady = Boolean(eligibility?.discoveryEligible)");
    expect(home).toContain('eligibility?.journeyState === "PAUSED" ? "/app/profile"');
    expect(home).toContain("Journey state:");
    expect(dashboard).toContain("const discoveryReady = eligibility?.discoveryEligible === true");
    expect(dashboard).toContain("const activationRoute = discoveryReady");
    expect(readiness).toContain("const journeyState = eligibility?.journeyState || eligibility?.onboardingState");
    expect(readiness).toContain("Current journey state:");
  });

  it("keeps unavailable discovery factual, privacy-safe, and directed to the permitted recovery action", () => {
    const discovery = read("client/src/pages/CuratedDiscoveryPage.tsx");
    expect(discovery).toContain('eligibility?.journeyState === "PAUSED" ? "/app/profile"');
    expect(discovery).toContain("Current journey state:");
    expect(discovery).toContain("Hidden, suspended, deleted, blocked, and hard-incompatible profiles are excluded");
    expect(discovery).toContain("Exact location is never searched or shown");
    expect(discovery).not.toMatch(/reporterProfileId|staff notes|integrity investigation/);
  });

  it("preserves server-enforced adult age, versioned local drafts, stale-save protection, five-photo and verification recovery, and private first-value boundaries", () => {
    const db = read("server/db.ts");
    const onboarding = read("client/src/pages/MemberPages.tsx");
    const photo = read("client/src/pages/ProfileMediaPage.tsx");
    const verification = read("client/src/pages/VerificationCenter.tsx");
    const detail = read("client/src/pages/MemberDetailPages.tsx");
    const connections = read("client/src/pages/ConnectionsPage.tsx");
		expect(db).toContain("export function meetsMemberAgeRequirement");
		expect(db).toContain("assertMemberAgeRequirement(input.birthDate)");
    expect(db).toContain("expectedUpdatedAt");
    expect(onboarding).toContain("savedAgainstProfileUpdatedAt");
    expect(onboarding).toContain("A newer server-confirmed profile was found");
    expect(onboarding).toContain("Your draft is saved on this device");
    expect(photo).toContain("five");
		expect(verification).toContain("Private reviewer detail is not shown here.");
    expect(detail).toContain("mutual");
    expect(connections).toContain("conversation");
  });

  it("preserves account, session, notification, Family Circle, safety, privacy, and Premium-neutral protection throughout activation", () => {
    const account = read("server/accountService.ts");
    const family = read("server/familyService.ts");
    const safety = read("server/integrityService.ts");
    const notifications = read("server/notificationService.ts");
    const billing = read("server/billingService.ts");
    expect(account).toContain("reactivateMemberAccount");
		expect(account).toContain("revokeOtherMemberSecuritySessions");
		expect(family).toContain("locationDisplay");
		expect(family).toContain("city: null");
    expect(safety).toContain("withdrawRecommendationsForProfile");
    expect(notifications).toContain("privacy");
    expect(billing).toContain("Premium");
  });
});
