import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("social metadata", () => {
  it("publishes canonical Open Graph and large-image social metadata using the official share artwork", () => {
    const document = readFileSync(
      join(process.cwd(), "client/index.html"),
      "utf8"
    );
    const officialShareImage =
      "https://bantabato-pkgkalne.manus.space/manus-storage/public/bantabato-social-share-1200x630.png";

    expect(document).toContain(
      '<link rel="canonical" href="https://bantabato-pkgkalne.manus.space/" />'
    );
    expect(document).toContain(
      '<meta property="og:site_name" content="Bantabato" />'
    );
    expect(document).toContain(`content="${officialShareImage}"`);
    expect(document).toContain(
      '<meta property="og:image:width" content="1200" />'
    );
    expect(document).toContain(
      '<meta property="og:image:height" content="630" />'
    );
    expect(document).toContain(
      '<meta name="twitter:card" content="summary_large_image" />'
    );
    expect(document).toContain('<meta name="robots" content="index,follow" />');
    expect(document).not.toContain("VITE_ANALYTICS_ENDPOINT");
  });

  it("publishes only public routes in the indexing files", () => {
    const robots = readFileSync(
      join(process.cwd(), "client/public/robots.txt"),
      "utf8"
    );
    const sitemap = readFileSync(
      join(process.cwd(), "client/public/sitemap.xml"),
      "utf8"
    );

    expect(robots).toContain("Disallow: /app");
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain(
      "Sitemap: https://bantabato-pkgkalne.manus.space/sitemap.xml"
    );
    expect(sitemap).toContain(
      "https://bantabato-pkgkalne.manus.space/how-it-works"
    );
    expect(sitemap).not.toContain("/app/");
    expect(sitemap).not.toContain("/admin/");
  });
});
