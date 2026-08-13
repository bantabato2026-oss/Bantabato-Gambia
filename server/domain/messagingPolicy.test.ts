import { describe, expect, it } from "vitest";
import { canSendInConversation, canViewConversation, pageByDescendingId, safePromptForDimension, validateVoiceNoteMeta } from "./messagingPolicy";

describe("serious conversation policy", () => {
	  it("keeps non-participants, blocked members, and closed conversations from sending messages", () => {
	    expect(canSendInConversation({ isParticipant: false, isBlocked: false, state: "active" })).toBe(false);
	    expect(canSendInConversation({ isParticipant: true, isBlocked: true, state: "active" })).toBe(false);
	    expect(canSendInConversation({ isParticipant: true, isBlocked: false, state: "closed" })).toBe(false);
	    expect(canSendInConversation({ isParticipant: true, isBlocked: false, state: "mutual_interest" })).toBe(true);
	    expect(canSendInConversation({ isParticipant: true, isBlocked: false, state: "restricted" })).toBe(false);
	  });

  it("allows permitted history review but not blocked or archived conversation access", () => {
    expect(canViewConversation({ isParticipant: true, isBlocked: false, state: "paused" })).toBe(true);
    expect(canViewConversation({ isParticipant: true, isBlocked: false, state: "archived" })).toBe(false);
    expect(canViewConversation({ isParticipant: true, isBlocked: true, state: "reported" })).toBe(false);
  });

	  it("returns bounded history pages with a stable cursor", () => {
	    expect(pageByDescendingId([{ id: 9 }, { id: 8 }, { id: 7 }], 2)).toEqual({ items: [{ id: 9 }, { id: 8 }], nextCursor: 8 });
	  });

	  it("does not treat interaction volume as a permission or compatibility judgment", () => {
	    expect(canSendInConversation({ isParticipant: true, isBlocked: false, state: "active" })).toBe(true);
	    expect(canSendInConversation({ isParticipant: true, isBlocked: false, state: "paused" })).toBe(false);
	  });

  it("validates voice-note duration, size, and compressed format before storage", () => {
    expect(validateVoiceNoteMeta({ mimeType: "audio/webm", byteLength: 1024, durationSeconds: 30 }).valid).toBe(true);
    expect(validateVoiceNoteMeta({ mimeType: "audio/wav", byteLength: 1024, durationSeconds: 30 }).valid).toBe(false);
    expect(validateVoiceNoteMeta({ mimeType: "audio/webm", byteLength: 1024, durationSeconds: 181 }).valid).toBe(false);
  });

	  it("produces discussion prompts without revealing hidden values or personal data", () => {
	    const prompt = safePromptForDimension("family_involvement");
	    expect(prompt).toContain("family involvement");
	    expect(prompt).not.toContain("private");
	    expect(safePromptForDimension("unknown_private_field")).toBeUndefined();
	  });

	  it("keeps closed and blocked conversations inaccessible regardless of history navigation", () => {
	    expect(canViewConversation({ isParticipant: true, isBlocked: true, state: "active" })).toBe(false);
	    expect(canViewConversation({ isParticipant: true, isBlocked: false, state: "closed" })).toBe(false);
	  });
});
