import { describe, expect, it } from "vitest";
import { canViewerSeeProfileField } from "./profileVisibility";

describe("field-level profile visibility", () => {
  it("shows public and potential-match fields without exposing private data", () => {
    const context = { viewerIdentityVerified: false, hasMutualMatch: false };
    expect(canViewerSeeProfileField("public", context)).toBe(true);
    expect(canViewerSeeProfileField("potential_matches", context)).toBe(true);
    expect(canViewerSeeProfileField("private", context)).toBe(false);
    expect(canViewerSeeProfileField("admin_restricted", context)).toBe(false);
  });

  it("requires a confirmed viewer verification or mutual match for restricted audiences", () => {
    expect(canViewerSeeProfileField("verified_members", { viewerIdentityVerified: false, hasMutualMatch: false })).toBe(false);
    expect(canViewerSeeProfileField("verified_members", { viewerIdentityVerified: true, hasMutualMatch: false })).toBe(true);
    expect(canViewerSeeProfileField("matched_members", { viewerIdentityVerified: true, hasMutualMatch: false })).toBe(false);
    expect(canViewerSeeProfileField("matched_members", { viewerIdentityVerified: false, hasMutualMatch: true })).toBe(true);
  });

  it("does not let a family audience turn into general member discovery access", () => {
    expect(canViewerSeeProfileField("family_circle", { viewerIdentityVerified: true, hasMutualMatch: true })).toBe(false);
  });
});
