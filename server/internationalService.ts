import { and, asc, count, eq, inArray, ne } from "drizzle-orm";
import { countries, countryCurrencies, countryEvents, countryPolicies, currencies, locales, memberInternationalPreferences, memberInternationalSettings, memberNotificationSettings, memberPreferredCountries, memberProfileOrigins, memberProfiles } from "../drizzle/schema";
import { createAuditLog, getDb, getProfileByUserId } from "./db";
import { requireOperationalPermission } from "./adminOperationsService";
import { emitTrustedNotification } from "./notificationService";
import { countryFeatureState, countryIsActive, diasporaIsNeutral, formatNormalizedPhone, localeDirection, normalizePhone, resolveTranslation, safeLocationDisplay, validTimezone, type FeatureAvailability, type LocationDetailLevel, type LocationVisibility } from "./domain/internationalPolicy";

type Availability = FeatureAvailability;
type CountryPolicyInput = { policyVersion: string; signupAvailability: Availability; discoveryAvailability: Availability; verificationAvailability: Availability; paymentAvailability: Availability; notificationAvailability: Availability; phoneVerificationAvailability: Availability; supportedLocaleCodes: string[]; supportedNotificationChannels: string[]; privacyConfiguration?: Record<string, string>; verificationConfiguration?: Record<string, string>; paymentConfiguration?: Record<string, string>; activate: boolean };
type CountryLifecycle = "draft" | "configured" | "review" | "approved" | "active" | "paused" | "deactivated";

const asId = (result: unknown) => Number((Array.isArray(result) ? result[0] as { id?: number; insertId?: number } | undefined : undefined)?.id ?? (Array.isArray(result) ? result[0] as { insertId?: number } | undefined : undefined)?.insertId ?? 0);

async function countryRows() {
  const db = await getDb(); if (!db) throw new Error("International settings are temporarily unavailable.");
  return db.select({ id: countries.id, iso2: countries.iso2, iso3: countries.iso3, displayName: countries.displayName, region: countries.region, lifecycleStatus: countries.lifecycleStatus, active: countries.active, defaultTimezone: countries.defaultTimezone, policyId: countryPolicies.id, policyStatus: countryPolicies.status, policyVersion: countryPolicies.policyVersion, signupAvailability: countryPolicies.signupAvailability, discoveryAvailability: countryPolicies.discoveryAvailability, verificationAvailability: countryPolicies.verificationAvailability, paymentAvailability: countryPolicies.paymentAvailability, notificationAvailability: countryPolicies.notificationAvailability, phoneVerificationAvailability: countryPolicies.phoneVerificationAvailability, supportedLocaleCodes: countryPolicies.supportedLocaleCodes, supportedNotificationChannels: countryPolicies.supportedNotificationChannels }).from(countries).leftJoin(countryPolicies, and(eq(countryPolicies.countryId, countries.id), eq(countryPolicies.status, "active"))).orderBy(asc(countries.displayName));
}

export async function listInternationalCountries() {
  const rows = await countryRows();
  return rows.map(row => ({ ...row, availability: { signup: row.policyStatus ? countryFeatureState({ lifecycle: row.lifecycleStatus, active: row.active, policyStatus: row.policyStatus, availability: row.signupAvailability! }) : "unavailable", discovery: row.policyStatus ? countryFeatureState({ lifecycle: row.lifecycleStatus, active: row.active, policyStatus: row.policyStatus, availability: row.discoveryAvailability! }) : "unavailable", verification: row.policyStatus ? countryFeatureState({ lifecycle: row.lifecycleStatus, active: row.active, policyStatus: row.policyStatus, availability: row.verificationAvailability! }) : "unavailable", payment: row.policyStatus ? countryFeatureState({ lifecycle: row.lifecycleStatus, active: row.active, policyStatus: row.policyStatus, availability: row.paymentAvailability! }) : "unavailable", notifications: row.policyStatus ? countryFeatureState({ lifecycle: row.lifecycleStatus, active: row.active, policyStatus: row.policyStatus, availability: row.notificationAvailability! }) : "unavailable", phoneVerification: row.policyStatus ? countryFeatureState({ lifecycle: row.lifecycleStatus, active: row.active, policyStatus: row.policyStatus, availability: row.phoneVerificationAvailability! }) : "unavailable" } }));
}

