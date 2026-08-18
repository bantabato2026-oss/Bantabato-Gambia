import { describe, expect, it } from "vitest";
import { assertProfilePhotoCapacity, MAX_PROFILE_PHOTOS } from "./profilePhotoPolicy";

describe("profile photo policy", () => {
  it("permits five or fewer gallery slots and rejects an additional profile photo", () => {
    expect(MAX_PROFILE_PHOTOS).toBe(5);
    expect(() => assertProfilePhotoCapacity(4)).not.toThrow();
    expect(() => assertProfilePhotoCapacity(5)).toThrow("up to 5 profile photos");
  });
});
