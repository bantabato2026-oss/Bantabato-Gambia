export type PreferenceImportance = "required" | "preferred" | "neutral" | "not_important";
export type CompatibilityState = "compatible" | "consideration" | "neutral" | "not_compatible";

export type CompatibilityProfile = {
  id: number;
  birthDate?: Date | string | null;
  gender?: "woman" | "man" | "self_described" | null;
  religion?: "muslim" | "christian" | null;
  country?: string | null;
  maritalStatus?: "never_married" | "married" | "divorced" | "widowed" | null;
  hasChildren?: boolean | null;
  desireChildren?: "yes" | "no" | "open" | "private" | null;
  relocationWillingness?: "open" | "within_gambia" | "not_open" | "discuss" | null;
  educationLevel?: string | null;
  marriageTimeline?: string | null;
  marriageIntent?: string | null;
  polygynyOpenness?: "open" | "not_open" | "discuss" | "not_applicable" | null;
  familyInvolvementPreference?: "active" | "limited" | "optional" | "private" | null;
  smokingPreference?: "no" | "occasionally" | "yes" | "private" | null;
  alcoholPreference?: "no" | "occasionally" | "yes" | "private" | null;
};

export type CompatibilityPreferences = {
  minAge?: number | null;
  maxAge?: number | null;
  preferredGenders?: string[] | null;
  preferredReligions?: string[] | null;
  preferredLocations?: string[] | null;
  preferredMaritalStatuses?: string[] | null;
  childrenPreference?: "open" | "prefer_no_children" | "open_to_children" | "not_important" | null;
  desiredChildrenPreference?: "yes" | "no" | "open" | "not_important" | null;
  preferredRelocation?: string[] | null;
  preferredEducationLevels?: string[] | null;
  preferredMarriageTimelines?: string[] | null;
  preferredPolygynyOpenness?: string[] | null;
  preferredFamilyInvolvement?: string[] | null;
  lifestylePreferences?: string[] | null;
  preferenceImportance?: Partial<Record<CompatibilityDimensionKey, PreferenceImportance>> | null;
};

export type CompatibilityDimensionKey = "age" | "gender" | "religion" | "location" | "marital_status" | "children" | "desired_children" | "relocation" | "education" | "marriage_timeline" | "polygyny" | "family_involvement" | "lifestyle" | "marriage_intent";
export type CompatibilityDimension = { dimension: CompatibilityDimensionKey; result: CompatibilityState; explanation: string; required: boolean };
export type CompatibilityResult = { eligible: boolean; dimensions: CompatibilityDimension[]; compatibleCount: number; considerationCount: number };

export function evaluateCompatibility(viewer: CompatibilityProfile, candidate: CompatibilityProfile, preferences: CompatibilityPreferences = {}): CompatibilityResult {
  const dimensions: CompatibilityDimension[] = [
    evaluateRange("age", ageOf(candidate.birthDate), preferences.minAge, preferences.maxAge, importance(preferences, "age"), "Age preference"),
    evaluateSet("gender", candidate.gender, preferences.preferredGenders, importance(preferences, "gender"), "Gender preference"),
    evaluateSet("religion", candidate.religion, preferences.preferredReligions, importance(preferences, "religion"), "Faith preference"),
    evaluateSet("location", candidate.country, preferences.preferredLocations, importance(preferences, "location"), "Location preference"),
    evaluateSet("marital_status", candidate.maritalStatus, preferences.preferredMaritalStatuses, importance(preferences, "marital_status"), "Marital-status preference"),
    evaluateChildren(candidate.hasChildren, preferences.childrenPreference, importance(preferences, "children")),
    evaluateDesiredChildren(candidate.desireChildren, preferences.desiredChildrenPreference, importance(preferences, "desired_children")),
    evaluateSet("relocation", candidate.relocationWillingness, preferences.preferredRelocation, importance(preferences, "relocation"), "Relocation preference"),
    evaluateSet("education", candidate.educationLevel, preferences.preferredEducationLevels, importance(preferences, "education"), "Education preference"),
    evaluateSet("marriage_timeline", candidate.marriageTimeline, preferences.preferredMarriageTimelines, importance(preferences, "marriage_timeline"), "Marriage-timeline preference"),
    evaluateSet("polygyny", candidate.polygynyOpenness, preferences.preferredPolygynyOpenness, importance(preferences, "polygyny"), "Marriage-structure preference"),
    evaluateSet("family_involvement", candidate.familyInvolvementPreference, preferences.preferredFamilyInvolvement, importance(preferences, "family_involvement"), "Family-involvement preference"),
    evaluateLifestyle(candidate, preferences.lifestylePreferences, importance(preferences, "lifestyle")),
    evaluateIntent(viewer.marriageIntent, candidate.marriageIntent, importance(preferences, "marriage_intent")),
  ];
  const eligible = !dimensions.some(dimension => dimension.required && dimension.result === "not_compatible");
  return {
    eligible,
    dimensions,
    compatibleCount: dimensions.filter(dimension => dimension.result === "compatible").length,
    considerationCount: dimensions.filter(dimension => dimension.result === "consideration").length,
  };
}

