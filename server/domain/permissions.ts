export type PhotoVisibility = "public" | "mutual_match" | "hidden";

export function canonicalProfilePair(firstProfileId: number, secondProfileId: number) {
  return firstProfileId < secondProfileId
    ? { memberOneProfileId: firstProfileId, memberTwoProfileId: secondProfileId }
    : { memberOneProfileId: secondProfileId, memberTwoProfileId: firstProfileId };
}

export function canRevealProfilePhotos(photoVisibility: PhotoVisibility, hasMutualMatch: boolean) {
  return photoVisibility === "public" || (photoVisibility === "mutual_match" && hasMutualMatch);
}

export function canUseConversation(input: {
  isMatchActive: boolean;
  isConversationActive: boolean;
  isParticipant: boolean;
  isBlocked: boolean;
}) {
  return input.isMatchActive && input.isConversationActive && input.isParticipant && !input.isBlocked;
}

export function canAwardVerifiedBadge(input: { verificationType: string; status: string }) {
  return input.verificationType === "identity_document" && input.status === "approved";
}