export async function getInternationalSettings(userId: number) {
  const db = await getDb(); if (!db) throw new Error("International settings are temporarily unavailable.");
  const profile = await getProfileByUserId(userId);
  if (!profile) {
    const [countryOptions, localeOptions] = await Promise.all([listInternationalCountries(), db.select().from(locales).orderBy(asc(locales.displayName))]);
    return { needsProfile: true as const, countries: countryOptions, locales: localeOptions.map(item => ({ ...item, direction: localeDirection(item.code) })), culture: { matrimonialIntent: true, familyCircleTerminology: "Family Circle", diasporaIsNeutral: diasporaIsNeutral() } };
  }
  const [settings, preferences, origins, preferred, countryOptions, localeOptions] = await Promise.all([
    db.select().from(memberInternationalSettings).where(eq(memberInternationalSettings.profileId, profile.id)).limit(1),
    db.select().from(memberInternationalPreferences).where(eq(memberInternationalPreferences.profileId, profile.id)).limit(1),
    db.select({ id: countries.id, iso2: countries.iso2, displayName: countries.displayName }).from(memberProfileOrigins).innerJoin(countries, eq(memberProfileOrigins.countryId, countries.id)).where(eq(memberProfileOrigins.profileId, profile.id)),
    db.select({ id: countries.id, iso2: countries.iso2, displayName: countries.displayName, preferencePurpose: memberPreferredCountries.preferencePurpose }).from(memberPreferredCountries).innerJoin(countries, eq(memberPreferredCountries.countryId, countries.id)).where(eq(memberPreferredCountries.profileId, profile.id)),
    listInternationalCountries(), db.select().from(locales).orderBy(asc(locales.displayName)),
  ]);
  return { needsProfile: false as const, profile: { id: profile.id, residenceCountryId: profile.residenceCountryId, region: profile.region, city: profile.city, timezone: profile.timezone, interfaceLocale: profile.interfaceLocale, locationVisibility: profile.locationVisibility, locationDetailLevel: profile.locationDetailLevel }, settings: { diasporaStatus: settings[0]?.diasporaStatus ?? "living_in_gambia", normalizedPhone: formatNormalizedPhone(settings[0]?.normalizedPhone), phoneCountryId: settings[0]?.phoneCountryId ?? null, phoneVerificationStatus: settings[0]?.phoneVerificationStatus ?? "not_started" }, preferences: { longDistancePreference: preferences[0]?.longDistancePreference ?? "no_preference", futureResidenceOptions: preferences[0]?.futureResidenceOptions ?? [] }, origins, preferredCountries: preferred, countries: countryOptions, locales: localeOptions.map(item => ({ ...item, direction: localeDirection(item.code) })), culture: { matrimonialIntent: true, familyCircleTerminology: "Family Circle", diasporaIsNeutral: diasporaIsNeutral() } };
}

