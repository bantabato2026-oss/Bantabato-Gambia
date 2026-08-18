import { describe, expect, it } from "vitest";
import { canPublishSuccessDeclaration, mayPublishSuccessStory, maySubmitSuccessStory, resolveSuccessDeclarationStatus } from "./successDeclarationPolicy";

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
});
