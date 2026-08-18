import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("internal standardization server contracts", () => {
  it("routes discovery, recommendations, interests, and readiness through approved-photo eligibility", () => {
    const db = readFileSync(join(root, "server/db.ts"), "utf8");
    const curated = readFileSync(join(root, "server/compatibilityService.ts"), "utf8");
    const recommendations = readFileSync(join(root, "server/recommendationService.ts"), "utf8");
    const readiness = readFileSync(join(root, "server/readinessService.ts"), "utf8");
    expect(db).toContain("getMemberEligibility(viewerProfileId)");
    expect(db).toContain("getMemberEligibility(senderProfileId)");
    expect(curated).toContain("getMemberEligibility(viewerProfileId)");
    expect(recommendations).toContain("getMemberEligibility(profileId)");
    expect(readiness).toContain("eligibility.connectionEligible");
  });

  it("keeps photo review and success-story publication permission-scoped and audited", () => {
    const router = readFileSync(join(root, "server/routers.ts"), "utf8");
    const db = readFileSync(join(root, "server/db.ts"), "utf8");
    expect(router).toContain('"photos.review"');
    expect(router).toContain('"success_stories.review"');
    expect(router).toContain('"success_stories.publish"');
    expect(db).toContain("profile_photo.review_accessed");
    expect(db).toContain("Independent publication approval is required");
  });
});
