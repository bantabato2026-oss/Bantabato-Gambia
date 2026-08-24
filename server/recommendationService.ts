import { and, desc, eq, inArray, isNull, lt, ne, or } from "drizzle-orm";
import { blocks, matches, memberInternationalPreferences, memberPreferredCountries, memberPreferences, memberProfiles, memberRecommendationSettings, profileFieldVisibilities, recommendationEvents, recommendationFeedback, recommendationPolicies, recommendations, verificationRecords } from "../drizzle/schema";
import { createAuditLog, createNotification, getDb, getMemberEligibility } from "./db";
import { evaluateCompatibility, type CompatibilityPreferences, type CompatibilityProfile } from "./domain/compatibility";
import { buildRecommendationDecision, DEFAULT_RECOMMENDATION_POLICY, isEligibleForRecommendation, memberSafeConsideration, memberSafeExplanation, rankRecommendationCandidates, type RecommendationCategory, type RecommendationFeedbackResponse, type RecommendationPolicy } from "./domain/recommendationPolicy";
import { canViewerSeeProfileField } from "./domain/profileVisibility";
import { permitsInternationalDiscovery, type InternationalDiscoveryState } from "./domain/internationalDiscovery";
import { safeLocationDisplay } from "./domain/internationalPolicy";

const MAX_PAGE_SIZE = 18;

export type RecommendationSettingsInput = { recommendationsEnabled: boolean; showVerifiedCategory: boolean; showNearbyCategory: boolean; showRecentCategory: boolean };
export type RecommendationPolicyInput = { policyVersion: string; categories: RecommendationCategory[]; weights: RecommendationPolicy["weights"]; requireDiscoveryEligibility: boolean; excludeIntegrityHeld: boolean; maxPerLocationGroup: number };

function normalizePreferences(preferences: any): CompatibilityPreferences {
  if (!preferences) return {};
  const array = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  return { minAge: preferences.minAge, maxAge: preferences.maxAge, preferredGenders: array(preferences.preferredGenders), preferredReligions: array(preferences.preferredReligions), preferredLocations: array(preferences.preferredLocations), preferredMaritalStatuses: array(preferences.preferredMaritalStatuses), childrenPreference: preferences.childrenPreference, desiredChildrenPreference: preferences.desiredChildrenPreference, preferredRelocation: array(preferences.preferredRelocation), preferredEducationLevels: array(preferences.preferredEducationLevels), preferredMarriageTimelines: array(preferences.preferredMarriageTimelines), preferredPolygynyOpenness: array(preferences.preferredPolygynyOpenness), preferredFamilyInvolvement: array(preferences.preferredFamilyInvolvement), lifestylePreferences: array(preferences.lifestylePreferences), preferenceImportance: preferences.preferenceImportance ?? {} };
}

function policyFromRow(row: typeof recommendationPolicies.$inferSelect): RecommendationPolicy {
  const values = row.dimensionWeights as Partial<RecommendationPolicy["weights"]> | null;
  const rules = row.eligibilityRules as Partial<Pick<RecommendationPolicy, "requireDiscoveryEligibility" | "excludeIntegrityHeld" | "maxPerLocationGroup">> | null;
  const categories = Array.isArray(row.categories) ? row.categories.filter((value): value is RecommendationCategory => typeof value === "string" && DEFAULT_RECOMMENDATION_POLICY.categories.includes(value as RecommendationCategory)) : DEFAULT_RECOMMENDATION_POLICY.categories;
  return {
    policyVersion: row.policyVersion,
    categories: categories.length ? categories : DEFAULT_RECOMMENDATION_POLICY.categories,
    weights: { compatibility: Number(values?.compatibility ?? DEFAULT_RECOMMENDATION_POLICY.weights.compatibility), verification: Number(values?.verification ?? DEFAULT_RECOMMENDATION_POLICY.weights.verification), completeness: Number(values?.completeness ?? DEFAULT_RECOMMENDATION_POLICY.weights.completeness), recency: Number(values?.recency ?? DEFAULT_RECOMMENDATION_POLICY.weights.recency) },
    requireDiscoveryEligibility: rules?.requireDiscoveryEligibility ?? true,
    excludeIntegrityHeld: rules?.excludeIntegrityHeld ?? true,
    maxPerLocationGroup: Math.min(Math.max(Number(rules?.maxPerLocationGroup ?? DEFAULT_RECOMMENDATION_POLICY.maxPerLocationGroup), 1), 5),
  };
}

