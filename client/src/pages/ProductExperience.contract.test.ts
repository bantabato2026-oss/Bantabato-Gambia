import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const publicPages = readFileSync(join(process.cwd(), "client/src/pages/PublicPages.tsx"), "utf8");
const memberPages = readFileSync(join(process.cwd(), "client/src/pages/MemberPages.tsx"), "utf8");
const styles = readFileSync(join(process.cwd(), "client/src/index.css"), "utf8");
const profileDetails = readFileSync(join(process.cwd(), "client/src/pages/ProfileDetailsPage.tsx"), "utf8");
const compatibility = readFileSync(join(process.cwd(), "client/src/pages/CompatibilityPreferencesPage.tsx"), "utf8");
const profileMedia = readFileSync(join(process.cwd(), "client/src/pages/ProfileMediaPage.tsx"), "utf8");
const memberRouteStates = readFileSync(join(process.cwd(), "client/src/pages/MemberRouteStates.tsx"), "utf8");
const international = readFileSync(join(process.cwd(), "client/src/pages/InternationalPage.tsx"), "utf8");
const recommendations = readFileSync(join(process.cwd(), "client/src/pages/RecommendationsPage.tsx"), "utf8");

describe("full product experience interaction contracts", () => {
  it("gives registration a branded, privacy-first orientation while retaining the existing secure sign-in action", () => {
    expect(publicPages).toContain("A private space to begin with intention.");
    expect(publicPages).toContain("Your profile begins as a private draft.");
    expect(publicPages).toContain("Discovery is thoughtful, not swipe-first.");
    expect(publicPages).toContain("onClick={() => startLogin()}");
  });

  it("uses a real three-step onboarding flow without replacing local draft recovery or the server profile-save mutation", () => {
    expect(memberPages).toContain('aria-label="Profile setup progress"');
    expect(memberPages).toContain("const [step, setStep] = useState(0)");
    expect(memberPages).toContain("const continueStep = () =>");
    expect(memberPages).toContain('saveSafeDraft(onboardingDraftKey, form)');
    expect(memberPages).toContain('clearSafeDraft(onboardingDraftKey)');
    expect(memberPages).toContain('save.mutate({ ...form');
    expect(memberPages).toContain("You appear to be offline. Your draft is saved on this device");
  });

  it("keeps progressive interaction readable when motion is reduced or bandwidth is constrained", () => {
    expect(styles).toContain(".onboarding-step-content,.voice-waveform span{animation:none!important;transition:none!important}");
    expect(styles).toContain('html[data-low-bandwidth="true"] .signup-intro-orbit{display:none}');
    expect(styles).toContain('html[data-low-bandwidth="true"] .signup-intro-panel');
  });

  it("keeps high-value profile completion surfaces recoverable without exposing server errors or weakening privacy choices", () => {
    for (const source of [profileDetails, compatibility, profileMedia]) expect(source).toContain("StatePanel, StateSkeleton");
    expect(profileDetails).toContain("Loading your private profile details…");
    expect(profileDetails).toContain("profile.refetch()");
    expect(compatibility).toContain("Loading your compatibility and field privacy choices…");
    expect(compatibility).toContain("stored.refetch(); void fields.refetch();");
    expect(profileMedia).toContain("Loading your private photo readiness…");
    expect(profileMedia).toContain("The selected file stays only on this page until you reconnect.");
    for (const source of [profileDetails, compatibility, profileMedia]) expect(source).not.toContain("error.message");
  });

  it("gives the core protected member journey consistent loading, error, retry, and privacy-safe recovery before rendering established route content", () => {
    expect(memberRouteStates).toContain("Loading your protected start…");
    expect(memberRouteStates).toContain("Loading your profile overview…");
    expect(memberRouteStates).toContain("Loading your private introductions…");
    expect(memberRouteStates).toContain("Loading your private conversations…");
    expect(memberRouteStates).toContain("Loading your notification center and preferences…");
    expect(memberRouteStates).toContain("No profile, privacy, or relationship state has been changed.");
    expect(memberRouteStates).toContain("incoming.refetch(); void matches.refetch();");
    expect(memberRouteStates).toContain("notifications.refetch(); void preferences.refetch();");
  });

  it("keeps international settings and deterministic recommendations recoverable without provider claims, ranking, or raw server errors", () => {
    for (const source of [international, recommendations]) {
      expect(source).toContain("StatePanel, StateSkeleton");
      expect(source).not.toContain("error.message");
    }
    expect(international).toContain("Loading your international settings…");
    expect(international).toContain("No country, location, language, phone, or cross-border preference has been changed.");
    expect(recommendations).toContain("Loading your recommendation eligibility…");
    expect(recommendations).toContain("Loading your considered introductions…");
    expect(recommendations).toContain("This explanation is unavailable right now.");
    expect(recommendations).not.toContain("animate-pulse");
  });
});
