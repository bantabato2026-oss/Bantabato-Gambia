import { describe, expect, it } from "vitest";
import { assertOwnVoiceDeletion, assertPrivateVoiceAccess, interactionSignalKind, unreadMessageIdsForViewer } from "./messagingService";

const voice = { id: 7, conversationId: 10, senderProfileId: 3, messageType: "voice" as const, mediaStorageKey: "members/3/conversations/10/voice/private.webm", deletedAt: null };

describe("messaging service privacy contracts", () => {
  it("denies private voice access for another conversation or a removed recording", () => {
    expect(() => assertPrivateVoiceAccess(voice, 11)).toThrow("Voice note is unavailable");
    expect(() => assertPrivateVoiceAccess({ ...voice, deletedAt: new Date() }, 10)).toThrow("Voice note is unavailable");
    expect(assertPrivateVoiceAccess(voice, 10).mediaStorageKey).toContain("private.webm");
  });

  it("allows voice deletion only by the original sender", () => {
    expect(() => assertOwnVoiceDeletion(voice, 10, 4)).toThrow("Only your own available voice notes can be deleted");
    expect(assertOwnVoiceDeletion(voice, 10, 3).id).toBe(7);
  });

  it("only marks counterpart unread messages as read for the current member", () => {
    const ids = unreadMessageIdsForViewer([{ id: 1, senderProfileId: 3, readAt: null }, { id: 2, senderProfileId: 4, readAt: null }, { id: 3, senderProfileId: 4, readAt: new Date() }], 3);
    expect(ids).toEqual([2]);
  });

  it("maps interaction events to counters without calculating a relationship score", () => {
    expect(interactionSignalKind("text")).toBe("messagesSent");
    expect(interactionSignalKind("voice")).toBe("voiceNotesSent");
    expect(interactionSignalKind("read")).toBe("readEvents");
  });
});
