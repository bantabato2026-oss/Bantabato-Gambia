import { describe, expect, it } from "vitest";
import { getActivationJourneyAction } from "./activationJourney";

describe("getActivationJourneyAction", () => {
  it("keeps a new or profile-incomplete member in private onboarding", () => {
    expect(getActivationJourneyAction({ journeyState: "NEW", discoveryEligible: false })).toEqual({ href: "/app/onboarding", label: "Complete profile", unavailable: false });
    expect(getActivationJourneyAction({ journeyState: "PROFILE_INCOMPLETE", nextAction: "Finish profile details" })).toEqual({ href: "/app/onboarding", label: "Finish profile details", unavailable: false });
  });

  it("routes each server-derived activation state to its specific protected recovery surface", () => {
    expect(getActivationJourneyAction({ journeyState: "PHOTOS_INCOMPLETE" })).toEqual({ href: "/app/photos", label: "Manage photos", unavailable: false });
    expect(getActivationJourneyAction({ journeyState: "PENDING_REVIEW" })).toEqual({ href: "/app/verification", label: "Review verification", unavailable: false });
    expect(getActivationJourneyAction({ journeyState: "PAUSED" })).toEqual({ href: "/app/profile", label: "Manage visibility", unavailable: false });
    expect(getActivationJourneyAction({ journeyState: "SUSPENDED" })).toEqual({ href: "/app/settings", label: "Review account status", unavailable: true });
  });

  it("opens discovery only when the server states current discovery eligibility", () => {
    expect(getActivationJourneyAction({ journeyState: "DISCOVERY_READY", discoveryEligible: true })).toEqual({ href: "/app/discover", label: "Explore members", unavailable: false });
    expect(getActivationJourneyAction({ journeyState: "DISCOVERY_READY", discoveryEligible: false })).toEqual({ href: "/app", label: "Review readiness", unavailable: true });
  });
});
