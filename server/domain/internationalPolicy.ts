export type CountryLifecycle = "draft" | "configured" | "review" | "approved" | "active" | "paused" | "deactivated";
export type FeatureAvailability = "available" | "unavailable" | "coming_soon" | "requires_configuration";
export type LocationVisibility = "eligible_members" | "matches_only" | "family_circle" | "hidden";
export type LocationDetailLevel = "country" | "region" | "city";

const PHONE_RULES: Record<string, { callingCode: string; nationalLength: number }> = {
  GM: { callingCode: "220", nationalLength: 7 },
  SN: { callingCode: "221", nationalLength: 9 },
};

const DEFAULT_COPY: Record<string, string> = {
  "international.settings.title": "Where you live and what you are open to can help you make considered, marriage-focused introductions.",
  "international.location.privacy": "Your exact address, travel patterns, and private phone number are never shown to other members.",
  "international.provider.unavailable": "This option is not configured for this country yet.",
  "international.payment.unavailable": "Payments are not configured for this country. No payment provider is active here.",
  "international.sms.unavailable": "SMS verification is not configured for this country. Your phone number remains private.",
};

export function countryIsActive(lifecycle: CountryLifecycle, active: boolean) {
  return lifecycle === "active" && active;
}

export function countryFeatureState(input: { lifecycle: CountryLifecycle; active: boolean; policyStatus: "draft" | "active" | "retired"; availability: FeatureAvailability }) {
  if (!countryIsActive(input.lifecycle, input.active) || input.policyStatus !== "active") return "unavailable" as const;
  return input.availability;
}

export function normalizePhone(countryIso2: string, input: string) {
  const rule = PHONE_RULES[countryIso2.toUpperCase()];
  if (!rule) throw new Error("Phone formatting is not configured for this country.");
  const digits = input.replace(/[^0-9+]/g, "").replace(/^\+/, "");
  const national = digits.startsWith(rule.callingCode) ? digits.slice(rule.callingCode.length) : digits.replace(/^0+/, "");
  if (!new RegExp(`^\\d{${rule.nationalLength}}$`).test(national)) throw new Error("Enter a valid phone number for the selected country.");
  return `+${rule.callingCode}${national}`;
}

export function formatNormalizedPhone(value: string | null | undefined) {
  if (!value) return null;
  if (value.startsWith("+220") && value.length === 11) return `+220 ${value.slice(4, 7)} ${value.slice(7)}`;
  if (value.startsWith("+221") && value.length === 13) return `+221 ${value.slice(4, 7)} ${value.slice(7, 10)} ${value.slice(10)}`;
  return value;
}

export function validTimezone(timezone: string) {
  try { Intl.DateTimeFormat("en-GB", { timeZone: timezone }).format(new Date()); return true; } catch { return false; }
}

export function localDate(value: Date, locale = "en", timezone = "UTC") {
  return new Intl.DateTimeFormat(locale, { timeZone: timezone, day: "numeric", month: "long", year: "numeric" }).format(value);
}

export function resolveTranslation(key: string, selectedLocale: string, availableLocaleCodes: string[], dictionary: Record<string, Record<string, string>> = {}) {
  const locale = availableLocaleCodes.includes(selectedLocale) ? selectedLocale : availableLocaleCodes.includes("en") ? "en" : selectedLocale;
  return dictionary[locale]?.[key] ?? dictionary.en?.[key] ?? DEFAULT_COPY[key] ?? "Bantabato";
}

export function localeDirection(code: string) { return code.toLowerCase().startsWith("ar") ? "rtl" : "ltr" as const; }

export function safeLocationDisplay(input: { visibility: LocationVisibility; detail: LocationDetailLevel; countryName?: string | null; region?: string | null; city?: string | null; relationship: "eligible" | "matched" | "family" | "private" }) {
  if (input.visibility === "hidden") return null;
  if (input.visibility === "matches_only" && input.relationship !== "matched") return null;
  if (input.visibility === "family_circle" && input.relationship !== "family") return null;
  if (input.relationship === "private") return input.countryName ?? null;
  if (!input.countryName) return null;
  if (input.detail === "city" && input.city) return `${input.countryName} • ${input.city}`;
  if (input.detail === "region" && input.region) return `${input.countryName} • ${input.region}`;
  return input.countryName;
}

export function internationalCompatibilityAllowed(input: { locationEnabled: boolean; relocationEnabled: boolean; longDistanceEnabled: boolean }) {
  return { location: input.locationEnabled, relocation: input.relocationEnabled, longDistance: input.longDistanceEnabled };
}

export function diasporaIsNeutral() { return true; }
