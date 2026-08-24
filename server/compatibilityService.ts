import { and, desc, eq, inArray, isNull, like, lt, ne, or } from "drizzle-orm";
import { blocks, memberDiscoveryFilters, memberInternationalPreferences, memberPreferredCountries, memberPreferences, memberProfiles, profileFieldVisibilities, verificationRecords } from "../drizzle/schema";
import { evaluatePair, type CompatibilityPreferences, type CompatibilityProfile, type PreferenceImportance } from "./domain/compatibility";
import { compareCuratedOrder, isEligibleForDiscovery } from "./domain/discoveryPolicy";
import { canViewerSeeProfileField } from "./domain/profileVisibility";
import { safeLocationDisplay } from "./domain/internationalPolicy";
import { getDb, getMemberEligibility } from "./db";
import { permitsInternationalDiscovery, type InternationalDiscoveryState } from "./domain/internationalDiscovery";

export type CompatibilityPreferenceInput = {
  minAge?: number;
  maxAge?: number;
  preferredGenders?: string[];
  preferredReligions?: string[];
  preferredLocations?: string[];
  preferredMaritalStatuses?: string[];
  childrenPreference?: "open" | "prefer_no_children" | "open_to_children" | "not_important";
  desiredChildrenPreference?: "yes" | "no" | "open" | "not_important";
  preferredRelocation?: string[];
  preferredEducationLevels?: string[];
  preferredMarriageTimelines?: string[];
  preferredPolygynyOpenness?: string[];
  preferredFamilyInvolvement?: string[];
  lifestylePreferences?: string[];
  preferenceImportance?: Partial<Record<string, PreferenceImportance>>;
  marriageIntent?: string;
  mustHaves?: string;
};

export type FieldVisibilityInput = { fieldKey: string; audience: "public" | "verified_members" | "potential_matches" | "matched_members" | "family_circle" | "private" | "admin_restricted" };
export type CuratedDiscoveryInput = { cursor?: number; limit?: number; collection?: "recommended" | "new" | "recently_updated" | "verified" | "potentially_compatible"; query?: string; minAge?: number; maxAge?: number; gender?: "woman" | "man" | "self_described"; religion?: "muslim" | "christian"; country?: string; residenceType?: "gambia" | "diaspora"; city?: string; maritalStatus?: "never_married" | "married" | "divorced" | "widowed"; hasChildren?: boolean; relocationWillingness?: "open" | "within_gambia" | "not_open" | "discuss"; polygynyOpenness?: "open" | "not_open" | "discuss" | "not_applicable"; verifiedOnly?: boolean };
export type DiscoveryFilterInput = Omit<CuratedDiscoveryInput, "cursor" | "limit" | "collection" | "city">;
type StoredDiscoveryFilterInput = { [Key in keyof DiscoveryFilterInput]: DiscoveryFilterInput[Key] | null | undefined };
const MIN_DISCOVERY_AGE = 18;
const MAX_DISCOVERY_AGE = 60;

export async function getCompatibilityPreferences(profileId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(memberPreferences).where(eq(memberPreferences.profileId, profileId)).limit(1);
  return result[0] ?? null;
}

export async function saveCompatibilityPreferences(profileId: number, input: CompatibilityPreferenceInput) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const values = sanitizePreferenceInput(input);
  await db.insert(memberPreferences).values({ profileId, ...values }).onDuplicateKeyUpdate({ set: values });
  return getCompatibilityPreferences(profileId);
}

export async function getDiscoveryFilters(profileId: number) {
  const db = await getDb();
  if (!db) return null;
  const row = await db.select().from(memberDiscoveryFilters).where(eq(memberDiscoveryFilters.profileId, profileId)).limit(1);
  return row[0] ? presentDiscoveryFilters(row[0]) : null;
}

