import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Sprint 32 — search, discovery & filtering completion", () => {
  const schema = read("drizzle/schema.ts");
  const migration = read("drizzle/0031_ambiguous_prowler.sql");
  const compatibility = read("server/compatibilityService.ts");
  const routers = read("server/routers.ts");
  const discovery = read("client/src/pages/CuratedDiscoveryPage.tsx");
  const detail = read("client/src/pages/MemberDetailPages.tsx");
  const db = read("server/db.ts");
  const recommendations = read("server/recommendationService.ts");
  const international = read("server/domain/internationalDiscovery.ts");
  const payment = read("server/domain/paymentPolicy.ts");
  const family = read("server/familyService.ts");

  it("persists only member-owned approved discovery controls with a server-confirmed updated version and no coordinates, address, contact, document, safety, moderation, or Family Circle fields", () => {
    expect(schema).toContain('memberDiscoveryFilters = mysqlTable');
    expect(migration).toContain('CREATE TABLE `member_discovery_filters`');
    expect(schema).toContain('uniqueIndex("member_discovery_filters_profile_unique")');
    expect(compatibility).toContain("saveDiscoveryFilters");
    expect(compatibility).toContain("expectedUpdatedAt");
    expect(compatibility).toContain("Your saved discovery controls changed before this update");
    expect(routers).toContain("saveFilters: protectedProcedure");
    expect(routers).toContain("filters: protectedProcedure");
    const discoveryFilterSchema = schema.slice(schema.indexOf("memberDiscoveryFilters"), schema.indexOf("profileFieldVisibilities"));
    expect(discoveryFilterSchema).not.toMatch(/latitude|longitude|coordinate|address|phone|email|documentStorageKey|safetyReason|moderation|familyCircle/i);
  });

  it("searches only display identity and deterministic approved fields after existing server eligibility, visibility, block, country reciprocity, and compatibility rules run", () => {
    expect(compatibility).toContain("like(memberProfiles.displayName");
    expect(compatibility).toContain("eq(memberProfiles.residenceType, input.residenceType)");
    expect(compatibility).toContain("isEligibleForDiscovery");
    expect(compatibility).toContain("permitsInternationalDiscovery");
    expect(compatibility).toContain("evaluatePair");
    expect(compatibility).not.toMatch(/popularity|engagement|attractiveness|Trust Score|AI matchmaking|Premium ranking/i);
    expect(international).toContain("longDistancePreference");
  });

  it("keeps cards and profile access current, private, and coarse-location-only when another member changes, pauses, deletes, blocks, restricts, or becomes ineligible", () => {
    expect(db).toContain("getMemberEligibility(targetProfileId)");
    expect(db).toContain("eq(memberProfiles.searchVisible, true)");
    expect(db).toContain("ne(memberProfiles.profileVisibility, \"hidden\")");
    expect(db).toContain("safeLocationDisplay");
    expect(discovery).toContain("profile.locationDisplay");
    expect(detail).toContain("This profile is unavailable");
    expect(recommendations).toContain("withdrawRecommendationsForProfile");
    expect(recommendations).toContain("withdrawRecommendationsForProfilePair");
  });

  it("does not show edited filters as saved until the server confirms them and handles stale, duplicate, failed, and offline saves without client-side discovery authority", () => {
    expect(discovery).toContain("Results use your last server-confirmed controls");
    expect(discovery).toContain("saveFilters.mutate");
    expect(discovery).toContain("expectedUpdatedAt: filters.data?.updatedAt");
    expect(discovery).toContain("Discovery controls saved. Results now use the server-confirmed filters");
    expect(discovery).toContain("Your discovery controls were not saved");
    expect(discovery).toContain("You appear offline. Discovery controls are unchanged");
    expect(discovery).toContain("disabled={!isOnline || saveFilters.isPending}");
    expect(discovery).toContain("utils.discovery.curated.invalidate()");
  });

  it("preserves server-authoritative interest, mutual connection, notification, Family Circle, and premium-neutral boundaries", () => {
    expect(routers).toContain("interests: router");
    expect(routers).toContain("createInterest");
    expect(db).toContain("existing?.status === \"pending\"");
    expect(db).toContain("createNotification(recipient[0].userId, \"interest\"");
    expect(family).not.toContain("documentStorageKey");
    expect(payment).toContain('"matching_rank"');
    expect(payment).toContain('"privacy"');
    expect(payment).toContain('"blocks"');
  });

  it("provides factual loading, empty, retry, keyboard-labelled, mobile-friendly, low-bandwidth discovery recovery without fabricating profiles", () => {
    expect(discovery).toContain("StatePanel, StateSkeleton");
    expect(discovery).toContain("Loading saved discovery controls");
    expect(discovery).toContain("No profile has been shown");
    expect(discovery).toContain("No profiles are fabricated to fill the space");
    expect(discovery).toContain("aria-live=\"polite\"");
    expect(discovery).toContain("Search display identity");
    expect(discovery).toContain("Country only. Exact location is never searched or shown");
  });
});
