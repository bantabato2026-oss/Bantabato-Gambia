import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("public membership experience", () => {
  it("explains provider-independent membership without exposing checkout or payment-success claims", () => {
    const pages = readFileSync(join(process.cwd(), "client/src/pages/PublicPages.tsx"), "utf8");
    const routes = readFileSync(join(process.cwd(), "client/src/App.tsx"), "utf8");

    expect(routes).toContain('path="/membership"');
    expect(pages).toContain("Free during initial launch");
    expect(pages).toContain("Core access does not require a subscription");
    expect(pages).toContain("Billing is dormant for now.");
    expect(pages).toContain("Checkout:</strong> Unavailable during Free Launch");
    expect(pages).not.toContain("Bantabato Premium");
    expect(pages).not.toContain("trpc.publicContent.membershipCatalog.useQuery");
    expect(pages).not.toContain("Payment successful");
  });
});