export async function saveDiscoveryFilters(profileId: number, input: StoredDiscoveryFilterInput, expectedUpdatedAt?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Discovery controls are unavailable right now");
  validateDiscoveryAgeFilters(input.minAge, input.maxAge);
  const values = sanitizeDiscoveryFilterInput(input);
  const existing = await db.select().from(memberDiscoveryFilters).where(eq(memberDiscoveryFilters.profileId, profileId)).limit(1);
  if (existing[0]) {
    if (expectedUpdatedAt && existing[0].updatedAt.getTime() !== expectedUpdatedAt.getTime()) throw new Error("Your saved discovery controls changed before this update. Refresh and review the current filters.");
    const where = expectedUpdatedAt ? and(eq(memberDiscoveryFilters.id, existing[0].id), eq(memberDiscoveryFilters.updatedAt, expectedUpdatedAt)) : eq(memberDiscoveryFilters.id, existing[0].id);
    const update = await db.update(memberDiscoveryFilters).set(values).where(where);
    const summary = Array.isArray(update) ? update[0] : update;
    if (expectedUpdatedAt && typeof (summary as { affectedRows?: unknown } | undefined)?.affectedRows === "number" && (summary as { affectedRows: number }).affectedRows === 0) throw new Error("Your saved discovery controls changed before this update. Refresh and review the current filters.");
  } else {
    try {
      await db.insert(memberDiscoveryFilters).values({ profileId, ...values });
    } catch {
      throw new Error("Your discovery controls were saved elsewhere first. Refresh and review the current filters.");
    }
  }
  const saved = await getDiscoveryFilters(profileId);
  if (!saved) throw new Error("Discovery controls could not be confirmed");
  return saved;
}

export async function listProfileFieldVisibilities(profileId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ fieldKey: profileFieldVisibilities.fieldKey, audience: profileFieldVisibilities.audience }).from(profileFieldVisibilities).where(eq(profileFieldVisibilities.profileId, profileId));
}

export async function saveProfileFieldVisibilities(profileId: number, fields: FieldVisibilityInput[]) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  for (const field of fields) {
    await db.insert(profileFieldVisibilities).values({ profileId, ...field }).onDuplicateKeyUpdate({ set: { audience: field.audience } });
  }
  return listProfileFieldVisibilities(profileId);
}

