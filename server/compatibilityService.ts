import { and, desc, eq, inArray, isNull, lt, ne, or } from "drizzle-orm";
import { blocks, memberPreferences, memberProfiles, profileFieldVisibilities, verificationRecords } from "../drizzle/schema";
import { evaluatePair, type CompatibilityPreferences, type CompatibilityProfile, type PreferenceImportance } from "./domain/compatibility";
import { compareCuratedOrder, isEligibleForDiscovery } from "./domain/discoveryPolicy";
import { canViewerSeeProfileField } from "./domain/profileVisibility";
import { getDb } from "./db";

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
export type CuratedDiscoveryInput = { cursor?: number; limit?: number; collection?: "recommended" | "new" | "recently_updated" | "verified" | "potentially_compatible"; minAge?: number; maxAge?: number; gender?: "woman" | "man" | "self_described"; religion?: "muslim" | "christian"; country?: string; city?: string; maritalStatus?: "never_married" | "married" | "divorced" | "widowed"; hasChildren?: boolean; relocationWillingness?: "open" | "within_gambia" | "not_open" | "discuss"; polygynyOpenness?: "open" | "not_open" | "discuss" | "not_applicable"; verifiedOnly?: boolean };

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
  const limit = Math.min(Math.max(input.limit ?? 12, 1), 24);
  const viewer = await db.select().from(memberProfiles).where(and(eq(memberProfiles.id, viewerProfileId), eq(memberProfiles.profileStatus, "active"), isNull(memberProfiles.deletedAt))).limit(1);
  if (!viewer[0]) throw new Error("A complete active profile is required for curated discovery");
  const viewerPreferences = normalizePreferences(await getCompatibilityPreferences(viewerProfileId));

  const conditions = [eq(memberProfiles.profileStatus, "active"), eq(memberProfiles.searchVisible, true), isNull(memberProfiles.deletedAt), ne(memberProfiles.id, viewerProfileId), ne(memberProfiles.profileVisibility, "hidden")];
  if (input.cursor) conditions.push(lt(memberProfiles.id, input.cursor));
  if (input.gender) conditions.push(eq(memberProfiles.gender, input.gender));
  if (input.religion) conditions.push(eq(memberProfiles.religion, input.religion));
  if (input.country) conditions.push(eq(memberProfiles.country, input.country));
  if (input.city) conditions.push(eq(memberProfiles.city, input.city));
  if (input.maritalStatus) conditions.push(eq(memberProfiles.maritalStatus, input.maritalStatus));
  if (input.hasChildren !== undefined) conditions.push(eq(memberProfiles.hasChildren, input.hasChildren));
  if (input.relocationWillingness) conditions.push(eq(memberProfiles.relocationWillingness, input.relocationWillingness));
  if (input.polygynyOpenness) conditions.push(eq(memberProfiles.polygynyOpenness, input.polygynyOpenness));

  const blocked = await db.select({ blockerProfileId: blocks.blockerProfileId, blockedProfileId: blocks.blockedProfileId }).from(blocks).where(or(eq(blocks.blockerProfileId, viewerProfileId), eq(blocks.blockedProfileId, viewerProfileId)));
  const excluded = new Set(blocked.map(block => block.blockerProfileId === viewerProfileId ? block.blockedProfileId : block.blockerProfileId));
  const candidates = await db.select().from(memberProfiles).where(and(...conditions)).orderBy(desc(memberProfiles.updatedAt), desc(memberProfiles.id)).limit(limit * 4 + 1);
  const candidateIds = candidates.map(candidate => candidate.id);
  const [preferenceRows, verificationRows, visibilityRows] = await Promise.all([
    candidateIds.length ? db.select().from(memberPreferences).where(inArray(memberPreferences.profileId, candidateIds)) : Promise.resolve([]),
    candidateIds.length ? db.select({ profileId: verificationRecords.profileId }).from(verificationRecords).where(and(inArray(verificationRecords.profileId, candidateIds), eq(verificationRecords.verificationType, "identity_document"), eq(verificationRecords.status, "approved"))) : Promise.resolve([]),
    candidateIds.length ? db.select({ profileId: profileFieldVisibilities.profileId, fieldKey: profileFieldVisibilities.fieldKey, audience: profileFieldVisibilities.audience }).from(profileFieldVisibilities).where(inArray(profileFieldVisibilities.profileId, candidateIds)) : Promise.resolve([]),
  ]);
  const preferencesByProfile = new Map(preferenceRows.map(row => [row.profileId, normalizePreferences(row)]));
  const verifiedProfiles = new Set(verificationRows.map(row => row.profileId));
  const visibilitiesByProfile = new Map<number, Map<string, string>>();
  visibilityRows.forEach(row => {
    const fields = visibilitiesByProfile.get(row.profileId) ?? new Map<string, string>();
    fields.set(row.fieldKey, row.audience);
    visibilitiesByProfile.set(row.profileId, fields);
  });

  const items = candidates
    .filter(candidate => isEligibleForDiscovery({ profileStatus: candidate.profileStatus, searchVisible: candidate.searchVisible, deletedAt: candidate.deletedAt, profileVisibility: candidate.profileVisibility, blocked: excluded.has(candidate.id) }))
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
  if (!db) throw new Error("Database unavailable");
  const profiles = await db.select().from(memberProfiles).where(and(inArray(memberProfiles.id, [viewerProfileId, candidateProfileId]), eq(memberProfiles.profileStatus, "active"), isNull(memberProfiles.deletedAt)));
  const viewer = profiles.find(profile => profile.id === viewerProfileId);
  const candidate = profiles.find(profile => profile.id === candidateProfileId);
  if (!viewer || !candidate) throw new Error("Compatibility is unavailable for this profile");
  const blocked = await db.select({ id: blocks.id }).from(blocks).where(or(and(eq(blocks.blockerProfileId, viewerProfileId), eq(blocks.blockedProfileId, candidateProfileId)), and(eq(blocks.blockerProfileId, candidateProfileId), eq(blocks.blockedProfileId, viewerProfileId)))).limit(1);
  if (blocked[0]) throw new Error("Compatibility is unavailable for this profile");
  const [viewerPreferences, candidatePreferences] = await Promise.all([getCompatibilityPreferences(viewerProfileId), getCompatibilityPreferences(candidateProfileId)]);
  const result = evaluatePair(viewer as CompatibilityProfile, candidate as CompatibilityProfile, normalizePreferences(viewerPreferences), normalizePreferences(candidatePreferences));
  return {
    eligible: result.eligible,
    compatible: result.dimensions.filter(dimension => dimension.result === "compatible").map(dimension => ({ dimension: dimension.dimension, explanation: dimension.explanation })),
    considerations: result.dimensions.filter(dimension => dimension.result === "consideration").map(dimension => ({ dimension: dimension.dimension, explanation: dimension.explanation })),
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

function passesAgeFilter(birthDate: Date | null, min?: number, max?: number) {
  if (min === undefined && max === undefined) return true;
  if (!birthDate) return false;
  const age = new Date().getFullYear() - new Date(birthDate).getFullYear();
  return (min === undefined || age >= min) && (max === undefined || age <= max);
}

function collectionAllows(item: { compatibility: ReturnType<typeof evaluatePair>; identityVerified: boolean }, collection: NonNullable<CuratedDiscoveryInput["collection"]>) {
  if (collection === "verified") return item.identityVerified;
  if (collection === "potentially_compatible") return item.compatibility.compatibleCount > 0;
  return true;
}

function profileCompletenessSignals(candidate: typeof memberProfiles.$inferSelect) { return [candidate.about, candidate.marriageIntent, candidate.educationLevel, candidate.profession, candidate.lifestyle].filter(Boolean).length; }

function presentDiscoveryItem(item: { candidate: typeof memberProfiles.$inferSelect; compatibility: ReturnType<typeof evaluatePair>; identityVerified: boolean; visibility: Map<string, string> }) {
  const field = <T>(key: string, value: T, fallback: T | null = null): T | null => canViewerSeeProfileField(item.visibility.get(key), { viewerIdentityVerified: false, hasMutualMatch: false }) ? value : fallback;
  const compatible = item.compatibility.dimensions.filter(dimension => dimension.result === "compatible").slice(0, 3).map(dimension => dimension.explanation);
  const considerations = item.compatibility.dimensions.filter(dimension => dimension.result === "consideration").slice(0, 2).map(dimension => dimension.explanation);
  return {
    id: item.candidate.id,
    displayName: item.candidate.displayName,
    city: field("city", item.candidate.city),
    country: field("country", item.candidate.country),
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
