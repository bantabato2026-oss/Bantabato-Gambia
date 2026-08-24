export type ActivationEligibility = {
  journeyState?: string;
  discoveryEligible?: boolean;
  title?: string;
  detail?: string;
  nextAction?: string;
};

export type ActivationJourneyAction = {
  href: string;
  label: string;
  unavailable: boolean;
};

/**
 * Converts the existing server-derived activation state into a member-safe UI
 * handoff. The client never computes eligibility; it only chooses the next
 * protected route for the state the server has already returned.
 */
export function getActivationJourneyAction(eligibility?: ActivationEligibility | null): ActivationJourneyAction {
  if (eligibility?.discoveryEligible) return { href: "/app/discover", label: "Explore members", unavailable: false };
  switch (eligibility?.journeyState) {
    case "DISCOVERY_READY": return { href: "/app", label: "Review readiness", unavailable: true };
    case "PAUSED": return { href: "/app/profile", label: "Manage visibility", unavailable: false };
    case "SUSPENDED": return { href: "/app/settings", label: "Review account status", unavailable: true };
    case "PENDING_REVIEW": return { href: "/app/verification", label: "Review verification", unavailable: false };
    case "PHOTOS_INCOMPLETE": return { href: "/app/photos", label: "Manage photos", unavailable: false };
    case "PROFILE_INCOMPLETE":
    case "NEW":
    default: return { href: "/app/onboarding", label: eligibility?.nextAction || "Complete profile", unavailable: false };
  }
}