async function requireDb() { const db = await getDb(); if (!db) throw new Error("Database unavailable"); return db; }

export async function getActiveRecommendationPolicy() {
  const db = await requireDb();
  let policy = await db.select().from(recommendationPolicies).where(eq(recommendationPolicies.status, "active")).orderBy(desc(recommendationPolicies.activatedAt)).limit(1);
  if (!policy[0]) {
    await db.insert(recommendationPolicies).values({ policyVersion: DEFAULT_RECOMMENDATION_POLICY.policyVersion, status: "active", categories: DEFAULT_RECOMMENDATION_POLICY.categories, dimensionWeights: DEFAULT_RECOMMENDATION_POLICY.weights, eligibilityRules: { requireDiscoveryEligibility: true, excludeIntegrityHeld: true, maxPerLocationGroup: DEFAULT_RECOMMENDATION_POLICY.maxPerLocationGroup }, activatedAt: new Date() }).onDuplicateKeyUpdate({ set: { status: "active", activatedAt: new Date() } });
    policy = await db.select().from(recommendationPolicies).where(eq(recommendationPolicies.policyVersion, DEFAULT_RECOMMENDATION_POLICY.policyVersion)).limit(1);
  }
  if (!policy[0]) throw new Error("Recommendation policy is unavailable");
  return policy[0];
}

export async function listRecommendationPolicies() {
  const db = await requireDb();
  return db.select({ id: recommendationPolicies.id, policyVersion: recommendationPolicies.policyVersion, status: recommendationPolicies.status, categories: recommendationPolicies.categories, dimensionWeights: recommendationPolicies.dimensionWeights, eligibilityRules: recommendationPolicies.eligibilityRules, activatedAt: recommendationPolicies.activatedAt, createdAt: recommendationPolicies.createdAt }).from(recommendationPolicies).orderBy(desc(recommendationPolicies.createdAt));
}

/** Platform administrators may create a draft or activate a reviewed policy. Member-level ranks are never stored or exposed. */
export async function saveRecommendationPolicy(actorUserId: number, input: RecommendationPolicyInput, activate: boolean) {
  const db = await requireDb();
  const status = activate ? "active" as const : "draft" as const;
  if (activate) await db.update(recommendationPolicies).set({ status: "retired" }).where(eq(recommendationPolicies.status, "active"));
  await db.insert(recommendationPolicies).values({ policyVersion: input.policyVersion, status, categories: input.categories, dimensionWeights: input.weights, eligibilityRules: { requireDiscoveryEligibility: input.requireDiscoveryEligibility, excludeIntegrityHeld: input.excludeIntegrityHeld, maxPerLocationGroup: input.maxPerLocationGroup }, createdByUserId: actorUserId, activatedAt: activate ? new Date() : null }).onDuplicateKeyUpdate({ set: { status, categories: input.categories, dimensionWeights: input.weights, eligibilityRules: { requireDiscoveryEligibility: input.requireDiscoveryEligibility, excludeIntegrityHeld: input.excludeIntegrityHeld, maxPerLocationGroup: input.maxPerLocationGroup }, activatedAt: activate ? new Date() : null } });
  const policy = await db.select().from(recommendationPolicies).where(eq(recommendationPolicies.policyVersion, input.policyVersion)).limit(1);
  await createAuditLog(actorUserId, "recommendation.policy_saved", "recommendation_policy", String(policy[0]?.id ?? ""), { policyVersion: input.policyVersion, activated: activate });
  return policy[0];
}

export async function getRecommendationSettings(profileId: number) {
  const db = await requireDb();
  const current = await db.select().from(memberRecommendationSettings).where(eq(memberRecommendationSettings.profileId, profileId)).limit(1);
  if (current[0]) return current[0];
  await db.insert(memberRecommendationSettings).values({ profileId }).onDuplicateKeyUpdate({ set: {} });
  return (await db.select().from(memberRecommendationSettings).where(eq(memberRecommendationSettings.profileId, profileId)).limit(1))[0]!;
}

