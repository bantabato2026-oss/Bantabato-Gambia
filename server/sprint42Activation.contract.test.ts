import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const onboarding = readFileSync(join(process.cwd(), "client/src/pages/MemberPages.tsx"), "utf8");
const welcome = readFileSync(join(process.cwd(), "client/src/pages/OnboardingWelcomePage.tsx"), "utf8");
const dashboard = readFileSync(join(process.cwd(), "client/src/pages/MemberDashboardPage.tsx"), "utf8");
const readiness = readFileSync(join(process.cwd(), "client/src/components/ProfileReadinessPanel.tsx"), "utf8");
const discovery = readFileSync(join(process.cwd(), "client/src/pages/CuratedDiscoveryPage.tsx"), "utf8");
const recommendations = readFileSync(join(process.cwd(), "client/src/pages/RecommendationsPage.tsx"), "utf8");
const photos = readFileSync(join(process.cwd(), "client/src/pages/ProfileMediaPage.tsx"), "utf8");
const verification = readFileSync(join(process.cwd(), "client/src/pages/VerificationCenter.tsx"), "utf8");
const db = readFileSync(join(process.cwd(), "server/db.ts"), "utf8");

describe("Sprint 42 onboarding, activation, and discovery-readiness contracts", () => {
  it("preserves calendar-correct 18–60 client guidance alongside authoritative server eligibility", () => {
    expect(onboarding).toContain("Bantabato is for adults aged 18 to 60.");
    expect(onboarding).toContain("expectedUpdatedAt: current.data?.updatedAt");
    expect(db).toContain("assertMemberAgeRequirement");
    expect(db).toContain("meetsMemberAgeRequirement");
  });

  it("preserves device-local onboarding draft reconciliation without allowing an older draft to overwrite current server data", () => {
    expect(onboarding).toContain("savedAgainstProfileUpdatedAt === profile.updatedAt.toISOString()");
    expect(onboarding).toContain("Your local draft was not applied, so an older device cannot replace the current details.");
    expect(onboarding).toContain("Your profile changed on another device before this save. No older information replaced it.");
  });

  it("uses the single server-derived activation action across welcome, Command Center, readiness, discovery, and recommendations", () => {
    for (const source of [welcome, dashboard, readiness]) expect(source).toContain("getActivationJourneyAction");
    for (const source of [discovery, recommendations]) expect(source).toContain("ActivationRecoveryLink");
    expect(welcome).toContain("Current journey state:");
    expect(dashboard).toContain("const activationAction = getActivationJourneyAction(eligibility)");
  });

  it("retains private, server-confirmed five-photo and identity-document lifecycle protections", () => {
    expect(photos).toContain("expectedPhotoCount: photoCount");
    expect(photos).toContain("expectedUpdatedAt: removeTarget.updatedAt");
    expect(photos).toContain("A server must confirm the upload before your photo list or readiness changes.");
    expect(verification).toContain("expectedLatestVerificationId: latestIdentityRecord?.id ?? null");
    expect(verification).toContain("It is not shown in discovery, messages, Family Circle, profile preview, stories, notifications, exports, or ordinary staff summaries.");
  });
});
