export type InternationalDiscoveryState = {
  residenceCountryId: number | null;
  longDistancePreference: "open" | "prefer_nearby" | "no_preference";
  preferredDiscoveryCountryIds: ReadonlySet<number>;
};

/**
 * This is a reciprocal eligibility gate, not a rank or a location score.
 * It uses country identifiers only and never introduces precise-location data.
 */
export function permitsInternationalDiscovery(viewer: InternationalDiscoveryState, candidate: InternationalDiscoveryState) {
  if (!viewer.residenceCountryId || !candidate.residenceCountryId) return true;
  const sameCountry = viewer.residenceCountryId === candidate.residenceCountryId;
  const viewerCountryChoice = viewer.preferredDiscoveryCountryIds.size === 0 || viewer.preferredDiscoveryCountryIds.has(candidate.residenceCountryId);
  const candidateCountryChoice = candidate.preferredDiscoveryCountryIds.size === 0 || candidate.preferredDiscoveryCountryIds.has(viewer.residenceCountryId);
  const viewerDistanceChoice = viewer.longDistancePreference !== "prefer_nearby" || sameCountry;
  const candidateDistanceChoice = candidate.longDistancePreference !== "prefer_nearby" || sameCountry;
  return viewerCountryChoice && candidateCountryChoice && viewerDistanceChoice && candidateDistanceChoice;
}