export async function saveRecommendationSettings(profileId: number, actorUserId: number, input: RecommendationSettingsInput) {
  const db = await requireDb();
  await db.insert(memberRecommendationSettings).values({ profileId, ...input }).onDuplicateKeyUpdate({ set: input });
  await createAuditLog(actorUserId, "recommendation.settings_updated", "member_recommendation_settings", String(profileId));
  return getRecommendationSettings(profileId);
}

export async function getRecommendationsForMember(profileId: number, input: { cursor?: number; limit?: number; category?: RecommendationCategory } = {}) {
  const db = await requireDb();
  const limit = Math.min(Math.max(input.limit ?? 12, 1), MAX_PAGE_SIZE);
  const [viewer, viewerSettings, policyRow] = await Promise.all([
    db.select().from(memberProfiles).where(and(eq(memberProfiles.id, profileId), eq(memberProfiles.profileStatus, "active"), isNull(memberProfiles.deletedAt))).limit(1),
    getRecommendationSettings(profileId),
    getActiveRecommendationPolicy(),
  ]);
  const viewerEligibility = await getMemberEligibility(profileId);
  if (!viewer[0] || !viewerSettings.recommendationsEnabled || !viewerEligibility.discoveryEligible) return { items: [], nextCursor: undefined, policyVersion: policyRow.policyVersion };
  const policy = policyFromRow(policyRow);
  const conditions = [eq(memberProfiles.profileStatus, "active"), eq(memberProfiles.searchVisible, true), isNull(memberProfiles.deletedAt), ne(memberProfiles.profileVisibility, "hidden"), ne(memberProfiles.id, profileId)];
  if (input.cursor) conditions.push(lt(memberProfiles.id, input.cursor));
  const candidatePool = await db.select().from(memberProfiles).where(and(...conditions)).orderBy(desc(memberProfiles.updatedAt), desc(memberProfiles.id)).limit(limit * 8 + 1);
  const candidateIds = candidatePool.map(candidate => candidate.id);
  if (!candidateIds.length) return { items: [], nextCursor: undefined, policyVersion: policy.policyVersion };
  const eligibleCandidateIds = new Set((await Promise.all(candidateIds.map(async id => ({ id, eligible: (await getMemberEligibility(id)).discoveryEligible })))).filter(candidate => candidate.eligible).map(candidate => candidate.id));
  const [viewerPreferenceRows, candidatePreferenceRows, blockRows, verificationRows, visibilityRows, candidateSettings, existingRecommendations, existingMatches, viewerVerification, internationalPreferenceRows, preferredCountryRows] = await Promise.all([
    db.select().from(memberPreferences).where(eq(memberPreferences.profileId, profileId)).limit(1),
    db.select().from(memberPreferences).where(inArray(memberPreferences.profileId, candidateIds)),
    db.select().from(blocks).where(or(eq(blocks.blockerProfileId, profileId), eq(blocks.blockedProfileId, profileId))),
    db.select({ profileId: verificationRecords.profileId }).from(verificationRecords).where(and(inArray(verificationRecords.profileId, candidateIds), eq(verificationRecords.verificationType, "identity_document"), eq(verificationRecords.status, "approved"))),
    db.select({ profileId: profileFieldVisibilities.profileId, fieldKey: profileFieldVisibilities.fieldKey, audience: profileFieldVisibilities.audience }).from(profileFieldVisibilities).where(inArray(profileFieldVisibilities.profileId, candidateIds)),
    db.select().from(memberRecommendationSettings).where(inArray(memberRecommendationSettings.profileId, candidateIds)),
    db.select().from(recommendations).where(and(eq(recommendations.profileId, profileId), eq(recommendations.recommendationPolicyId, policyRow.id), inArray(recommendations.candidateProfileId, candidateIds))),
    db.select().from(matches).where(and(eq(matches.status, "active"), or(inArray(matches.memberOneProfileId, candidateIds), inArray(matches.memberTwoProfileId, candidateIds)))),
    db.select({ id: verificationRecords.id }).from(verificationRecords).where(and(eq(verificationRecords.profileId, profileId), eq(verificationRecords.verificationType, "identity_document"), eq(verificationRecords.status, "approved"))).limit(1),
    db.select().from(memberInternationalPreferences).where(inArray(memberInternationalPreferences.profileId, [profileId, ...candidateIds])),
    db.select({ profileId: memberPreferredCountries.profileId, countryId: memberPreferredCountries.countryId }).from(memberPreferredCountries).where(and(inArray(memberPreferredCountries.profileId, [profileId, ...candidateIds]), eq(memberPreferredCountries.preferencePurpose, "discovery"))),
  ]);
  const excluded = new Set(blockRows.map(block => block.blockerProfileId === profileId ? block.blockedProfileId : block.blockerProfileId));
  const preferencesByProfile = new Map(candidatePreferenceRows.map(row => [row.profileId, normalizePreferences(row)]));
  const verified = new Set(verificationRows.map(row => row.profileId));
  const settingsByProfile = new Map(candidateSettings.map(row => [row.profileId, row]));
  const existingByCandidate = new Map(existingRecommendations.map(row => [row.candidateProfileId, row]));
  const matchedCandidateIds = new Set(existingMatches.filter(match => match.memberOneProfileId === profileId || match.memberTwoProfileId === profileId).map(match => match.memberOneProfileId === profileId ? match.memberTwoProfileId : match.memberOneProfileId));
  const visibilityByProfile = new Map<number, Map<string, string>>();
  visibilityRows.forEach(row => { const fields = visibilityByProfile.get(row.profileId) ?? new Map<string, string>(); fields.set(row.fieldKey, row.audience); visibilityByProfile.set(row.profileId, fields); });
  const viewerPreferences = normalizePreferences(viewerPreferenceRows[0]);
  const internationalPreferenceByProfile = new Map(internationalPreferenceRows.map(row => [row.profileId, row]));
  const preferredCountriesByProfile = new Map<number, Set<number>>();
  preferredCountryRows.forEach(row => { const selected = preferredCountriesByProfile.get(row.profileId) ?? new Set<number>(); selected.add(row.countryId); preferredCountriesByProfile.set(row.profileId, selected); });
  const internationalState = (profile: typeof memberProfiles.$inferSelect): InternationalDiscoveryState => ({ residenceCountryId: profile.residenceCountryId, longDistancePreference: internationalPreferenceByProfile.get(profile.id)?.longDistancePreference ?? "no_preference", preferredDiscoveryCountryIds: preferredCountriesByProfile.get(profile.id) ?? new Set<number>() });
  const viewerInternationalState = internationalState(viewer[0]);
  const evaluations = candidatePool.filter(candidate => eligibleCandidateIds.has(candidate.id) && !excluded.has(candidate.id) && !matchedCandidateIds.has(candidate.id) && permitsInternationalDiscovery(viewerInternationalState, internationalState(candidate))).map(candidate => {
    const own = evaluateCompatibility(viewer[0] as CompatibilityProfile, candidate as CompatibilityProfile, viewerPreferences);
    const reciprocal = evaluateCompatibility(candidate as CompatibilityProfile, viewer[0] as CompatibilityProfile, preferencesByProfile.get(candidate.id) ?? {});
    const compatibility = { eligible: own.eligible && reciprocal.eligible, dimensions: [...own.dimensions, ...reciprocal.dimensions], compatibleCount: own.compatibleCount + reciprocal.compatibleCount, considerationCount: own.considerationCount + reciprocal.considerationCount };
    return { candidate, ownDimensions: own.dimensions, compatibility, identityVerified: verified.has(candidate.id), completenessSignals: profileCompletenessSignals(candidate), recommendationEnabled: settingsByProfile.get(candidate.id)?.recommendationsEnabled ?? true };
  }).filter(item => isEligibleForRecommendation({ id: item.candidate.id, profileStatus: item.candidate.profileStatus, searchVisible: item.candidate.searchVisible, deletedAt: item.candidate.deletedAt, profileVisibility: item.candidate.profileVisibility, blocked: false, compatibility: item.compatibility, identityVerified: item.identityVerified, completenessSignals: item.completenessSignals, updatedAt: item.candidate.updatedAt, createdAt: item.candidate.createdAt, locationGroup: item.candidate.country, recommendationEnabled: item.recommendationEnabled }, policy));
  const ranked = rankRecommendationCandidates(evaluations.map(item => ({ id: item.candidate.id, profileStatus: item.candidate.profileStatus, searchVisible: item.candidate.searchVisible, deletedAt: item.candidate.deletedAt, profileVisibility: item.candidate.profileVisibility, blocked: false, compatibility: item.compatibility, identityVerified: item.identityVerified, completenessSignals: item.completenessSignals, updatedAt: item.candidate.updatedAt, createdAt: item.candidate.createdAt, locationGroup: item.candidate.country, recommendationEnabled: item.recommendationEnabled })), policy);
  const evaluationById = new Map(evaluations.map(item => [item.candidate.id, item]));
	  const selected = ranked.filter(candidate => { const existing = existingByCandidate.get(candidate.id); return !existing || !["dismissed", "hidden"].includes(existing.status); }).slice(0, limit);
  const items = [] as Array<ReturnType<typeof presentRecommendation>>;
  for (const rankedCandidate of selected) {
    const source = evaluationById.get(rankedCandidate.id)!;
    const visibleDimensions = source.ownDimensions.filter(dimension => dimensionIsVisible(dimension.dimension, visibilityByProfile.get(source.candidate.id), Boolean(viewerVerification[0])));
    const decision = buildRecommendationDecision(rankedCandidate, visibleDimensions, policy);
    let record = existingByCandidate.get(source.candidate.id);
    if (!record) {
      const insert = await db.insert(recommendations).values({ profileId, candidateProfileId: source.candidate.id, recommendationPolicyId: policyRow.id, categoryKey: decision.categoryKey, status: "active", explanationKeys: decision.explanationKeys, considerationKeys: decision.considerationKeys });
      const id = Number(insert[0]?.insertId ?? 0);
	      record = { id, profileId, candidateProfileId: source.candidate.id, recommendationPolicyId: policyRow.id, categoryKey: decision.categoryKey, status: "active" as const, explanationKeys: decision.explanationKeys, considerationKeys: decision.considerationKeys, generatedAt: new Date(), lastEvaluatedAt: new Date(), withdrawnAt: null, expiresAt: null };
	      await db.insert(recommendationEvents).values({ recommendationId: id, profileId, eventType: "generated", policyVersion: policy.policyVersion, metadata: { categoryKey: decision.categoryKey } });
	      await createAuditLog(null, "recommendation.generated", "recommendation", String(id), { policyVersion: policy.policyVersion, categoryKey: decision.categoryKey });
	      if (items.length === 0) await createNotification(viewer[0].userId, "recommendation", "A considered introduction is ready", "A privacy-safe potential introduction is available to review at your own pace.", "/app/recommendations", `recommendation:first:${profileId}:${policy.policyVersion}`);
    } else {
	      await db.update(recommendations).set({ categoryKey: decision.categoryKey, status: "active", explanationKeys: decision.explanationKeys, considerationKeys: decision.considerationKeys, lastEvaluatedAt: new Date(), withdrawnAt: null }).where(eq(recommendations.id, record.id));
	      record = { ...record, categoryKey: decision.categoryKey, status: "active", explanationKeys: decision.explanationKeys, considerationKeys: decision.considerationKeys, withdrawnAt: null };
    }
    if (!categoryVisible(record.categoryKey as RecommendationCategory, viewerSettings) || (input.category && record.categoryKey !== input.category)) continue;
    await db.insert(recommendationEvents).values({ recommendationId: record.id, profileId, eventType: "presented", policyVersion: policy.policyVersion, metadata: { categoryKey: record.categoryKey } });
	    items.push(presentRecommendation(record, source.candidate, source.identityVerified, visibilityByProfile.get(source.candidate.id), Boolean(viewerVerification[0])));
  }
  const last = candidatePool[candidatePool.length - 1];
  return { items, nextCursor: candidatePool.length > limit * 8 ? last?.id : undefined, policyVersion: policy.policyVersion };
}

