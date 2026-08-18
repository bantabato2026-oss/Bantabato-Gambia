export type SuccessDeclarationStatus = "private" | "consent_recorded" | "withdrawn";
export const SUCCESS_EDITORIAL_STATES = ["draft", "private", "pending_review", "approved", "published", "withdrawn", "rejected"] as const;
export type SuccessEditorialState = (typeof SUCCESS_EDITORIAL_STATES)[number];

export function resolveSuccessDeclarationStatus(sharingConsent: boolean): SuccessDeclarationStatus {
  return sharingConsent ? "consent_recorded" : "private";
}

export function maySubmitSuccessStory(input: { publicStoryConsent: boolean; storySummary?: string | null }) {
  return input.publicStoryConsent && Boolean(input.storySummary?.trim());
}

export function mayPublishSuccessStory(input: { editorialStatus: SuccessEditorialState; publicStoryConsent: boolean; publicPhotoAuthorized: boolean; publicPhotoId?: number | null; independentApprovalGranted: boolean }) {
  if (input.editorialStatus !== "approved" || !input.publicStoryConsent || !input.independentApprovalGranted) return false;
  return !input.publicPhotoId || input.publicPhotoAuthorized;
}

export function canPublishSuccessDeclaration(): false {
  return false;
}