export async function saveInternationalSettings(userId: number, input: { residenceCountryId: number; region?: string | null; city?: string | null; timezone: string; interfaceLocale: string; locationVisibility: LocationVisibility; locationDetailLevel: LocationDetailLevel; diasporaStatus: "living_in_gambia" | "living_outside_gambia" | "gambian_diaspora" | "international_member"; phone?: string | null; phoneCountryId?: number | null; originCountryIds: number[]; preferredDiscoveryCountryIds: number[]; futureResidenceCountryIds: number[]; futureResidenceOptions: string[]; longDistancePreference: "open" | "prefer_nearby" | "no_preference" }) {
  const db = await getDb(); if (!db) throw new Error("International settings are temporarily unavailable.");
  const profile = await getProfileByUserId(userId); if (!profile) throw new Error("Complete your core profile before adding international preferences.");
  if (!validTimezone(input.timezone)) throw new Error("Choose a valid IANA timezone.");
  const country = (await countryRows()).find(item => item.id === input.residenceCountryId);
  if (!country || !country.policyStatus || countryFeatureState({ lifecycle: country.lifecycleStatus, active: country.active, policyStatus: country.policyStatus, availability: country.signupAvailability! }) !== "available") throw new Error("This country is not currently available for member residence settings.");
  const locale = (await db.select().from(locales).where(eq(locales.code, input.interfaceLocale)).limit(1))[0]; if (!locale) throw new Error("Choose a configured account language.");
  const allCountryIds = Array.from(new Set([input.residenceCountryId, ...input.originCountryIds, ...input.preferredDiscoveryCountryIds, ...input.futureResidenceCountryIds, ...(input.phoneCountryId ? [input.phoneCountryId] : [])]));
  if (allCountryIds.length > 20) throw new Error("Choose no more than 20 country preferences.");
  const validCountries = await db.select({ id: countries.id }).from(countries).where(inArray(countries.id, allCountryIds)); if (validCountries.length !== allCountryIds.length) throw new Error("One or more selected countries are unavailable.");
  let normalizedPhone: string | null = null; let phoneCountryId: number | null = null;
  if (input.phone?.trim()) { if (!input.phoneCountryId) throw new Error("Choose the country for this private phone number."); const phoneCountry = (await db.select({ id: countries.id, iso2: countries.iso2 }).from(countries).where(eq(countries.id, input.phoneCountryId)).limit(1))[0]; if (!phoneCountry) throw new Error("The selected phone country is unavailable."); normalizedPhone = normalizePhone(phoneCountry.iso2, input.phone); phoneCountryId = phoneCountry.id; }
  const countryChanged = profile.residenceCountryId !== input.residenceCountryId;
  await db.update(memberProfiles).set({ residenceCountryId: country.id, country: country.displayName, region: input.region?.trim() || null, city: input.city?.trim() || null, timezone: input.timezone, interfaceLocale: input.interfaceLocale, locationVisibility: input.locationVisibility, locationDetailLevel: input.locationDetailLevel, residenceType: country.iso2 === "GM" ? "gambia" : "diaspora" }).where(eq(memberProfiles.id, profile.id));
  await db.insert(memberInternationalSettings).values({ profileId: profile.id, diasporaStatus: input.diasporaStatus, normalizedPhone, phoneCountryId, phoneVerificationStatus: normalizedPhone ? "unavailable" : "not_started" }).onDuplicateKeyUpdate({ set: { diasporaStatus: input.diasporaStatus, normalizedPhone, phoneCountryId, phoneVerificationStatus: normalizedPhone ? "unavailable" : "not_started" } });
  await db.insert(memberInternationalPreferences).values({ profileId: profile.id, longDistancePreference: input.longDistancePreference, futureResidenceOptions: input.futureResidenceOptions }).onDuplicateKeyUpdate({ set: { longDistancePreference: input.longDistancePreference, futureResidenceOptions: input.futureResidenceOptions } });
  await db.delete(memberProfileOrigins).where(eq(memberProfileOrigins.profileId, profile.id)); if (input.originCountryIds.length) await db.insert(memberProfileOrigins).values(input.originCountryIds.map(countryId => ({ profileId: profile.id, countryId })));
  await db.delete(memberPreferredCountries).where(eq(memberPreferredCountries.profileId, profile.id)); const preferredRows = [...input.preferredDiscoveryCountryIds.map(countryId => ({ profileId: profile.id, countryId, preferencePurpose: "discovery" as const })), ...input.futureResidenceCountryIds.map(countryId => ({ profileId: profile.id, countryId, preferencePurpose: "future_residence" as const }))]; if (preferredRows.length) await db.insert(memberPreferredCountries).values(preferredRows);
  await db.insert(memberNotificationSettings).values({ userId, timezone: input.timezone, locale: input.interfaceLocale, quietHoursEnabled: false }).onDuplicateKeyUpdate({ set: { timezone: input.timezone, locale: input.interfaceLocale } });
  await createAuditLog(userId, "international.settings_updated", "member_profile", String(profile.id), { countryChanged, residenceCountryId: country.id, timezone: input.timezone, locale: input.interfaceLocale, phoneProvided: Boolean(normalizedPhone), locationVisibility: input.locationVisibility, locationDetailLevel: input.locationDetailLevel });
  if (countryChanged) await emitTrustedNotification({ recipientUserId: userId, actorUserId: userId, eventType: "international_profile_update", notificationType: "security", category: "security", priority: "normal", notificationClass: "transactional", idempotencyKey: `country-change:${profile.id}:${country.id}`, sourceType: "member_profile", sourceId: profile.id, actionPath: "/app/international" });
  return getInternationalSettings(userId);
}

export async function getSafeInternationalLocation(profileId: number, relationship: "eligible" | "matched" | "family" | "private") {
  const db = await getDb(); if (!db) return null;
  const row = (await db.select({ visibility: memberProfiles.locationVisibility, detail: memberProfiles.locationDetailLevel, countryName: countries.displayName, region: memberProfiles.region, city: memberProfiles.city }).from(memberProfiles).leftJoin(countries, eq(memberProfiles.residenceCountryId, countries.id)).where(eq(memberProfiles.id, profileId)).limit(1))[0];
  return row ? safeLocationDisplay({ ...row, relationship }) : null;
}