function presentRecommendation(record: Pick<typeof recommendations.$inferSelect, "id" | "categoryKey" | "explanationKeys" | "considerationKeys">, candidate: typeof memberProfiles.$inferSelect, identityVerified: boolean, visibility: Map<string, string> | undefined, viewerIdentityVerified: boolean) {
  const explanations = arrayStrings(record.explanationKeys).map(memberSafeExplanation);
  const considerations = arrayStrings(record.considerationKeys).map(memberSafeConsideration);
  const locationAllowed = canViewerSeeProfileField(visibility?.get("country"), { viewerIdentityVerified, hasMutualMatch: false }) && candidate.locationVisibility === "eligible_members";
  const locationDisplay = locationAllowed ? safeLocationDisplay({ visibility: candidate.locationVisibility, detail: candidate.locationDetailLevel, countryName: candidate.country, region: candidate.region, city: candidate.city, relationship: "eligible" }) : null;
  return { id: record.id, profileId: candidate.id, categoryKey: record.categoryKey as RecommendationCategory, displayName: candidate.displayName, locationDisplay, residenceType: candidate.residenceType, photoVisibility: candidate.photoVisibility, identityVerified, explanations, considerations };
}

export async function getRecommendationExplanation(profileId: number, recommendationId: number) {
  const db = await requireDb();
  const record = await db.select().from(recommendations).where(and(eq(recommendations.id, recommendationId), eq(recommendations.profileId, profileId), eq(recommendations.status, "active"))).limit(1);
  if (!record[0]) throw new Error("This recommendation is unavailable");
  const policy = await db.select({ policyVersion: recommendationPolicies.policyVersion }).from(recommendationPolicies).where(eq(recommendationPolicies.id, record[0].recommendationPolicyId)).limit(1);
  await db.insert(recommendationEvents).values({ recommendationId, profileId, eventType: "viewed", policyVersion: policy[0]?.policyVersion ?? RECOMMENDATION_FALLBACK_VERSION });
  return { recommendationId, policyVersion: policy[0]?.policyVersion ?? RECOMMENDATION_FALLBACK_VERSION, explanations: arrayStrings(record[0].explanationKeys).map(memberSafeExplanation), considerations: arrayStrings(record[0].considerationKeys).map(memberSafeConsideration), note: "These are conversation starters based on information you can see. They are not a decision about who you should marry." };
}

