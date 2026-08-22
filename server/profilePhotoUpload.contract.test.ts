import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("profile photo upload contract", () => {
  it("uses a locked capacity check and a distinct private object key before inserting a profile photo", () => {
    const source = readFileSync(join(process.cwd(), "server/db.ts"), "utf8");

    expect(source).toContain("assertProfilePhotoCapacity(existing.length)");
    expect(source).toContain(".for(\"update\")");
    expect(source).toContain("profile-photos/${randomUUID()}.");
    expect(source).toContain("displayOrder: existing.length");
  });

  it("allows a member-owned photo removal to release a replacement slot while preserving a server-authoritative eligibility recalculation", () => {
    const source = readFileSync(join(process.cwd(), "server/db.ts"), "utf8");
    expect(source).toContain("export async function removeOwnProfilePhoto");
    expect(source).toContain("eq(profilePhotos.profileId, profileId)");
    expect(source).toContain("set({ deletedAt: new Date() })");
    expect(source).toContain("synchronizeProfileEligibility(profileId)");
  });
});
