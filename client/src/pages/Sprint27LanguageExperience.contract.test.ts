import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

describe("Sprint 27 multilingual, voice-first, and low-literacy member experience", () => {
  const localization = read("client/src/lib/localization.ts");
  const guidance = read("client/src/components/MemberGuidance.tsx");
  const onboarding = read("client/src/pages/OnboardingWelcomePage.tsx");
  const memberPages = read("client/src/pages/MemberPages.tsx");
  const verification = read("client/src/pages/VerificationCenter.tsx");
  const readiness = read("client/src/components/ProfileReadinessPanel.tsx");

  it("keeps a centralized English-only dictionary and safe fallback rather than fabricating translations", () => {
    expect(localization).toContain("AVAILABLE_LOCALES");
    expect(localization).toContain('code: "en"');
    expect(localization).toContain("normalizeLocale");
    expect(localization).toContain("English is available now.");
    expect(localization).toContain("reviewed and added");
    expect(localization).not.toContain("Google Translate");
    expect(localization).not.toContain("translation provider");
  });

  it("persists language choice safely across tabs without profile or private-data mutation", () => {
    expect(localization).toContain("LANGUAGE_CHANGE_EVENT");
    expect(localization).toContain("bantabato.language.v1.locale");
    expect(localization).toContain("CustomEvent");
    expect(guidance).toContain("This does not change your profile, messages, privacy, or membership.");
  });

  it("models factual voice states and always keeps a text alternative without creating audio", () => {
    ["available", "unavailable", "playing", "paused", "stopped", "failed"].forEach(state => expect(guidance).toContain(`"${state}"`));
    expect(localization).toContain("Text guide");
    expect(guidance).toContain("No audio is loaded, recorded, or sent from this panel.");
    expect(onboarding).toContain("VoiceGuidancePanel");
    expect(memberPages).toContain("OnboardingGuidance");
  });

  it("uses low-literacy what, why, and next-action guidance for onboarding, verification, and profile readiness", () => {
    expect(guidance).toContain("What you need");
    expect(guidance).toContain("Why it matters");
    expect(guidance).toContain("What to do now");
    expect(memberPages).toContain("This step, simply explained");
    expect(verification).toContain("Verification in three clear steps");
    expect(readiness).toContain("Your next profile step");
  });

  it("keeps notification language factual and does not make language or accessibility a premium bypass", () => {
    expect(memberPages).toContain("Other delivery options are not set up yet.");
    expect(memberPages).toContain("Private in-app updates are available. Other delivery options are not set up.");
    expect(guidance).not.toContain("premium");
    expect(localization).not.toContain("premium");
  });

  it("keeps localization and voice guidance outside private documents, messages, Family Circle, staff, and safety data", () => {
    const combined = `${localization}\n${guidance}`.toLowerCase();
    ["identity document", "private message", "family circle", "staff note", "safety evidence"].forEach(term => expect(combined).not.toContain(term));
    expect(verification).toContain("never shown as profile content");
    expect(onboarding).toContain("never see your private messages");
  });
});
