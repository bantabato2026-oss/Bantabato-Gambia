import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MAX_MEMBER_AGE, meetsMemberAgeRequirement, MIN_MEMBER_AGE } from "./db";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Sprint 33 — member activation, profile completion & first-discovery journey", () => {
  it("enforces the existing adult age range in the server eligibility foundation", () => {
    const today = new Date("2026-08-24T12:00:00.000Z");
    expect(MIN_MEMBER_AGE).toBe(18);
    expect(MAX_MEMBER_AGE).toBe(60);
    expect(meetsMemberAgeRequirement(new Date("2008-08-24T00:00:00.000Z"), today)).toBe(true);
    expect(meetsMemberAgeRequirement(new Date("1966-08-24T00:00:00.000Z"), today)).toBe(true);
    expect(meetsMemberAgeRequirement(new Date("2008-08-25T00:00:00.000Z"), today)).toBe(false);
    expect(meetsMemberAgeRequirement(new Date("1965-08-24T00:00:00.000Z"), today)).toBe(false);
  });

  it("keeps profile persistence and eligibility server-authoritative for adult age and stale-write protection", () => {
    const db = read("server/db.ts");
    expect(db).toContain("assertMemberAgeRequirement(input.birthDate)");
    expect(db).toContain("meetsMemberAgeRequirement(profile.birthDate)");
    expect(db).toContain("current.updatedAt.getTime() !== expectedUpdatedAt.getTime()");
    expect(db).toContain("eq(memberProfiles.updatedAt, expectedUpdatedAt)");
    expect(db).toContain("synchronizeProfileEligibility(saved.id)");
  });

  it("preserves only a version-matching device-local onboarding draft and gives an explicit stale-server recovery path", () => {
    const onboarding = read("client/src/pages/MemberPages.tsx");
    expect(onboarding).toContain("type OnboardingDraft");
    expect(onboarding).toContain("savedAgainstProfileUpdatedAt");
    expect(onboarding).toContain("saved.savedAgainstProfileUpdatedAt === profile.updatedAt.toISOString()");
    expect(onboarding).toContain("older device cannot replace the current details");
    expect(onboarding).toContain("utils.profile.mine.invalidate()");
    expect(onboarding).toContain("onboardingAgeError(form.birthDate)");
    expect(onboarding).toContain("Bantabato is for adults aged 18 to 60.");
    expect(onboarding).toContain("aria-required={required}");
  });

  it("keeps onboarding, photos, verification, eligibility, discovery, connection, notification, Family Circle, safety, account, and Premium boundaries intact", () => {
    const dashboard = read("client/src/pages/MemberDashboardPage.tsx");
    const photos = read("client/src/pages/ProfileMediaPage.tsx");
    const verification = read("client/src/pages/VerificationCenter.tsx");
    const eligibility = read("server/domain/memberEligibilityPolicy.ts");
    const connection = read("client/src/pages/ConnectionsPage.tsx");
    const account = read("client/src/pages/AccountCenterPage.tsx");
    expect(dashboard).toContain("ProfileReadinessPanel");
    expect(dashboard).toContain("Notification center");
    expect(photos).toContain("Five approved profile photos");
    expect(photos).toContain("utils.discovery.invalidate()");
    expect(verification).toContain("No duplicate was created.");
    expect(verification).toContain("never shown as profile content");
    expect(eligibility).toContain("discoveryEligible: false");
    expect(eligibility).toContain("profileStatus === \"paused\"");
    expect(connection).toContain("An interest request does not create a conversation.");
    expect(dashboard).toContain("Bantabato Free Launch");
    expect(account).toContain("Family Circle never gets access to messages");
  });

  it("makes the first profile interest and safety actions offline-safe, refreshes current discovery state, and does not claim a false result", () => {
    const detail = read("client/src/pages/MemberDetailPages.tsx");
    const readiness = read("client/src/components/ProfileReadinessPanel.tsx");
    expect(detail).toContain("const network = useNetworkState()");
    expect(detail).toContain("utils.discovery.curated.invalidate()");
    expect(detail).toContain("Your introduction was not sent. No connection state changed");
    expect(detail).toContain("Reconnect to send");
    expect(detail).toContain("Reporting and blocking are unchanged until the server can confirm either action.");
    expect(readiness).toContain("Current journey state:");
    expect(readiness).toContain("Clear next steps, not a score.");
  });
});
