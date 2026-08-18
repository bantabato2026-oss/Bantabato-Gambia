import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "server/db.ts"), "utf8");
const router = readFileSync(join(process.cwd(), "server/routers.ts"), "utf8");

describe("success-story operating procedure contracts", () => {
  it("requires fresh member authentication only before voluntary public-story submission", () => {
    expect(router).toContain('input.editorialAction === "submit_for_review"');
    expect(router).toContain("requireFreshMemberAuthentication(ctx.user.id)");
    expect(router).toContain("withdraw: protectedProcedure");
  });

  it("projects only published consented editorial text and immediately excludes withdrawn records from public listing", () => {
    const publicProjection = source.slice(source.indexOf("export async function listPublishedSuccessStories"), source.indexOf("export type ProfileUpdate"));
    expect(publicProjection).toContain('eq(memberSuccessDeclarations.editorialStatus, "published")');
    expect(publicProjection).toContain("eq(memberSuccessDeclarations.publicStoryConsent, true)");
    expect(publicProjection).toContain("isNull(memberSuccessDeclarations.withdrawnAt)");
    expect(publicProjection).toContain("editorialCopy");
    expect(publicProjection).not.toContain("storageKey");
    expect(publicProjection).not.toContain("publicPhotoId");
  });

  it("keeps publication dependent on independent approval and a screened editorial copy", () => {
    const publication = source.slice(source.indexOf("export async function publishSuccessStory"), source.indexOf("export async function listPublishedSuccessStories"));
    expect(publication).toContain("declaration.editorialCopy");
    expect(publication).toContain("Independent publication approval is required");
    expect(router).toContain('"success_stories.publish"');
    expect(router).toContain('approvalType: "configuration_change"');
  });
});
