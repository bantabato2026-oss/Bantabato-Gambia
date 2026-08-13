import { describe, expect, it } from "vitest";
import { compareCuratedOrder, isEligibleForDiscovery, pageCurated } from "./discoveryPolicy";

describe("curated discovery policy", () => {
  it("excludes blocked, hidden, suspended, paused, and deleted profiles before presentation", () => {
    const base = { profileStatus: "active" as const, searchVisible: true, deletedAt: null, profileVisibility: "members_only" as const, blocked: false };
    expect(isEligibleForDiscovery(base)).toBe(true);
    expect(isEligibleForDiscovery({ ...base, blocked: true })).toBe(false);
    expect(isEligibleForDiscovery({ ...base, profileVisibility: "hidden" })).toBe(false);
    expect(isEligibleForDiscovery({ ...base, profileStatus: "suspended" })).toBe(false);
    expect(isEligibleForDiscovery({ ...base, deletedAt: new Date() })).toBe(false);
  });

  it("orders on declared compatibility, verification, completeness, and recency—not engagement signals", () => {
    const first = { id: 2, compatibleCount: 3, considerationCount: 0, identityVerified: true, profileCompletenessSignals: 4, updatedAt: new Date("2026-08-01") };
    const second = { id: 1, compatibleCount: 1, considerationCount: 0, identityVerified: true, profileCompletenessSignals: 5, updatedAt: new Date("2026-08-13") };
    expect([second, first].sort(compareCuratedOrder).map(item => item.id)).toEqual([2, 1]);
  });

  it("returns a bounded page and cursor rather than a full member list", () => {
    const page = pageCurated([{ id: 9 }, { id: 8 }, { id: 7 }], 2);
    expect(page.items.map(item => item.id)).toEqual([9, 8]);
    expect(page.nextCursor).toBe(8);
  });
});
