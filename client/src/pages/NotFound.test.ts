import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("public 404", () => {
  it("is branded, privacy-safe, and provides public recovery links", () => {
    const source = readFileSync(
      join(process.cwd(), "client/src/pages/NotFound.tsx"),
      "utf8"
    );

    expect(source).toContain('document.title = "Page not found — Bantabato"');
    expect(source).toContain("noindex,nofollow,noarchive");
    expect(source).toContain('href="/"');
    expect(source).toContain('href="/how-it-works"');
    expect(source).toContain("No member,");
    expect(source).toContain("private route information is shown here.");
  });
});
