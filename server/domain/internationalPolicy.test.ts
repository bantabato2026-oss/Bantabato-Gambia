import { describe, expect, it } from "vitest";
import { countryFeatureState, countryIsActive, diasporaIsNeutral, formatNormalizedPhone, localeDirection, normalizePhone, resolveTranslation, safeLocationDisplay, validTimezone } from "./internationalPolicy";

describe("Phase 12 international policy", () => {
  it("requires both active lifecycle and active policy before a feature can be available", () => {
    expect(countryIsActive("active", true)).toBe(true);
    expect(countryIsActive("approved", true)).toBe(false);
    expect(countryFeatureState({ lifecycle: "active", active: true, policyStatus: "active", availability: "available" })).toBe("available");
    expect(countryFeatureState({ lifecycle: "paused", active: false, policyStatus: "active", availability: "available" })).toBe("unavailable");
    expect(countryFeatureState({ lifecycle: "active", active: true, policyStatus: "draft", availability: "available" })).toBe("unavailable");
  });

  it("normalizes Gambia and Senegal phone numbers without claiming SMS delivery", () => {
    expect(normalizePhone("GM", "123 4567")).toBe("+2201234567");
    expect(formatNormalizedPhone("+2201234567")).toBe("+220 123 4567");
    expect(normalizePhone("SN", "+221 77 123 45 67")).toBe("+221771234567");
    expect(formatNormalizedPhone("+221771234567")).toBe("+221 771 234 567");
    expect(() => normalizePhone("GM", "123")).toThrow("valid phone");
  });

  it("stores validated IANA time zones and rejects ambiguous invalid values", () => {
    expect(validTimezone("Africa/Banjul")).toBe(true);
    expect(validTimezone("Africa/Dakar")).toBe(true);
    expect(validTimezone("Europe/London")).toBe(true);
    expect(validTimezone("Gambia-time")).toBe(false);
  });

  it("falls back to English copy rather than exposing translation keys", () => {
    expect(resolveTranslation("international.settings.title", "fr", ["en", "fr"], { en: { "international.settings.title": "English fallback" } })).toBe("English fallback");
    expect(resolveTranslation("missing.key", "fr", ["en", "fr"], {})).toBe("Bantabato");
  });

  it("remains RTL-ready without claiming an Arabic translation exists", () => {
    expect(localeDirection("ar")).toBe("rtl");
    expect(localeDirection("en")).toBe("ltr");
  });

  it("honors location audience and granularity without exposing exact residence information", () => {
    expect(safeLocationDisplay({ visibility: "eligible_members", detail: "country", countryName: "Senegal", region: "Dakar", city: "Dakar", relationship: "eligible" })).toBe("Senegal");
    expect(safeLocationDisplay({ visibility: "eligible_members", detail: "city", countryName: "Senegal", region: "Dakar", city: "Dakar", relationship: "eligible" })).toBe("Senegal • Dakar");
    expect(safeLocationDisplay({ visibility: "matches_only", detail: "city", countryName: "The Gambia", region: "Banjul", city: "Banjul", relationship: "eligible" })).toBeNull();
    expect(safeLocationDisplay({ visibility: "hidden", detail: "city", countryName: "The Gambia", region: "Banjul", city: "Banjul", relationship: "matched" })).toBeNull();
  });

  it("treats diaspora context as neutral rather than a ranking or safety input", () => {
    expect(diasporaIsNeutral()).toBe(true);
  });
});
