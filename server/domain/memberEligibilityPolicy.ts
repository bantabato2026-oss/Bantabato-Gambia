import { MIN_APPROVED_PROFILE_PHOTOS } from "./profilePhotoPolicy";

export const ONBOARDING_STATE_VALUES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "NEEDS_ACTION", "BLOCKED", "PENDING_REVIEW", "REJECTED", "RETRY_REQUIRED"] as const;
export type OnboardingState = (typeof ONBOARDING_STATE_VALUES)[number];

type EligibilityInput = {
  profileStatus: "draft" | "under_review" | "active" | "paused" | "suspended";
  searchVisible: boolean;
  deletedAt: Date | null;
  coreProfileComplete: boolean;
  approvedPhotoCount: number;
  verificationStatus: "not_started" | "pending_review" | "approved" | "rejected" | "retry_required";
};

export function deriveMemberEligibility(input: EligibilityInput) {
  const photosRemaining = Math.max(0, MIN_APPROVED_PROFILE_PHOTOS - input.approvedPhotoCount);
  const photosComplete = photosRemaining === 0;
  const profileComplete = input.coreProfileComplete && photosComplete;
  const isSafetyRestricted = input.deletedAt !== null || input.profileStatus === "suspended";
  const isPaused = input.profileStatus === "paused" || !input.searchVisible;

  if (isSafetyRestricted) {
    return { onboardingState: "BLOCKED" as const, profileComplete: false, discoveryEligible: false, connectionEligible: false, photosComplete, approvedPhotoCount: input.approvedPhotoCount, photosRemaining, title: "Your account is not available for introductions.", detail: "Your profile cannot take part in discovery while this account status is in place.", nextAction: "Review your account status or contact support." };
  }
  if (!input.coreProfileComplete) {
    const state = input.approvedPhotoCount === 0 ? "NOT_STARTED" : "IN_PROGRESS";
    return { onboardingState: state, profileComplete: false, discoveryEligible: false, connectionEligible: false, photosComplete, approvedPhotoCount: input.approvedPhotoCount, photosRemaining, title: "Your profile isn't ready yet.", detail: "Add your profile details and approved photos to continue.", nextAction: "Complete your profile foundation." };
  }
  if (!photosComplete) {
    return { onboardingState: "NEEDS_ACTION" as const, profileComplete: false, discoveryEligible: false, connectionEligible: false, photosComplete: false, approvedPhotoCount: input.approvedPhotoCount, photosRemaining, title: "Your profile isn't ready yet.", detail: `Add ${photosRemaining} more approved photo${photosRemaining === 1 ? "" : "s"} to continue.`, nextAction: "Add photos for review." };
  }
  if (input.profileStatus === "under_review") {
    return { onboardingState: "PENDING_REVIEW" as const, profileComplete: true, discoveryEligible: false, connectionEligible: false, photosComplete: true, approvedPhotoCount: input.approvedPhotoCount, photosRemaining: 0, title: "Your profile is being reviewed.", detail: "Your required photos are present. We will update you when review is complete.", nextAction: "No action is needed right now." };
  }
  if (isPaused) {
    return { onboardingState: "COMPLETED" as const, profileComplete: true, discoveryEligible: false, connectionEligible: false, photosComplete: true, approvedPhotoCount: input.approvedPhotoCount, photosRemaining: 0, title: "Your profile is ready, and discovery is paused.", detail: "You can return to discovery whenever you are ready.", nextAction: "Resume discovery in your profile settings." };
  }
  return { onboardingState: "COMPLETED" as const, profileComplete: true, discoveryEligible: true, connectionEligible: true, photosComplete: true, approvedPhotoCount: input.approvedPhotoCount, photosRemaining: 0, title: "Your profile is ready for introductions.", detail: input.verificationStatus === "pending_review" ? "Your verification is being reviewed. You can continue while its badge remains pending." : "Your approved photos and profile details are ready for thoughtful discovery.", nextAction: "Explore considered introductions." };
}

export function desiredProfileStatusForEligibility(input: Pick<EligibilityInput, "profileStatus" | "coreProfileComplete" | "approvedPhotoCount">) {
  if (input.profileStatus === "paused" || input.profileStatus === "suspended" || input.profileStatus === "under_review") return input.profileStatus;
  return input.coreProfileComplete && input.approvedPhotoCount >= MIN_APPROVED_PROFILE_PHOTOS ? "active" : "draft";
}
