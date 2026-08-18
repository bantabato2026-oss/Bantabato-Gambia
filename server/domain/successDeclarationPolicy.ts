export type SuccessDeclarationStatus = "private" | "consent_recorded" | "withdrawn";
export const SUCCESS_EDITORIAL_STATES = ["draft", "private", "pending_review", "approved", "published", "withdrawn", "rejected"] as const;
export type SuccessEditorialState = (typeof SUCCESS_EDITORIAL_STATES)[number];
export const SUCCESS_STORY_REAUTH_WINDOW_MS = 15 * 60 * 1000;

export function resolveSuccessDeclarationStatus(sharingConsent: boolean): SuccessDeclarationStatus {
  return sharingConsent ? "consent_recorded" : "private";
}

export function maySubmitSuccessStory(input: { publicStoryConsent: boolean; storySummary?: string | null }) {
  return input.publicStoryConsent && Boolean(input.storySummary?.trim());
}

export function hasFreshSuccessStoryAuthentication(lastSignedIn: Date | null | undefined, now = Date.now()) {
  return Boolean(lastSignedIn && now - lastSignedIn.getTime() <= SUCCESS_STORY_REAUTH_WINDOW_MS);
}

export function validateEditorialCopy(value: string) {
  const text = value.trim();
  if (text.length < 20) throw new Error("Use at least 20 characters for reviewed presentation copy.");
  if (/(https?:\/\/|www\.|\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b|\+?\d[\d\s().-]{7,}\d)/.test(text)) throw new Error("Public story copy cannot include a link, email address, or phone number.");
  return text;
}

export function mayPublishSuccessStory(input: { editorialStatus: SuccessEditorialState; publicStoryConsent: boolean; publicPhotoAuthorized: boolean; publicPhotoId?: number | null; independentApprovalGranted: boolean }) {
  if (input.editorialStatus !== "approved" || !input.publicStoryConsent || !input.independentApprovalGranted) return false;
  return !input.publicPhotoId || input.publicPhotoAuthorized;
}

export function canPublishSuccessDeclaration(): false {
  return false;
}
