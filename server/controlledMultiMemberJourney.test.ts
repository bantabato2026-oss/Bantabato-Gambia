import { describe, expect, it } from "vitest";
import { createControlledMultiMemberJourney, runControlledMultiMemberJourney } from "./controlledMultiMemberJourney";

describe("Sprint 45 deterministic multi-member lifecycle harness", () => {
  it("creates only fictional deterministic members A through J and never invokes production boundaries", () => {
    const journey = createControlledMultiMemberJourney();
    expect([...journey.members.keys()]).toEqual(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]);
    expect([...journey.members.values()].every(member => member.email.endsWith("@example.test"))).toBe(true);
    expect(journey.fixedNow.toISOString()).toBe("2026-08-24T12:00:00.000Z");
    expect(journey.external).toEqual({ providerCalls: 0, communications: 0, payments: 0, documents: 0, productionMutations: 0 });
    expect(journey.policy.premiumNeutral).toBe(true);
  });

  it("derives the required activation matrix without allowing incomplete, photo-incomplete, review, paused, restricted, or suspended members into discovery", () => {
    const journey = createControlledMultiMemberJourney();
    expect(journey.eligibility("A")).toMatchObject({ journeyState: "DISCOVERY_READY", discoveryEligible: true, connectionEligible: true });
    expect(journey.eligibility("B")).toMatchObject({ journeyState: "DISCOVERY_READY", discoveryEligible: true });
    expect(journey.eligibility("D")).toMatchObject({ journeyState: "NEW", discoveryEligible: false });
    expect(journey.eligibility("E")).toMatchObject({ journeyState: "PHOTOS_INCOMPLETE", discoveryEligible: false, photosRemaining: 1 });
    expect(journey.eligibility("F")).toMatchObject({ journeyState: "PENDING_REVIEW", discoveryEligible: false });
    expect(journey.eligibility("G")).toMatchObject({ journeyState: "PAUSED", discoveryEligible: false });
    expect(journey.eligibility("I")).toMatchObject({ journeyState: "SUSPENDED", discoveryEligible: false });
    expect(journey.discovery("A", "B").eligible).toBe(true);
    for (const member of ["C", "D", "E", "F", "G", "H", "I"] as const) expect(journey.discovery("A", member).eligible).toBe(false);
  });

  it("uses reciprocal compatibility and approved display-name search with privacy-safe coarse location", () => {
    const journey = createControlledMultiMemberJourney();
    expect(journey.discovery("A", "B").projection).toMatchObject({ displayName: "Member B", locationDisplay: null });
    expect(journey.discovery("A", "C").eligible).toBe(false);
    expect(journey.search("A", "member b").map(result => result?.displayName)).toEqual(["Member B"]);
    const profileValues = Object.values(journey.discovery("A", "B").projection ?? {});
    expect(profileValues).not.toContain("Synthetic City");
    expect(profileValues).not.toContain("The Gambia");
  });

  it("connects A to B exactly once, keeps duplicate interest/message requests idempotent, and gates communication on mutual connection", () => {
    const journey = createControlledMultiMemberJourney();
    const first = journey.sendInterest("A", "B", "interest-a-b-1");
    const duplicateInterest = journey.sendInterest("A", "B", "interest-a-b-1");
    expect(first).toMatchObject({ state: "pending", duplicate: false });
    expect(duplicateInterest).toMatchObject({ state: "pending", duplicate: true });
    expect(() => journey.sendMessage("A", "B", "message-1")).toThrow("Conversation is unavailable");
    expect(journey.acceptInterest("A", "B")).toMatchObject({ matched: true, duplicate: false });
    expect(journey.acceptInterest("A", "B")).toMatchObject({ matched: true, duplicate: true });
    const message = journey.sendMessage("A", "B", "message-1");
    expect(message.duplicate).toBe(false);
    expect(journey.sendMessage("A", "B", "message-1").duplicate).toBe(true);
    expect(journey.audit.filter(item => item === "connection:A:B")).toHaveLength(1);
  });

  it("keeps readiness consent separate and allows Family Circle sharing only after an active connection", () => {
    const journey = createControlledMultiMemberJourney();
    expect(() => journey.grantReadiness("A", "B")).toThrow("Readiness is unavailable");
    journey.sendInterest("A", "B", "interest-a-b-1");
    journey.acceptInterest("A", "B");
    expect(journey.grantReadiness("A", "B")).toMatchObject({ readyForReview: true });
    expect(journey.shareFamily("A", "B")).toEqual({ shared: true });
    expect(journey.members.get("A")?.privateMarriageIntent).toBe("seeking_marriage");
    journey.setMarriageIntent("A", "engaged");
    expect(journey.members.get("A")?.privateMarriageIntent).toBe("engaged");
  });

  it("propagates safety revocation across discovery, recommendation, messaging, readiness, Family Circle, and recovery without exposing a reason", () => {
    const journey = createControlledMultiMemberJourney();
    journey.sendInterest("A", "B", "interest-a-b-1");
    journey.acceptInterest("A", "B");
    journey.grantReadiness("A", "B");
    journey.shareFamily("A", "B");
    const result = journey.block("A", "B");
    expect(result).toMatchObject({ blocked: true, messaging: "unavailable", readiness: "revoked", familyShare: false, recommendationPresent: false });
    expect(journey.discovery("A", "B").eligible).toBe(false);
    expect(journey.recoverConnection("A", "B")).toEqual({ state: "unavailable", privateReason: null });
    expect(() => journey.sendMessage("A", "B", "message-after-block")).toThrow("Conversation is unavailable");
    expect(() => journey.shareFamily("A", "B")).toThrow("Only an active mutual connection can be shared with Family Circle");
  });

  it("exercises withdrawal, decline, blocked, restricted, suspended, and long-distance negative paths deterministically", () => {
    const withdrawn = createControlledMultiMemberJourney();
    withdrawn.sendInterest("A", "B", "interest-a-b-1");
    expect(withdrawn.withdrawInterest("A", "B")).toEqual({ withdrawn: true });
    expect(() => withdrawn.acceptInterest("A", "B")).toThrow("This introduction is no longer available");

    const restricted = createControlledMultiMemberJourney();
    expect(() => restricted.sendInterest("A", "H", "interest-a-h-1")).toThrow("This introduction is unavailable");
    expect(() => restricted.sendInterest("A", "I", "interest-a-i-1")).toThrow("This introduction is unavailable");

    const longDistance = createControlledMultiMemberJourney();
    const memberB = longDistance.members.get("B");
    if (!memberB) throw new Error("Synthetic member B missing");
    memberB.international = { residenceCountryId: 3, longDistancePreference: "prefer_nearby", preferredDiscoveryCountryIds: new Set([3]) };
    expect(longDistance.discovery("A", "B").eligible).toBe(false);
    expect(() => longDistance.sendInterest("A", "B", "interest-a-b-distance")).toThrow("This introduction is unavailable");
  });

  it("emits factual CI-shaped scenario records for the connected journey without fabricated metrics", () => {
    const results = runControlledMultiMemberJourney();
    expect(results).toHaveLength(8);
    expect(results.every(result => result.pass && result.failureReason === null)).toBe(true);
    expect(results.every(result => result.scenarioName && result.startingState && result.actions.length > 0 && result.expectedResult && result.actualResult !== undefined)).toBe(true);
  });
});
