import type { CompatibilityDimension, CompatibilityResult } from "./compatibility";
import { isEligibleForDiscovery, type DiscoverableProfileState } from "./discoveryPolicy";

export const RECOMMENDATION_POLICY_VERSION = "recommendation-v1";
export const RECOMMENDATION_CATEGORIES = ["recommended_for_you", "strong_compatibility", "nearby_potential_matches", "similar_marriage_goals", "recently_joined", "verified_members", "worth_exploring"] as const;
export type RecommendationCategory = (typeof RECOMMENDATION_CATEGORIES)[number];
export type RecommendationFeedbackResponse = "not_interested" | "not_relevant" | "already_considered" | "hide_profile";

export type RecommendationWeights = {
  compatibility: number;
  verification: number;
  completeness: number;
  recency: number;
};

export type RecommendationPolicy = {
  policyVersion: string;
  categories: RecommendationCategory[];
  weights: RecommendationWeights;
  requireDiscoveryEligibility: boolean;
  excludeIntegrityHeld: boolean;
  maxPerLocationGroup: number;
};

export const DEFAULT_RECOMMENDATION_POLICY: RecommendationPolicy = {
  policyVersion: RECOMMENDATION_POLICY_VERSION,
  categories: ["recommended_for_you", "strong_compatibility", "nearby_potential_matches", "similar_marriage_goals", "recently_joined", "verified_members", "worth_exploring"],
  weights: { compatibility: 4, verification: 1, completeness: 1, recency: 1 },
  requireDiscoveryEligibility: true,
  excludeIntegrityHeld: true,
  maxPerLocationGroup: 2,
};

export const FAIRNESS_EXCLUSIONS = ["race", "ethnicity", "tribe", "skin_color", "wealth", "income", "physical_attractiveness", "popularity", "profile_views", "followers", "paid_subscription"] as const;

export type RecommendationCandidate = DiscoverableProfileState & {
  id: number;
  compatibility: CompatibilityResult;
  identityVerified: boolean;
  completenessSignals: number;
  updatedAt: Date;
  createdAt: Date;
  locationGroup?: string | null;
  integrityHeld?: boolean;
  recommendationEnabled?: boolean;
};

export type RecommendationDecision = {
  candidateId: number;
  categoryKey: RecommendationCategory;
  explanationKeys: string[];
  considerationKeys: string[];
};

/** Safety, discovery privacy, hard compatibility, and explicit opt-out gates run before all internal ordering. */
export function isEligibleForRecommendation(candidate: RecommendationCandidate, policy: RecommendationPolicy = DEFAULT_RECOMMENDATION_POLICY) {
  if (!candidate.recommendationEnabled) return false;
  if (policy.requireDiscoveryEligibility && !isEligibleForDiscovery(candidate)) return false;
  if (policy.excludeIntegrityHeld && candidate.integrityHeld) return false;
  return candidate.compatibility.eligible;
}

/** Returns ordering only; it deliberately never returns a member-facing score, percentage, or human-worth label. */
export function rankRecommendationCandidates(candidates: RecommendationCandidate[], policy: RecommendationPolicy = DEFAULT_RECOMMENDATION_POLICY, now = new Date()): RecommendationCandidate[] {
  const eligible = candidates.filter(candidate => isEligibleForRecommendation(candidate, policy));
  const ordered = [...eligible].sort((left, right) => internalPriority(right, policy, now) - internalPriority(left, policy, now) || right.updatedAt.getTime() - left.updatedAt.getTime() || right.id - left.id);
  return diversifyWithinEligibleOrder(ordered, policy.maxPerLocationGroup);
}

/** Uses only approved non-sensitive fields supplied by the caller; it has no protected-characteristic or popularity inputs. */
export function buildRecommendationDecision(candidate: RecommendationCandidate, visibleDimensions: CompatibilityDimension[], policy: RecommendationPolicy = DEFAULT_RECOMMENDATION_POLICY, now = new Date()): RecommendationDecision {
  const compatible = visibleDimensions.filter(dimension => dimension.result === "compatible").map(dimension => dimension.dimension);
  const considerations = visibleDimensions.filter(dimension => dimension.result === "consideration").map(dimension => dimension.dimension);
  return {
    candidateId: candidate.id,
    categoryKey: selectCategory(candidate, policy, now),
    explanationKeys: compatible.slice(0, 3),
    considerationKeys: considerations.slice(0, 2),
  };
}

