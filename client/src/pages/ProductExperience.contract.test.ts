import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const publicPages = readFileSync(join(process.cwd(), "client/src/pages/PublicPages.tsx"), "utf8");
const memberPages = readFileSync(join(process.cwd(), "client/src/pages/MemberPages.tsx"), "utf8");
const styles = readFileSync(join(process.cwd(), "client/src/index.css"), "utf8");

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
});