export async function submitRecommendationFeedback(profileId: number, actorUserId: number, recommendationId: number, response: RecommendationFeedbackResponse) {
  const db = await requireDb();
  const record = await db.select().from(recommendations).where(and(eq(recommendations.id, recommendationId), eq(recommendations.profileId, profileId), eq(recommendations.status, "active"))).limit(1);
  if (!record[0]) throw new Error("This recommendation is unavailable");
  const nextStatus = response === "hide_profile" ? "hidden" as const : "dismissed" as const;
  await db.insert(recommendationFeedback).values({ recommendationId, profileId, response }).onDuplicateKeyUpdate({ set: { response, createdAt: new Date() } });
  await db.update(recommendations).set({ status: nextStatus, withdrawnAt: new Date() }).where(eq(recommendations.id, recommendationId));
  const policy = await db.select({ policyVersion: recommendationPolicies.policyVersion }).from(recommendationPolicies).where(eq(recommendationPolicies.id, record[0].recommendationPolicyId)).limit(1);
  await db.insert(recommendationEvents).values({ recommendationId, profileId, eventType: "feedback_recorded", policyVersion: policy[0]?.policyVersion ?? RECOMMENDATION_FALLBACK_VERSION, metadata: { response } });
  await createAuditLog(actorUserId, "recommendation.feedback_recorded", "recommendation", String(recommendationId), { response });
  return { success: true };
}

