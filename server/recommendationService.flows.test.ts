import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), createAuditLog: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb, createAuditLog: mocks.createAuditLog }));

import { recordRecommendationInterest, saveRecommendationSettings, submitRecommendationFeedback, withdrawRecommendationsForProfile, withdrawRecommendationsForProfilePair } from "./recommendationService";

function fakeDb(rows: unknown[][]) {
  const inserts: Array<{ table: unknown; values: Record<string, unknown> }> = [];
  const updates: Array<{ table: unknown; values: Record<string, unknown> }> = [];
  const select = () => {
    const result = rows.shift() ?? [];
    const query = { limit: async () => result, orderBy: async () => result, then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) };
    return { from: () => ({ where: () => query }) };
  };
  const insert = (table: unknown) => ({ values: (values: Record<string, unknown>) => { inserts.push({ table, values }); return Object.assign([{ insertId: inserts.length }], { onDuplicateKeyUpdate: async () => undefined }); } });
  const update = (table: unknown) => ({ set: (values: Record<string, unknown>) => ({ where: async () => { updates.push({ table, values }); } }) });
  return { db: { select, insert, update }, inserts, updates };
}

const recommendation = { id: 81, profileId: 3, candidateProfileId: 4, recommendationPolicyId: 7, status: "active" as const, categoryKey: "recommended_for_you", explanationKeys: ["marriage_intent"], considerationKeys: [] };

describe("Phase 7 recommendation service flows", () => {
  beforeEach(() => vi.clearAllMocks());

  it("records member feedback as a personal discovery action, withdraws the item, and never changes a candidate profile or match", async () => {
    const fake = fakeDb([[recommendation], [{ policyVersion: "recommendation-v1" }]]);
    mocks.getDb.mockResolvedValue(fake.db);
    await expect(submitRecommendationFeedback(3, 44, 81, "not_interested")).resolves.toEqual({ success: true });

    expect(fake.inserts.some(entry => entry.values.recommendationId === 81 && entry.values.profileId === 3 && entry.values.response === "not_interested")).toBe(true);
    expect(fake.updates.some(entry => entry.values.status === "dismissed" && entry.values.withdrawnAt instanceof Date)).toBe(true);
    expect(fake.inserts.some(entry => entry.values.eventType === "feedback_recorded" && entry.values.policyVersion === "recommendation-v1")).toBe(true);
    expect(mocks.createAuditLog).toHaveBeenCalledWith(44, "recommendation.feedback_recorded", "recommendation", "81", { response: "not_interested" });
  });

  it("turns a member hide action into an immediate private feed exclusion without assigning a negative label to the other member", async () => {
    const fake = fakeDb([[recommendation], [{ policyVersion: "recommendation-v1" }]]);
    mocks.getDb.mockResolvedValue(fake.db);
    await submitRecommendationFeedback(3, 44, 81, "hide_profile");

    expect(fake.updates.some(entry => entry.values.status === "hidden")).toBe(true);
    expect(fake.inserts.some(entry => entry.values.response === "hide_profile")).toBe(true);
	    expect(fake.inserts.flatMap(entry => Object.keys(entry.values))).not.toEqual(expect.arrayContaining(["candidate_label", "negative_score", "character"]));
  });

  it("records a recommendation-originated introduction before handing the request to the existing mutual-interest process", async () => {
    const fake = fakeDb([[recommendation], [{ policyVersion: "recommendation-v1" }]]);
    mocks.getDb.mockResolvedValue(fake.db);
    await expect(recordRecommendationInterest(3, 44, 81)).resolves.toEqual({ candidateProfileId: 4 });

    expect(fake.inserts.some(entry => entry.values.eventType === "interest_started" && entry.values.recommendationId === 81)).toBe(true);
    expect(mocks.createAuditLog).toHaveBeenCalledWith(44, "recommendation.interest_started", "recommendation", "81");
  });

  it("withdraws both sides of an active recommendation pair immediately on a block or relevant report without touching interest or connection records", async () => {
    const reverse = { ...recommendation, id: 82, profileId: 4, candidateProfileId: 3 };
    const fake = fakeDb([[recommendation, reverse], [{ policyVersion: "recommendation-v1" }], [{ policyVersion: "recommendation-v1" }]]);
    mocks.getDb.mockResolvedValue(fake.db);
    await expect(withdrawRecommendationsForProfilePair(3, 4, "block")).resolves.toEqual({ withdrawn: 2 });

    expect(fake.updates.filter(entry => entry.values.status === "withdrawn")).toHaveLength(2);
    expect(fake.inserts.filter(entry => entry.values.eventType === "withdrawn" && (entry.values.metadata as { reason?: string }).reason === "block")).toHaveLength(2);
	    expect(fake.updates.flatMap(entry => Object.keys(entry.values))).not.toEqual(expect.arrayContaining(["matchId", "conversationId", "voiceEligible", "videoEligible"]));
  });

  it("withdraws all active recommendations for a safety-restricted profile and records metadata-only audit evidence", async () => {
    const fake = fakeDb([[recommendation, { ...recommendation, id: 82, profileId: 5, candidateProfileId: 3 }]]);
    mocks.getDb.mockResolvedValue(fake.db);
    await expect(withdrawRecommendationsForProfile(3, "safety_restriction")).resolves.toEqual({ withdrawn: 2 });

    expect(fake.updates.filter(entry => entry.values.status === "withdrawn")).toHaveLength(2);
    expect(mocks.createAuditLog).toHaveBeenCalledWith(null, "recommendation.profile_withdrawn", "member_profile", "3", { reason: "safety_restriction", count: 2 });
  });

  it("keeps recommendation presentation settings separate from discovery safety and matching state", async () => {
    const fake = fakeDb([[] , [{ id: 1, profileId: 3, recommendationsEnabled: false, showVerifiedCategory: true, showNearbyCategory: false, showRecentCategory: true }]]);
    mocks.getDb.mockResolvedValue(fake.db);
    const result = await saveRecommendationSettings(3, 44, { recommendationsEnabled: false, showVerifiedCategory: true, showNearbyCategory: false, showRecentCategory: true });

    expect(fake.inserts.some(entry => entry.values.profileId === 3 && entry.values.recommendationsEnabled === false)).toBe(true);
    expect(result.recommendationsEnabled).toBe(false);
    expect(mocks.createAuditLog).toHaveBeenCalledWith(44, "recommendation.settings_updated", "member_recommendation_settings", "3");
  });
});
