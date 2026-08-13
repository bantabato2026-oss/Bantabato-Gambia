export type DiscoverableProfileState = { profileStatus: "active" | "draft" | "under_review" | "paused" | "suspended"; searchVisible: boolean; deletedAt?: Date | null; profileVisibility: "public" | "members_only" | "hidden"; blocked: boolean };
export type CuratedOrderItem = { compatibleCount: number; considerationCount: number; identityVerified: boolean; profileCompletenessSignals: number; updatedAt: Date; id: number };

export function isEligibleForDiscovery(profile: DiscoverableProfileState) {
  return profile.profileStatus === "active" && profile.searchVisible && !profile.deletedAt && profile.profileVisibility !== "hidden" && !profile.blocked;
}

/** Deterministic ordering only; no popularity, appearance, ethnicity, wealth, payment, or engagement input is accepted. */
export function compareCuratedOrder(left: CuratedOrderItem, right: CuratedOrderItem) {
  if (right.compatibleCount !== left.compatibleCount) return right.compatibleCount - left.compatibleCount;
  if (left.considerationCount !== right.considerationCount) return left.considerationCount - right.considerationCount;
  if (Number(right.identityVerified) !== Number(left.identityVerified)) return Number(right.identityVerified) - Number(left.identityVerified);
  if (right.profileCompletenessSignals !== left.profileCompletenessSignals) return right.profileCompletenessSignals - left.profileCompletenessSignals;
  if (right.updatedAt.getTime() !== left.updatedAt.getTime()) return right.updatedAt.getTime() - left.updatedAt.getTime();
  return right.id - left.id;
}

export function pageCurated<T extends { id: number }>(items: T[], limit: number) {
  const page = items.slice(0, limit);
  return { items: page, nextCursor: items.length > limit ? page.at(-1)?.id : undefined };
}