export async function recordRecommendationInterest(profileId: number, actorUserId: number, recommendationId: number, recordEvent = true) {
  const db = await requireDb();
  const record = await db.select().from(recommendations).where(and(eq(recommendations.id, recommendationId), eq(recommendations.profileId, profileId), eq(recommendations.status, "active"))).limit(1);
  if (!record[0]) throw new Error("This recommendation is unavailable");
  if (recordEvent) {
    const policy = await db.select({ policyVersion: recommendationPolicies.policyVersion }).from(recommendationPolicies).where(eq(recommendationPolicies.id, record[0].recommendationPolicyId)).limit(1);
    await db.insert(recommendationEvents).values({ recommendationId, profileId, eventType: "interest_started", policyVersion: policy[0]?.policyVersion ?? RECOMMENDATION_FALLBACK_VERSION });
    await createAuditLog(actorUserId, "recommendation.interest_started", "recommendation", String(recommendationId));
  }
  return { candidateProfileId: record[0].candidateProfileId };
}

/** Used by existing block, safety, and profile-state paths to revoke presentation without changing a match, interest, or connection state. */
export async function withdrawRecommendationsForProfilePair(profileId: number, candidateProfileId: number, reason: "block" | "report" | "safety_restriction" | "profile_hidden") {
  const db = await requireDb();
  const rows = await db.select().from(recommendations).where(and(or(and(eq(recommendations.profileId, profileId), eq(recommendations.candidateProfileId, candidateProfileId)), and(eq(recommendations.profileId, candidateProfileId), eq(recommendations.candidateProfileId, profileId))), eq(recommendations.status, "active")));
  for (const row of rows) {
    await db.update(recommendations).set({ status: "withdrawn", withdrawnAt: new Date() }).where(eq(recommendations.id, row.id));
    const policy = await db.select({ policyVersion: recommendationPolicies.policyVersion }).from(recommendationPolicies).where(eq(recommendationPolicies.id, row.recommendationPolicyId)).limit(1);
    await db.insert(recommendationEvents).values({ recommendationId: row.id, profileId: row.profileId, eventType: "withdrawn", policyVersion: policy[0]?.policyVersion ?? RECOMMENDATION_FALLBACK_VERSION, metadata: { reason } });
  }
  return { withdrawn: rows.length };
}