export async function getCuratedDiscovery(viewerProfileId: number, input: CuratedDiscoveryInput = {}) {
  const db = await getDb();
  if (!db) return { items: [], nextCursor: undefined };
  validateDiscoveryAgeFilters(input.minAge, input.maxAge);
  const limit = Math.min(Math.max(input.limit ?? 12, 1), 24);
  const viewer = await db.select().from(memberProfiles).where(and(eq(memberProfiles.id, viewerProfileId), eq(memberProfiles.profileStatus, "active"), isNull(memberProfiles.deletedAt))).limit(1);
  const viewerEligibility = await getMemberEligibility(viewerProfileId);
  if (!viewer[0] || !viewerEligibility.discoveryEligible) throw new Error(`${viewerEligibility.title} ${viewerEligibility.detail}`);
  const viewerPreferences = normalizePreferences(await getCompatibilityPreferences(viewerProfileId));

  const conditions = [eq(memberProfiles.profileStatus, "active"), eq(memberProfiles.searchVisible, true), isNull(memberProfiles.deletedAt), ne(memberProfiles.id, viewerProfileId), ne(memberProfiles.profileVisibility, "hidden")];
  if (input.cursor) conditions.push(lt(memberProfiles.id, input.cursor));
  if (input.query) conditions.push(like(memberProfiles.displayName, `%${input.query.trim()}%`));
  if (input.gender) conditions.push(eq(memberProfiles.gender, input.gender));
  if (input.religion) conditions.push(eq(memberProfiles.religion, input.religion));
  if (input.country) conditions.push(eq(memberProfiles.country, input.country));
  if (input.residenceType) conditions.push(eq(memberProfiles.residenceType, input.residenceType));
  if (input.city) conditions.push(eq(memberProfiles.city, input.city));
  if (input.maritalStatus) conditions.push(eq(memberProfiles.maritalStatus, input.maritalStatus));
  if (input.hasChildren !== undefined) conditions.push(eq(memberProfiles.hasChildren, input.hasChildren));
  if (input.relocationWillingness) conditions.push(eq(memberProfiles.relocationWillingness, input.relocationWillingness));
  if (input.polygynyOpenness) conditions.push(eq(memberProfiles.polygynyOpenness, input.polygynyOpenness));

  const blocked = await db.select({ blockerProfileId: blocks.blockerProfileId, blockedProfileId: blocks.blockedProfileId }).from(blocks).where(or(eq(blocks.blockerProfileId, viewerProfileId), eq(blocks.blockedProfileId, viewerProfileId)));
  const excluded = new Set(blocked.map(block => block.blockerProfileId === viewerProfileId ? block.blockedProfileId : block.blockerProfileId));
  const candidates = await db.select().from(memberProfiles).where(and(...conditions)).orderBy(desc(memberProfiles.updatedAt), desc(memberProfiles.id)).limit(limit * 4 + 1);
  const candidateIds = candidates.map(candidate => candidate.id);
  const eligibleCandidateIds = new Set((await Promise.all(candidateIds.map(async id => ({ id, eligible: (await getMemberEligibility(id)).discoveryEligible })))).filter(candidate => candidate.eligible).map(candidate => candidate.id));
  const [preferenceRows, verificationRows, visibilityRows, internationalPreferenceRows, preferredCountryRows] = await Promise.all([
    candidateIds.length ? db.select().from(memberPreferences).where(inArray(memberPreferences.profileId, candidateIds)) : Promise.resolve([]),
    candidateIds.length ? db.select({ profileId: verificationRecords.profileId }).from(verificationRecords).where(and(inArray(verificationRecords.profileId, candidateIds), eq(verificationRecords.verificationType, "identity_document"), eq(verificationRecords.status, "approved"))) : Promise.resolve([]),
    candidateIds.length ? db.select({ profileId: profileFieldVisibilities.profileId, fieldKey: profileFieldVisibilities.fieldKey, audience: profileFieldVisibilities.audience }).from(profileFieldVisibilities).where(inArray(profileFieldVisibilities.profileId, candidateIds)) : Promise.resolve([]),
    db.select().from(memberInternationalPreferences).where(inArray(memberInternationalPreferences.profileId, [viewerProfileId, ...candidateIds])),
    db.select({ profileId: memberPreferredCountries.profileId, countryId: memberPreferredCountries.countryId }).from(memberPreferredCountries).where(and(inArray(memberPreferredCountries.profileId, [viewerProfileId, ...candidateIds]), eq(memberPreferredCountries.preferencePurpose, "discovery"))),
  ]);
  const preferencesByProfile = new Map(preferenceRows.map(row => [row.profileId, normalizePreferences(row)]));
  const verifiedProfiles = new Set(verificationRows.map(row => row.profileId));
  const internationalPreferenceByProfile = new Map(internationalPreferenceRows.map(row => [row.profileId, row]));
  const preferredCountriesByProfile = new Map<number, Set<number>>();
  preferredCountryRows.forEach(row => { const selected = preferredCountriesByProfile.get(row.profileId) ?? new Set<number>(); selected.add(row.countryId); preferredCountriesByProfile.set(row.profileId, selected); });
  const internationalState = (profile: typeof memberProfiles.$inferSelect): InternationalDiscoveryState => ({ residenceCountryId: profile.residenceCountryId, longDistancePreference: internationalPreferenceByProfile.get(profile.id)?.longDistancePreference ?? "no_preference", preferredDiscoveryCountryIds: preferredCountriesByProfile.get(profile.id) ?? new Set<number>() });
  const viewerInternationalState = internationalState(viewer[0]);
  const visibilitiesByProfile = new Map<number, Map<string, string>>();
  visibilityRows.forEach(row => {
    const fields = visibilitiesByProfile.get(row.profileId) ?? new Map<string, string>();
    fields.set(row.fieldKey, row.audience);
    visibilitiesByProfile.set(row.profileId, fields);
  });

  const items = candidates
    .filter(candidate => eligibleCandidateIds.has(candidate.id) && isEligibleForDiscovery({ profileStatus: candidate.profileStatus, searchVisible: candidate.searchVisible, deletedAt: candidate.deletedAt, profileVisibility: candidate.profileVisibility, blocked: excluded.has(candidate.id) }) && permitsInternationalDiscovery(viewerInternationalState, internationalState(candidate)))
    .map(candidate => {
      const compatibility = evaluatePair(viewer[0] as CompatibilityProfile, candidate as CompatibilityProfile, viewerPreferences, preferencesByProfile.get(candidate.id) ?? {});
      return { candidate, compatibility, identityVerified: verifiedProfiles.has(candidate.id), visibility: visibilitiesByProfile.get(candidate.id) ?? new Map<string, string>() };
    })
    .filter(item => item.compatibility.eligible)
    .filter(item => !input.verifiedOnly || item.identityVerified)
    .filter(item => passesAgeFilter(item.candidate.birthDate, input.minAge, input.maxAge))
    .filter(item => collectionAllows(item, input.collection ?? "recommended"))
    .sort((left, right) => input.collection === "new" ? right.candidate.createdAt.getTime() - left.candidate.createdAt.getTime() || right.candidate.id - left.candidate.id : input.collection === "recently_updated" ? right.candidate.updatedAt.getTime() - left.candidate.updatedAt.getTime() || right.candidate.id - left.candidate.id : compareCuratedOrder({ compatibleCount: left.compatibility.compatibleCount, considerationCount: left.compatibility.considerationCount, identityVerified: left.identityVerified, profileCompletenessSignals: profileCompletenessSignals(left.candidate), updatedAt: left.candidate.updatedAt, id: left.candidate.id }, { compatibleCount: right.compatibility.compatibleCount, considerationCount: right.compatibility.considerationCount, identityVerified: right.identityVerified, profileCompletenessSignals: profileCompletenessSignals(right.candidate), updatedAt: right.candidate.updatedAt, id: right.candidate.id }))
    .slice(0, limit)
    .map(item => presentDiscoveryItem(item));
  const lastCandidate = candidates[candidates.length - 1];
  return { items, nextCursor: candidates.length > limit * 4 ? lastCandidate?.id : undefined };
}

