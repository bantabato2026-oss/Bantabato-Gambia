import { describe, expect, it } from "vitest";
import { approvedPhotoProgress, assertProfilePhotoCapacity, MAX_PROFILE_PHOTOS, MIN_APPROVED_PROFILE_PHOTOS } from "./profilePhotoPolicy";

describe("profile photo policy", () => {
  it("permits five or fewer gallery slots and rejects an additional profile photo", () => {
    expect(MAX_PROFILE_PHOTOS).toBe(5);
    expect(() => assertProfilePhotoCapacity(4)).not.toThrow();
    expect(() => assertProfilePhotoCapacity(5)).toThrow("up to 5 profile photos");
  });

  it("treats five approved photos—not pending uploads—as the completion threshold", () => {
    expect(MIN_APPROVED_PROFILE_PHOTOS).toBe(5);
    expect(approvedPhotoProgress(4)).toEqual({ approved: 4, required: 5, complete: false, remaining: 1 });
    expect(approvedPhotoProgress(5)).toEqual({ approved: 5, required: 5, complete: true, remaining: 0 });
  });
});