export function memberSafeExplanation(key: string) {
  const messages: Record<string, string> = {
    marriage_intent: "You both have shared a serious marriage intention.",
    marriage_timeline: "Your stated marriage timelines appear aligned.",
    location: "Your stated location preferences appear aligned.",
    relocation: "Your relocation preferences may be compatible.",
    children: "Your stated preferences around children appear aligned.",
    desired_children: "Your stated family-planning preferences appear aligned.",
    marital_status: "Your stated marital-status preferences appear aligned.",
    polygyny: "Your stated marriage-structure preferences appear aligned.",
    family_involvement: "Your stated preferences around family involvement appear aligned.",
    religion: "A voluntarily shared faith preference appears aligned.",
    education: "An education preference appears aligned.",
    lifestyle: "Some stated lifestyle preferences appear aligned.",
    age: "Your stated age preference appears aligned.",
    gender: "Your stated gender preference appears aligned.",
  };
  return messages[key] ?? "This introduction has some stated areas of alignment worth exploring.";
}

export function memberSafeConsideration(key: string) {
  const messages: Record<string, string> = {
    location: "Something to discuss: you may have different preferences about where to live after marriage.",
    relocation: "Something to discuss: you may have different relocation preferences.",
    marriage_timeline: "Something to discuss: your marriage timelines may differ.",
    children: "Something to discuss: your preferences around children may differ.",
    desired_children: "Something to discuss: your family-planning preferences may differ.",
    family_involvement: "Something to discuss: your preferences around family involvement may differ.",
    lifestyle: "Something to discuss: some lifestyle preferences may differ.",
  };
  return messages[key] ?? "Something to discuss: a stated preference may benefit from a respectful conversation.";
}

function internalPriority(candidate: RecommendationCandidate, policy: RecommendationPolicy, now: Date) {
  const compatibility = candidate.compatibility.compatibleCount * policy.weights.compatibility - candidate.compatibility.considerationCount;
  const verification = candidate.identityVerified ? policy.weights.verification : 0;
  const completeness = Math.min(candidate.completenessSignals, 6) * policy.weights.completeness;
  const recency = isRecent(candidate.updatedAt, now) ? policy.weights.recency : 0;
  return compatibility + verification + completeness + recency;
}

function diversifyWithinEligibleOrder(candidates: RecommendationCandidate[], maxPerLocationGroup: number) {
  const seenByLocation = new Map<string, number>();
  const primary: RecommendationCandidate[] = [];
  const deferred: RecommendationCandidate[] = [];
  for (const candidate of candidates) {
    const key = candidate.locationGroup || "unspecified";
    const count = seenByLocation.get(key) ?? 0;
    if (count < maxPerLocationGroup) {
      primary.push(candidate);
      seenByLocation.set(key, count + 1);
    } else {
      deferred.push(candidate);
    }
  }
  return [...primary, ...deferred];
}

function selectCategory(candidate: RecommendationCandidate, policy: RecommendationPolicy, now: Date): RecommendationCategory {
  if (candidate.identityVerified && policy.categories.includes("verified_members")) return "verified_members";
  if (candidate.compatibility.compatibleCount >= 5 && policy.categories.includes("strong_compatibility")) return "strong_compatibility";
  if (candidate.compatibility.dimensions.some(dimension => dimension.dimension === "marriage_intent" && dimension.result === "compatible") && policy.categories.includes("similar_marriage_goals")) return "similar_marriage_goals";
  if (isRecent(candidate.createdAt, now) && policy.categories.includes("recently_joined")) return "recently_joined";
  return policy.categories.includes("recommended_for_you") ? "recommended_for_you" : "worth_exploring";
}

function isRecent(value: Date, now: Date) { return now.getTime() - value.getTime() <= 1000 * 60 * 60 * 24 * 30; }