export async function getCompatibilityExplanation(viewerProfileId: number, candidateProfileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Compatibility is unavailable");
  const profiles = await db.select().from(memberProfiles).where(and(inArray(memberProfiles.id, [viewerProfileId, candidateProfileId]), eq(memberProfiles.profileStatus, "active"), isNull(memberProfiles.deletedAt)));
  const viewer = profiles.find(profile => profile.id === viewerProfileId);
  const candidate = profiles.find(profile => profile.id === candidateProfileId);
  const [viewerEligibility, candidateEligibility] = await Promise.all([getMemberEligibility(viewerProfileId), getMemberEligibility(candidateProfileId)]);
  if (!viewer || !candidate || !viewerEligibility.discoveryEligible || !candidateEligibility.discoveryEligible || !candidate.searchVisible || candidate.profileVisibility === "hidden") throw new Error("Compatibility is unavailable for this profile");
  const blocked = await db.select({ id: blocks.id }).from(blocks).where(or(and(eq(blocks.blockerProfileId, viewerProfileId), eq(blocks.blockedProfileId, candidateProfileId)), and(eq(blocks.blockerProfileId, candidateProfileId), eq(blocks.blockedProfileId, viewerProfileId)))).limit(1);
  if (blocked[0]) throw new Error("Compatibility is unavailable for this profile");
  const [viewerPreferences, candidatePreferences, visibilityRows, viewerVerification, internationalPreferenceRows, preferredCountryRows] = await Promise.all([
    getCompatibilityPreferences(viewerProfileId),
    getCompatibilityPreferences(candidateProfileId),
    db.select({ profileId: profileFieldVisibilities.profileId, fieldKey: profileFieldVisibilities.fieldKey, audience: profileFieldVisibilities.audience }).from(profileFieldVisibilities).where(eq(profileFieldVisibilities.profileId, candidateProfileId)),
    db.select({ id: verificationRecords.id }).from(verificationRecords).where(and(eq(verificationRecords.profileId, viewerProfileId), eq(verificationRecords.verificationType, "identity_document"), eq(verificationRecords.status, "approved"))).limit(1),
    db.select().from(memberInternationalPreferences).where(inArray(memberInternationalPreferences.profileId, [viewerProfileId, candidateProfileId])),
    db.select({ profileId: memberPreferredCountries.profileId, countryId: memberPreferredCountries.countryId }).from(memberPreferredCountries).where(and(inArray(memberPreferredCountries.profileId, [viewerProfileId, candidateProfileId]), eq(memberPreferredCountries.preferencePurpose, "discovery"))),
  ]);
  const preferenceByProfile = new Map(internationalPreferenceRows.map(row => [row.profileId, row]));
  const countriesByProfile = new Map<number, Set<number>>();
  preferredCountryRows.forEach(row => { const countries = countriesByProfile.get(row.profileId) ?? new Set<number>(); countries.add(row.countryId); countriesByProfile.set(row.profileId, countries); });
  const internationalState = (profile: typeof memberProfiles.$inferSelect): InternationalDiscoveryState => ({ residenceCountryId: profile.residenceCountryId, longDistancePreference: preferenceByProfile.get(profile.id)?.longDistancePreference ?? "no_preference", preferredDiscoveryCountryIds: countriesByProfile.get(profile.id) ?? new Set<number>() });
  if (!permitsInternationalDiscovery(internationalState(viewer), internationalState(candidate))) throw new Error("Compatibility is unavailable for this profile");
  const viewerResult = evaluatePair(viewer as CompatibilityProfile, candidate as CompatibilityProfile, normalizePreferences(viewerPreferences), normalizePreferences(candidatePreferences));
  if (!viewerResult.eligible) throw new Error("Compatibility is unavailable for this profile");
  const visibility = new Map(visibilityRows.map(row => [row.fieldKey, row.audience]));
  const visible = (dimension: string) => compatibilityDimensionIsVisible(dimension, visibility, Boolean(viewerVerification[0]));
  return {
    eligible: true,
    compatible: viewerResult.dimensions.filter(dimension => dimension.result === "compatible" && visible(dimension.dimension)).map(dimension => ({ dimension: dimension.dimension, explanation: dimension.explanation })),
    considerations: viewerResult.dimensions.filter(dimension => dimension.result === "consideration" && visible(dimension.dimension)).map(dimension => ({ dimension: dimension.dimension, explanation: dimension.explanation })),
  };
}

