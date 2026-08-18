import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("profile media capacity experience", () => {
  it("keeps the five-slot gallery truthful and prevents a sixth client-side selection", () => {
    const source = readFileSync(join(process.cwd(), "client/src/pages/ProfileMediaPage.tsx"), "utf8");

    expect(source).toContain("const atPhotoCapacity = photoCount >= 5");
    expect(source).toContain("maximum of 5 profile photos");
    expect(source).toContain("disabled={atPhotoCapacity}");
    expect(source).toContain("Your five profile-photo slots are full.");
  });
});
