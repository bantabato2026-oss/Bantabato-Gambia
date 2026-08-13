export type ReadinessStage = "mutual_interest" | "text_conversation" | "voice_note_conversation" | "ready_for_review" | "voice_call_eligible" | "video_call_eligible";
export type ReadinessStatus = "not_ready" | "building_connection" | "ready_for_review" | "approved_voice" | "approved_video" | "declined" | "paused" | "restricted" | "revoked";

export type ReadinessPolicy = {
  minMessagesEach: number;
  minActiveDays: number;
  minActivitySpanDays: number;
  minimumParticipationRatio: number;
  minVoiceNotesEach: number;
  videoMinMessagesEach: number;
  videoMinActiveDays: number;
  videoMinVoiceNotesEach: number;
  requireIdentityVerification: boolean;
  requireVoiceNotesForReview: boolean;
  requireHumanReviewForVoice: boolean;
  requireHumanReviewForVideo: boolean;
};

export const DEFAULT_READINESS_POLICY: ReadinessPolicy = {
  minMessagesEach: 3,
  minActiveDays: 2,
  minActivitySpanDays: 2,
  minimumParticipationRatio: 0.35,
  minVoiceNotesEach: 1,
  videoMinMessagesEach: 6,
  videoMinActiveDays: 4,
  videoMinVoiceNotesEach: 2,
  requireIdentityVerification: true,
  requireVoiceNotesForReview: true,
  requireHumanReviewForVoice: false,
  requireHumanReviewForVideo: true,
};

export type ParticipantSignals = { messagesSent: number; voiceNotesSent: number; activeDays: number; firstActivityAt?: Date | null; lastActivityAt?: Date | null };
export type ReadinessGates = { noActiveBlock: boolean; noSeriousSafetyRestriction: boolean; noOpenSeriousReport: boolean; noInteractionIntegrityConcern?: boolean; accountsActive: boolean; hardCompatibilityEligible: boolean; identityVerified: boolean; voiceConsentsGranted: boolean; videoConsentsGranted: boolean };
export type ReadinessCriterion = { key: string; label: string; met: boolean };
export type ReadinessEvaluation = { stage: ReadinessStage; status: ReadinessStatus; readyForReview: boolean; voiceEligible: boolean; videoEligible: boolean; reviewRequired: boolean; criteria: ReadinessCriterion[]; memberExplanation: string };

export function evaluateConnectionReadiness(input: { policy?: Partial<ReadinessPolicy>; one: ParticipantSignals; two: ParticipantSignals; gates: ReadinessGates }): ReadinessEvaluation {
  const policy = { ...DEFAULT_READINESS_POLICY, ...input.policy };
  const one = input.one;
  const two = input.two;
  const maxMessages = Math.max(one.messagesSent, two.messagesSent);
  const balanceRatio = maxMessages ? Math.min(one.messagesSent, two.messagesSent) / maxMessages : 0;
  const participation = one.messagesSent >= policy.minMessagesEach && two.messagesSent >= policy.minMessagesEach && balanceRatio >= policy.minimumParticipationRatio;
  const activeDays = Math.min(one.activeDays, two.activeDays) >= policy.minActiveDays;
  const span = activitySpanDays(one, two) >= policy.minActivitySpanDays;
  const voice = one.voiceNotesSent >= policy.minVoiceNotesEach && two.voiceNotesSent >= policy.minVoiceNotesEach;
  const reviewEvidence = participation && activeDays && span && (!policy.requireVoiceNotesForReview || voice);
	  const safety = input.gates.noActiveBlock && input.gates.noSeriousSafetyRestriction && input.gates.noOpenSeriousReport && input.gates.noInteractionIntegrityConcern !== false && input.gates.accountsActive;
  const eligible = safety && input.gates.hardCompatibilityEligible && (!policy.requireIdentityVerification || input.gates.identityVerified);
  const readyForReview = reviewEvidence && eligible;
  const voiceEvidence = readyForReview && input.gates.voiceConsentsGranted;
  const videoEvidence = voiceEvidence && one.messagesSent >= policy.videoMinMessagesEach && two.messagesSent >= policy.videoMinMessagesEach && Math.min(one.activeDays, two.activeDays) >= policy.videoMinActiveDays && one.voiceNotesSent >= policy.videoMinVoiceNotesEach && two.voiceNotesSent >= policy.videoMinVoiceNotesEach && input.gates.videoConsentsGranted;
  const voiceEligible = voiceEvidence && !policy.requireHumanReviewForVoice;
  const videoEligible = videoEvidence && !policy.requireHumanReviewForVideo;
  const stage: ReadinessStage = videoEligible ? "video_call_eligible" : voiceEligible ? "voice_call_eligible" : readyForReview ? "ready_for_review" : voice ? "voice_note_conversation" : one.messagesSent || two.messagesSent ? "text_conversation" : "mutual_interest";
  const status: ReadinessStatus = !safety ? "restricted" : videoEligible ? "approved_video" : voiceEligible ? "approved_voice" : readyForReview ? "ready_for_review" : one.messagesSent || two.messagesSent ? "building_connection" : "not_ready";
  const reviewRequired = readyForReview && (policy.requireHumanReviewForVoice || (input.gates.videoConsentsGranted && policy.requireHumanReviewForVideo));
  const criteria: ReadinessCriterion[] = [
    { key: "mutual_participation", label: "Both members are participating in the conversation", met: participation },
    { key: "consistent_activity", label: "Interaction has been spread over time", met: activeDays && span },
    { key: "voice_participation", label: "Both members have voluntarily exchanged voice notes", met: voice },
	    { key: "safety", label: "Current safety and account checks are clear", met: safety },
	    { key: "interaction_integrity", label: "No unresolved interaction-integrity concern is open", met: input.gates.noInteractionIntegrityConcern !== false },
	    { key: "compatibility", label: "No current hard compatibility requirement is unmet", met: input.gates.hardCompatibilityEligible },
    { key: "verification", label: "Required identity verification is complete", met: !policy.requireIdentityVerification || input.gates.identityVerified },
    { key: "voice_consent", label: "Both members have chosen voice communication", met: input.gates.voiceConsentsGranted },
    { key: "video_consent", label: "Both members have chosen video communication", met: input.gates.videoConsentsGranted },
  ];
  const memberExplanation = status === "restricted" ? "Enhanced communication is currently unavailable while account or safety requirements are being addressed." : videoEligible ? "You have both continued to participate, consented to video communication, and meet the current readiness requirements." : voiceEligible ? "You have both continued to participate and consented to voice communication. Voice communication is now available when you are both comfortable." : readyForReview ? "You have both been actively getting to know each other. Your connection is ready for the next readiness step, subject to your shared communication choices." : "This connection is still building. Enhanced communication becomes available only when mutual participation, safety, and consent requirements are met.";
  return { stage, status, readyForReview, voiceEligible, videoEligible, reviewRequired, criteria, memberExplanation };
}

function activitySpanDays(one: ParticipantSignals, two: ParticipantSignals) {
  const dates = [one.firstActivityAt, one.lastActivityAt, two.firstActivityAt, two.lastActivityAt].filter((value): value is Date => Boolean(value));
  if (dates.length < 2) return 0;
  return Math.max(0, Math.ceil((Math.max(...dates.map(date => date.getTime())) - Math.min(...dates.map(date => date.getTime()))) / 86_400_000) + 1);
}