function sanitizePreferenceInput(input: CompatibilityPreferenceInput) {
  return {
    ...input,
    preferredGenders: input.preferredGenders ?? null,
    preferredReligions: input.preferredReligions ?? null,
    preferredLocations: input.preferredLocations ?? null,
    preferredMaritalStatuses: input.preferredMaritalStatuses ?? null,
    preferredRelocation: input.preferredRelocation ?? null,
    preferredEducationLevels: input.preferredEducationLevels ?? null,
    preferredMarriageTimelines: input.preferredMarriageTimelines ?? null,
    preferredPolygynyOpenness: input.preferredPolygynyOpenness ?? null,
    preferredFamilyInvolvement: input.preferredFamilyInvolvement ?? null,
    lifestylePreferences: input.lifestylePreferences ?? null,
    preferenceImportance: input.preferenceImportance ?? null,
    marriageIntent: input.marriageIntent ?? null,
    mustHaves: input.mustHaves ?? null,
  };
}

function sanitizeDiscoveryFilterInput(input: StoredDiscoveryFilterInput) {
  return {
    query: input.query?.trim() || null,
    minAge: input.minAge ?? null,
    maxAge: input.maxAge ?? null,
    gender: input.gender ?? null,
    religion: input.religion ?? null,
    country: input.country?.trim() || null,
    residenceType: input.residenceType ?? null,
    maritalStatus: input.maritalStatus ?? null,
    hasChildren: input.hasChildren ?? null,
    relocationWillingness: input.relocationWillingness ?? null,
    polygynyOpenness: input.polygynyOpenness ?? null,
    verifiedOnly: Boolean(input.verifiedOnly),
  };
}