export function evaluatePair(viewer: CompatibilityProfile, candidate: CompatibilityProfile, viewerPreferences: CompatibilityPreferences = {}, candidatePreferences: CompatibilityPreferences = {}): CompatibilityResult {
  const viewerResult = evaluateCompatibility(viewer, candidate, viewerPreferences);
  const candidateResult = evaluateCompatibility(candidate, viewer, candidatePreferences);
  const dimensions = [...viewerResult.dimensions, ...candidateResult.dimensions.map(dimension => ({ ...dimension, explanation: dimension.result === "not_compatible" ? "This may need a respectful conversation before an introduction." : dimension.explanation }))];
  return {
    eligible: viewerResult.eligible && candidateResult.eligible,
    dimensions,
    compatibleCount: dimensions.filter(dimension => dimension.result === "compatible").length,
    considerationCount: dimensions.filter(dimension => dimension.result === "consideration").length,
  };
}

function importance(preferences: CompatibilityPreferences, dimension: CompatibilityDimensionKey): PreferenceImportance {
  return preferences.preferenceImportance?.[dimension] ?? "preferred";
}

function evaluateRange(dimension: CompatibilityDimensionKey, value: number | undefined, min: number | null | undefined, max: number | null | undefined, level: PreferenceImportance, label: string): CompatibilityDimension {
  if (level === "not_important" || (min == null && max == null)) return neutral(dimension, label, level);
  if (value === undefined) return missing(dimension, label, level);
  const matches = (min == null || value >= min) && (max == null || value <= max);
  return evaluated(dimension, matches, label, level);
}

function evaluateSet(dimension: CompatibilityDimensionKey, value: string | null | undefined, desired: string[] | null | undefined, level: PreferenceImportance, label: string): CompatibilityDimension {
  if (level === "not_important" || !desired?.length) return neutral(dimension, label, level);
  if (!value) return missing(dimension, label, level);
  return evaluated(dimension, desired.includes(value), label, level);
}

function evaluateChildren(hasChildren: boolean | null | undefined, preference: CompatibilityPreferences["childrenPreference"], level: PreferenceImportance): CompatibilityDimension {
  if (level === "not_important" || !preference || preference === "open" || preference === "not_important") return neutral("children", "Children preference", level);
  if (hasChildren == null) return missing("children", "Children preference", level);
  const matches = preference === "open_to_children" || (preference === "prefer_no_children" && !hasChildren);
  return evaluated("children", matches, "Children preference", level);
}

function evaluateDesiredChildren(value: CompatibilityProfile["desireChildren"], preference: CompatibilityPreferences["desiredChildrenPreference"], level: PreferenceImportance): CompatibilityDimension {
  if (level === "not_important" || !preference || preference === "not_important") return neutral("desired_children", "Desire-for-children preference", level);
  if (!value || value === "private") return missing("desired_children", "Desire-for-children preference", level);
  return evaluated("desired_children", preference === "open" || value === "open" || value === preference, "Desire-for-children preference", level);
}

function evaluateLifestyle(candidate: CompatibilityProfile, desired: string[] | null | undefined, level: PreferenceImportance): CompatibilityDimension {
  if (level === "not_important" || !desired?.length) return neutral("lifestyle", "Lifestyle preference", level);
  const offered = [candidate.smokingPreference, candidate.alcoholPreference].filter(Boolean) as string[];
  if (!offered.length) return missing("lifestyle", "Lifestyle preference", level);
  return evaluated("lifestyle", desired.every(value => offered.includes(value)), "Lifestyle preference", level);
}

function evaluateIntent(viewerIntent: string | null | undefined, candidateIntent: string | null | undefined, level: PreferenceImportance): CompatibilityDimension {
  if (level === "not_important" || !viewerIntent?.trim()) return neutral("marriage_intent", "Marriage intention", level);
  if (!candidateIntent?.trim()) return missing("marriage_intent", "Marriage intention", level);
  return { dimension: "marriage_intent", result: "compatible", explanation: "Both members have shared a marriage intention.", required: level === "required" };
}

function evaluated(dimension: CompatibilityDimensionKey, matches: boolean, label: string, level: PreferenceImportance): CompatibilityDimension {
  if (matches) return { dimension, result: "compatible", explanation: `${label} appears aligned.`, required: level === "required" };
  return { dimension, result: level === "required" ? "not_compatible" : "consideration", explanation: level === "required" ? `${label} does not meet a stated requirement.` : `${label} may be worth discussing.`, required: level === "required" };
}

function neutral(dimension: CompatibilityDimensionKey, label: string, level: PreferenceImportance): CompatibilityDimension {
  return { dimension, result: "neutral", explanation: `${label} is not currently being used as a deciding factor.`, required: level === "required" };
}

function missing(dimension: CompatibilityDimensionKey, label: string, level: PreferenceImportance): CompatibilityDimension {
  return { dimension, result: level === "required" ? "not_compatible" : "neutral", explanation: level === "required" ? `${label} has not been shared, so this requirement cannot be confirmed.` : `${label} has not been shared.`, required: level === "required" };
}

function ageOf(birthDate: Date | string | null | undefined) {
  if (!birthDate) return undefined;
  const date = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  if (today.getMonth() < date.getMonth() || (today.getMonth() === date.getMonth() && today.getDate() < date.getDate())) age -= 1;
  return age;
}
