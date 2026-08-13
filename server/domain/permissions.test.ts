import { describe, expect, it } from "vitest";
import { canAwardVerifiedBadge, canRevealProfilePhotos, canUseConversation, canonicalProfilePair } from "./permissions";

describe("Bantabato trust and privacy rules", () => {
  it("stores a member pair in one canonical direction", () => {
    expect(canonicalProfilePair(9, 3)).toEqual({ memberOneProfileId: 3, memberTwoProfileId: 9 });
    expect(canonicalProfilePair(3, 9)).toEqual({ memberOneProfileId: 3, memberTwoProfileId: 9 });
  });

  it("does not reveal mutually protected photos before a mutual match", () => {
    expect(canRevealProfilePhotos("mutual_match", false)).toBe(false);
    expect(canRevealProfilePhotos("mutual_match", true)).toBe(true);
    expect(canRevealProfilePhotos("hidden", true)).toBe(false);
    expect(canRevealProfilePhotos("public", false)).toBe(true);
  });

  it("keeps a conversation closed without an active mutual match", () => {
    expect(canUseConversation({ isMatchActive: false, isConversationActive: true, isParticipant: true, isBlocked: false })).toBe(false);
    expect(canUseConversation({ isMatchActive: true, isConversationActive: true, isParticipant: false, isBlocked: false })).toBe(false);
    expect(canUseConversation({ isMatchActive: true, isConversationActive: true, isParticipant: true, isBlocked: true })).toBe(false);
    expect(canUseConversation({ isMatchActive: true, isConversationActive: true, isParticipant: true, isBlocked: false })).toBe(true);
  });

  it("awards a verification badge only after approved manual identity review", () => {
    expect(canAwardVerifiedBadge({ verificationType: "identity_document", status: "submitted" })).toBe(false);
    expect(canAwardVerifiedBadge({ verificationType: "profile_photo", status: "approved" })).toBe(false);
    expect(canAwardVerifiedBadge({ verificationType: "identity_document", status: "approved" })).toBe(true);
  });
});