function presentDiscoveryFilters(row: typeof memberDiscoveryFilters.$inferSelect): DiscoveryFilterInput & { updatedAt: Date } {
  return {
    query: row.query ?? undefined,
    minAge: row.minAge ?? undefined,
    maxAge: row.maxAge ?? undefined,
    gender: row.gender ?? undefined,
    religion: row.religion ?? undefined,
    country: row.country ?? undefined,
    residenceType: row.residenceType ?? undefined,
    maritalStatus: row.maritalStatus ?? undefined,
    hasChildren: row.hasChildren ?? undefined,
    relocationWillingness: row.relocationWillingness ?? undefined,
    polygynyOpenness: row.polygynyOpenness ?? undefined,
    verifiedOnly: row.verifiedOnly,
    updatedAt: row.updatedAt,
  };
}

function normalizePreferences(preferences: any): CompatibilityPreferences {
  if (!preferences) return {};
  const array = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  return {
    minAge: preferences.minAge,
    maxAge: preferences.maxAge,
    preferredGenders: array(preferences.preferredGenders),
    preferredReligions: array(preferences.preferredReligions),
    preferredLocations: array(preferences.preferredLocations),
    preferredMaritalStatuses: array(preferences.preferredMaritalStatuses),
    childrenPreference: preferences.childrenPreference,
    desiredChildrenPreference: preferences.desiredChildrenPreference,
    preferredRelocation: array(preferences.preferredRelocation),
    preferredEducationLevels: array(preferences.preferredEducationLevels),
    preferredMarriageTimelines: array(preferences.preferredMarriageTimelines),
    preferredPolygynyOpenness: array(preferences.preferredPolygynyOpenness),
    preferredFamilyInvolvement: array(preferences.preferredFamilyInvolvement),
    lifestylePreferences: array(preferences.lifestylePreferences),
    preferenceImportance: typeof preferences.preferenceImportance === "object" && preferences.preferenceImportance ? preferences.preferenceImportance as CompatibilityPreferences["preferenceImportance"] : {},
  };
}

function validateDiscoveryAgeFilters(min?: number | null, max?: number | null) {
  if (min != null && (!Number.isInteger(min) || min < MIN_DISCOVERY_AGE || min > MAX_DISCOVERY_AGE)) throw new Error(`Choose a minimum age from ${MIN_DISCOVERY_AGE} to ${MAX_DISCOVERY_AGE}`);
  if (max != null && (!Number.isInteger(max) || max < MIN_DISCOVERY_AGE || max > MAX_DISCOVERY_AGE)) throw new Error(`Choose a maximum age from ${MIN_DISCOVERY_AGE} to ${MAX_DISCOVERY_AGE}`);
  if (min != null && max != null && min > max) throw new Error("Choose a minimum age that is not above the maximum age");
}

