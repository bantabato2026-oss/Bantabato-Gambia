import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "server/db.ts"), "utf8");

describe("identity document resubmission storage contract", () => {
  it("assigns every private identity submission a distinct server-generated storage key instead of overwriting a prior review record", () => {
    expect(source).toContain('identity-${randomUUID()}.${safeExtension(mimeType)}');
    expect(source).not.toContain('verification/identity.${safeExtension(mimeType)}');
    expect(source).toContain('status: "submitted"');
  });
});
