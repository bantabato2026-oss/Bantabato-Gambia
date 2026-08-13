import { describe, expect, it } from "vitest";
import { DEFAULT_READINESS_POLICY, evaluateConnectionReadiness } from "./readinessPolicy";

const participant = { messagesSent: 5, voiceNotesSent: 2, activeDays: 3, firstActivityAt: new Date("2026-08-01"), lastActivityAt: new Date("2026-08-04") };
const gates = { noActiveBlock: true, noSeriousSafetyRestriction: true, noOpenSeriousReport: true, accountsActive: true, hardCompatibilityEligible: true, identityVerified: true, voiceConsentsGranted: true, videoConsentsGranted: true };

describe("connection readiness policy", () => {
  it("requires balanced mutual participation rather than a single member's message volume", () => {
    const evaluation = evaluateConnectionReadiness({ one: { ...participant, messagesSent: 20 }, two: { ...participant, messagesSent: 1 }, gates });
    expect(evaluation.readyForReview).toBe(false);
    expect(evaluation.criteria.find(item => item.key === "mutual_participation")?.met).toBe(false);
  });

  it("requires interaction to be consistent over time", () => {
    const sameDay = new Date("2026-08-04");
    const evaluation = evaluateConnectionReadiness({ one: { ...participant, firstActivityAt: sameDay, lastActivityAt: sameDay }, two: { ...participant, firstActivityAt: sameDay, lastActivityAt: sameDay }, gates });
    expect(evaluation.readyForReview).toBe(false);
  });

  it("requires reciprocal voice participation when the policy asks for it", () => {
    const evaluation = evaluateConnectionReadiness({ one: participant, two: { ...participant, voiceNotesSent: 0 }, gates });
    expect(evaluation.readyForReview).toBe(false);
  });

  it("blocks readiness when safety, account, or hard compatibility gates fail", () => {
    const evaluation = evaluateConnectionReadiness({ one: participant, two: participant, gates: { ...gates, noActiveBlock: false } });
    expect(evaluation.status).toBe("restricted");
    expect(evaluation.voiceEligible).toBe(false);
  });

  it("keeps consent independent from participation and premium status", () => {
    const evaluation = evaluateConnectionReadiness({ one: participant, two: participant, gates: { ...gates, voiceConsentsGranted: false } });
    expect(evaluation.readyForReview).toBe(true);
    expect(evaluation.voiceEligible).toBe(false);
    expect(DEFAULT_READINESS_POLICY).not.toHaveProperty("premium");
  });

  it("keeps video stricter and human-reviewed by the default policy", () => {
    const evaluation = evaluateConnectionReadiness({ one: { ...participant, messagesSent: 8, voiceNotesSent: 3, activeDays: 5 }, two: { ...participant, messagesSent: 8, voiceNotesSent: 3, activeDays: 5 }, gates });
    expect(evaluation.voiceEligible).toBe(true);
    expect(evaluation.videoEligible).toBe(false);
    expect(evaluation.reviewRequired).toBe(true);
  });

  it("returns a member-safe explanation without numerical scores or risk details", () => {
    const explanation = evaluateConnectionReadiness({ one: participant, two: participant, gates }).memberExplanation;
    expect(explanation).not.toMatch(/score|ratio|risk|threshold/i);
  });

  it("begins at mutual interest before either member communicates", () => {
    const empty = { messagesSent: 0, voiceNotesSent: 0, activeDays: 0 };
    const evaluation = evaluateConnectionReadiness({ one: empty, two: empty, gates });
    expect(evaluation.stage).toBe("mutual_interest");
    expect(evaluation.status).toBe("not_ready");
  });

  it("treats a serious report or safety restriction as a blocking gate", () => {
    const reported = evaluateConnectionReadiness({ one: participant, two: participant, gates: { ...gates, noOpenSeriousReport: false } });
    const restricted = evaluateConnectionReadiness({ one: participant, two: participant, gates: { ...gates, noSeriousSafetyRestriction: false } });
    expect(reported.status).toBe("restricted");
    expect(restricted.voiceEligible).toBe(false);
  });

  it("does not retain enhanced eligibility when consent is withdrawn", () => {
    const evaluation = evaluateConnectionReadiness({ one: participant, two: participant, gates: { ...gates, voiceConsentsGranted: false, videoConsentsGranted: false } });
    expect(evaluation.readyForReview).toBe(true);
    expect(evaluation.voiceEligible).toBe(false);
    expect(evaluation.videoEligible).toBe(false);
  });

  it("does not qualify a suspended account or a new hard incompatibility", () => {
    const suspended = evaluateConnectionReadiness({ one: participant, two: participant, gates: { ...gates, accountsActive: false } });
    const incompatible = evaluateConnectionReadiness({ one: participant, two: participant, gates: { ...gates, hardCompatibilityEligible: false } });
    expect(suspended.status).toBe("restricted");
    expect(incompatible.readyForReview).toBe(false);
  });

  it("allows a policy to require human approval for voice without automatically unlocking it", () => {
    const evaluation = evaluateConnectionReadiness({ policy: { requireHumanReviewForVoice: true }, one: participant, two: participant, gates });
    expect(evaluation.readyForReview).toBe(true);
    expect(evaluation.reviewRequired).toBe(true);
    expect(evaluation.voiceEligible).toBe(false);
  });

	it("does not treat a burst of extra messages as an anti-gaming bypass", () => {
	  const burst = evaluateConnectionReadiness({ one: { ...participant, messagesSent: 1000, activeDays: 1 }, two: { ...participant, messagesSent: 1000, activeDays: 1 }, gates });
	  expect(burst.readyForReview).toBe(false);
	  expect(burst.criteria.find(item => item.key === "consistent_activity")?.met).toBe(false);
	});

	it("holds readiness for a human-reviewable interaction-integrity concern without calculating a score", () => {
	  const evaluation = evaluateConnectionReadiness({ one: participant, two: participant, gates: { ...gates, noInteractionIntegrityConcern: false } });
	  expect(evaluation.status).toBe("restricted");
	  expect(evaluation.criteria.find(item => item.key === "interaction_integrity")?.met).toBe(false);
	  expect(JSON.stringify(evaluation)).not.toContain("score");
	});
});