function passesAgeFilter(birthDate: Date | null, min?: number, max?: number) {
  if (min === undefined && max === undefined) return true;
  if (!birthDate) return false;
  const today = new Date();
  const date = new Date(birthDate);
  let age = today.getUTCFullYear() - date.getUTCFullYear();
  if (today.getUTCMonth() < date.getUTCMonth() || (today.getUTCMonth() === date.getUTCMonth() && today.getUTCDate() < date.getUTCDate())) age -= 1;
  return (min === undefined || age >= min) && (max === undefined || age <= max);
}

function collectionAllows(item: { compatibility: ReturnType<typeof evaluatePair>; identityVerified: boolean }, collection: NonNullable<CuratedDiscoveryInput["collection"]>) {
  if (collection === "verified") return item.identityVerified;
  if (collection === "potentially_compatible") return item.compatibility.compatibleCount > 0;
  return true;
}

function profileCompletenessSignals(candidate: typeof memberProfiles.$inferSelect) { return [candidate.about, candidate.marriageIntent, candidate.educationLevel, candidate.profession, candidate.lifestyle].filter(Boolean).length; }

function compatibilityDimensionIsVisible(dimension: string, visibility: Map<string, string>, viewerIdentityVerified: boolean) {
  const fieldByDimension: Record<string, string> = { age: "birthDate", gender: "gender", religion: "religion", location: "country", marital_status: "maritalStatus", children: "hasChildren", desired_children: "desireChildren", relocation: "relocationWillingness", education: "educationLevel", marriage_timeline: "marriageTimeline", polygyny: "polygynyOpenness", family_involvement: "familyInvolvementPreference", lifestyle: "lifestyle", marriage_intent: "marriageIntent" };
  const field = fieldByDimension[dimension];
  return Boolean(field) && canViewerSeeProfileField(visibility.get(field), { viewerIdentityVerified, hasMutualMatch: false });
}

function presentDiscoveryItem(item: { candidate: typeof memberProfiles.$inferSelect; compatibility: ReturnType<typeof evaluatePair>; identityVerified: boolean; visibility: Map<string, string> }) {
  const field = <T>(key: string, value: T, fallback: T | null = null): T | null => canViewerSeeProfileField(item.visibility.get(key), { viewerIdentityVerified: false, hasMutualMatch: false }) ? value : fallback;
  const locationAllowed = canViewerSeeProfileField(item.visibility.get("country"), { viewerIdentityVerified: false, hasMutualMatch: false }) && item.candidate.locationVisibility === "eligible_members";
  const locationDisplay = locationAllowed ? safeLocationDisplay({ visibility: item.candidate.locationVisibility, detail: item.candidate.locationDetailLevel, countryName: item.candidate.country, region: item.candidate.region, city: item.candidate.city, relationship: "eligible" }) : null;
  const maySeeRegion = locationAllowed && ["region", "city"].includes(item.candidate.locationDetailLevel);
  const maySeeCity = locationAllowed && item.candidate.locationDetailLevel === "city";
  const compatible = item.compatibility.dimensions.filter(dimension => dimension.result === "compatible").slice(0, 3).map(dimension => dimension.explanation);
  const considerations = item.compatibility.dimensions.filter(dimension => dimension.result === "consideration").slice(0, 2).map(dimension => dimension.explanation);
  return {
    id: item.candidate.id,
    displayName: item.candidate.displayName,
    city: maySeeCity ? field("city", item.candidate.city) : null,
    region: maySeeRegion ? field("region", item.candidate.region) : null,
    country: locationAllowed ? item.candidate.country : null,
    locationDisplay,
    residenceType: item.candidate.residenceType,
    religion: field("religion", item.candidate.religion),
    educationLevel: field("educationLevel", item.candidate.educationLevel),
    profession: field("profession", item.candidate.profession),
    marriageTimeline: field("marriageTimeline", item.candidate.marriageTimeline),
    photoVisibility: item.candidate.photoVisibility,
    identityVerified: item.identityVerified,
    compatibility: { compatible, considerations },
  };
}
