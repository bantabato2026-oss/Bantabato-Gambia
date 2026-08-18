import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("public membership experience", () => {
  it("explains provider-independent membership without exposing checkout or payment-success claims", () => {
    const pages = readFileSync(join(process.cwd(), "client/src/pages/PublicPages.tsx"), "utf8");
    const routes = readFileSync(join(process.cwd(), "client/src/App.tsx"), "utf8");

    expect(routes).toContain('path="/membership"');
    expect(pages).toContain("Bantabato Free");
    expect(pages).toContain("Bantabato Premium");
    expect(pages).toContain("Payment processing is currently being configured.");
    expect(pages).toContain("Configuration required.");
    expect(pages).toContain("No card details or checkout are collected here");
    expect(pages).not.toContain("Payment successful");
  });
});