export async function withdrawRecommendationsForProfile(profileId: number, reason: "safety_restriction" | "profile_hidden" | "profile_changed") {
  const db = await requireDb();
  const rows = await db.select().from(recommendations).where(and(or(eq(recommendations.profileId, profileId), eq(recommendations.candidateProfileId, profileId)), eq(recommendations.status, "active")));
  for (const row of rows) await db.update(recommendations).set({ status: "withdrawn", withdrawnAt: new Date() }).where(eq(recommendations.id, row.id));
  await createAuditLog(null, "recommendation.profile_withdrawn", "member_profile", String(profileId), { reason, count: rows.length });
  return { withdrawn: rows.length };
}

const RECOMMENDATION_FALLBACK_VERSION = "recommendation-v1";
function arrayStrings(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function profileCompletenessSignals(candidate: typeof memberProfiles.$inferSelect) { return [candidate.about, candidate.marriageIntent, candidate.educationLevel, candidate.profession, candidate.lifestyle].filter(Boolean).length; }
function categoryVisible(category: RecommendationCategory, settings: typeof memberRecommendationSettings.$inferSelect) { if (category === "verified_members") return settings.showVerifiedCategory; if (category === "nearby_potential_matches") return settings.showNearbyCategory; if (category === "recently_joined") return settings.showRecentCategory; return true; }
function dimensionIsVisible(dimension: string, visibility: Map<string, string> | undefined, viewerIdentityVerified: boolean) {
  const fieldByDimension: Record<string, string> = { age: "birthDate", gender: "gender", religion: "religion", location: "country", marital_status: "maritalStatus", children: "hasChildren", desired_children: "desireChildren", relocation: "relocationWillingness", education: "educationLevel", marriage_timeline: "marriageTimeline", polygyny: "polygynyOpenness", family_involvement: "familyInvolvementPreference", lifestyle: "lifestyle", marriage_intent: "marriageIntent" };
  const key = fieldByDimension[dimension];
  return Boolean(key) && canViewerSeeProfileField(visibility?.get(key), { viewerIdentityVerified, hasMutualMatch: false });
}
