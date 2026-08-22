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
	    expect(pages).toContain("trpc.publicContent.membershipCatalog.useQuery");
	    expect(pages).toContain("The public page never begins checkout, collects payment data");
	    expect(pages).toContain("No active, currently effective Premium plan is available for this currency.");
    expect(pages).not.toContain("Payment successful");
  });
});
