import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("authoritative eligibility guidance", () => {
  it("uses approved-photo progress instead of raw gallery slots on the member photo screen", () => {
    const source = readFileSync(join(root, "client/src/pages/ProfileMediaPage.tsx"), "utf8");
    expect(source).toContain("approvedPhotoCount");
    expect(source).toContain("5 approved photos");
    expect(source).toContain("photo.reviewNote");
  });

  it("does not render discovery or recommendations as available when the profile result is missing or ineligible", () => {
    const discovery = readFileSync(join(root, "client/src/pages/CuratedDiscoveryPage.tsx"), "utf8");
    const recommendations = readFileSync(join(root, "client/src/pages/RecommendationsPage.tsx"), "utf8");
    expect(discovery).toContain("(!eligibility || !eligibility.discoveryEligible)");
    expect(recommendations).toContain("(!eligibility || !eligibility.discoveryEligible)");
    expect(discovery).toContain("Complete your profile foundation.");
    expect(recommendations).toContain("Complete your profile foundation.");
  });
});
