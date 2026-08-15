export type ReportConversationParticipants = {
  memberOneProfileId: number;
  memberTwoProfileId: number;
};

export function resolveAuthorizedReportTarget(input: {
  reporterProfileId: number;
  requestedReportedProfileId?: number;
  conversation?: ReportConversationParticipants | null;
}) {
  const { reporterProfileId, requestedReportedProfileId, conversation } = input;
  if (conversation) {
    if (![conversation.memberOneProfileId, conversation.memberTwoProfileId].includes(reporterProfileId)) {
      throw new Error("This conversation is unavailable for reporting");
    }
    const counterpartyProfileId = conversation.memberOneProfileId === reporterProfileId ? conversation.memberTwoProfileId : conversation.memberOneProfileId;
    if (requestedReportedProfileId && requestedReportedProfileId !== counterpartyProfileId) {
      throw new Error("The reported member does not match this conversation");
    }
    return counterpartyProfileId;
  }
  if (!requestedReportedProfileId || requestedReportedProfileId === reporterProfileId) {
    throw new Error("Choose another member to report");
  }
  return requestedReportedProfileId;
}
