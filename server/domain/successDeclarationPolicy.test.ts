import { describe, expect, it } from "vitest";
import { canPublishSuccessDeclaration, hasFreshSuccessStoryAuthentication, mayPublishSuccessStory, maySubmitSuccessStory, resolveSuccessDeclarationStatus, SUCCESS_STORY_REAUTH_WINDOW_MS, validateEditorialCopy } from "./successDeclarationPolicy";

describe("success declaration policy", () => {
  it("records optional sharing consent without making a declaration public", () => {
    expect(resolveSuccessDeclarationStatus(false)).toBe("private");
    expect(resolveSuccessDeclarationStatus(true)).toBe("consent_recorded");
    expect(canPublishSuccessDeclaration()).toBe(false);
  });

  it("requires explicit story consent, a summary, editorial approval, independent approval, and any separately authorized photo before publication", () => {
    expect(maySubmitSuccessStory({ publicStoryConsent: false, storySummary: "A short story" })).toBe(false);
    expect(maySubmitSuccessStory({ publicStoryConsent: true, storySummary: "" })).toBe(false);
    expect(maySubmitSuccessStory({ publicStoryConsent: true, storySummary: "A short story" })).toBe(true);
    expect(mayPublishSuccessStory({ editorialStatus: "approved", publicStoryConsent: true, publicPhotoAuthorized: false, publicPhotoId: 8, independentApprovalGranted: true })).toBe(false);
    expect(mayPublishSuccessStory({ editorialStatus: "approved", publicStoryConsent: true, publicPhotoAuthorized: true, publicPhotoId: 8, independentApprovalGranted: true })).toBe(true);
    expect(mayPublishSuccessStory({ editorialStatus: "withdrawn", publicStoryConsent: false, publicPhotoAuthorized: false, independentApprovalGranted: true })).toBe(false);
  });

  it("requires a recent observed member sign-in for voluntary review submission and rejects contact details from public editorial copy", () => {
    const now = Date.UTC(2026, 7, 18, 12, 0, 0);
    expect(hasFreshSuccessStoryAuthentication(new Date(now - SUCCESS_STORY_REAUTH_WINDOW_MS + 1), now)).toBe(true);
    expect(hasFreshSuccessStoryAuthentication(new Date(now - SUCCESS_STORY_REAUTH_WINDOW_MS - 1), now)).toBe(false);
    expect(validateEditorialCopy("A considered, respectful milestone shared with care.")).toContain("respectful");
    expect(() => validateEditorialCopy("Contact hello@example.com to learn more about our story.")).toThrow("cannot include");
  });
});