export async function listCountryOperations(actorUserId: number) {
  await requireOperationalPermission(actorUserId, "settings.view"); const db = await getDb(); if (!db) return [];
  const data = await listInternationalCountries();
  const counts = await db.select({ residenceCountryId: memberProfiles.residenceCountryId, members: count(memberProfiles.id) }).from(memberProfiles).groupBy(memberProfiles.residenceCountryId);
  const countByCountry = new Map(counts.map(row => [row.residenceCountryId, Number(row.members)]));
  return data.map(country => ({ ...country, memberCount: countByCountry.get(country.id) ?? 0 }));
}

export async function saveCountryPolicy(actorUserId: number, countryId: number, input: CountryPolicyInput) {
  await requireOperationalPermission(actorUserId, "settings.manage", { requireFresh: true }); const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const country = (await db.select().from(countries).where(eq(countries.id, countryId)).limit(1))[0]; if (!country) throw new Error("Country not found.");
  const result = await db.insert(countryPolicies).values({ countryId, policyVersion: input.policyVersion, status: input.activate ? "active" : "draft", signupAvailability: input.signupAvailability, discoveryAvailability: input.discoveryAvailability, verificationAvailability: input.verificationAvailability, paymentAvailability: input.paymentAvailability, notificationAvailability: input.notificationAvailability, phoneVerificationAvailability: input.phoneVerificationAvailability, supportedLocaleCodes: input.supportedLocaleCodes, supportedNotificationChannels: input.supportedNotificationChannels, privacyConfiguration: input.privacyConfiguration ?? {}, verificationConfiguration: input.verificationConfiguration ?? {}, paymentConfiguration: input.paymentConfiguration ?? {}, activatedAt: input.activate ? new Date() : null, createdByUserId: actorUserId });
  const policyId = asId(result); if (input.activate) { await db.update(countryPolicies).set({ status: "retired" }).where(and(eq(countryPolicies.countryId, countryId), eq(countryPolicies.status, "active"), ne(countryPolicies.id, policyId))); await db.insert(countryEvents).values({ countryId, actorUserId, eventType: "policy_activated", safeMetadata: { policyVersion: input.policyVersion } }); }
  await createAuditLog(actorUserId, "country.policy_saved", "country_policy", String(policyId), { countryId, policyVersion: input.policyVersion, active: input.activate, paymentAvailability: input.paymentAvailability, verificationAvailability: input.verificationAvailability }); return { policyId };
}

export async function setCountryLifecycle(actorUserId: number, countryId: number, nextStatus: CountryLifecycle) {
  await requireOperationalPermission(actorUserId, "settings.manage", { requireFresh: true }); const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const country = (await db.select().from(countries).where(eq(countries.id, countryId)).limit(1))[0]; if (!country) throw new Error("Country not found.");
  const permitted: Record<CountryLifecycle, CountryLifecycle[]> = { draft: ["configured"], configured: ["review", "paused"], review: ["approved", "configured", "paused"], approved: ["active", "paused"], active: ["paused", "deactivated"], paused: ["active", "deactivated", "configured"], deactivated: ["configured"] };
  if (!permitted[country.lifecycleStatus as CountryLifecycle].includes(nextStatus)) throw new Error("This country lifecycle transition is not allowed.");
  if (nextStatus === "active") { const activePolicy = (await db.select({ id: countryPolicies.id }).from(countryPolicies).where(and(eq(countryPolicies.countryId, countryId), eq(countryPolicies.status, "active"))).limit(1))[0]; if (!activePolicy) throw new Error("An active country policy is required before country activation."); }
  await db.update(countries).set({ lifecycleStatus: nextStatus, active: nextStatus === "active" }).where(eq(countries.id, countryId));
  await db.insert(countryEvents).values({ countryId, actorUserId, eventType: nextStatus === "active" ? "activated" : nextStatus === "paused" ? "paused" : nextStatus === "deactivated" ? "deactivated" : nextStatus === "approved" ? "approved" : nextStatus === "review" ? "submitted_for_review" : "configured", safeMetadata: { from: country.lifecycleStatus, to: nextStatus } });
  await createAuditLog(actorUserId, "country.lifecycle_changed", "country", String(countryId), { from: country.lifecycleStatus, to: nextStatus }); return { success: true };
}
