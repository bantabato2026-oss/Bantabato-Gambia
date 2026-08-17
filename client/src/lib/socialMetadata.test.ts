import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("social metadata", () => {
  it("publishes canonical Open Graph and large-image social metadata using the official share artwork", () => {
    const document = readFileSync(join(process.cwd(), "client/index.html"), "utf8");
    const officialShareImage = "https://bantabato-pkgkalne.manus.space/manus-storage/public/bantabato-social-share-1200x630.png";

    expect(document).toContain('<link rel="canonical" href="https://bantabato-pkgkalne.manus.space/" />');
    expect(document).toContain('<meta property="og:site_name" content="Bantabato" />');
    expect(document).toContain(`content="${officialShareImage}"`);
    expect(document).toContain('<meta property="og:image:width" content="1200" />');
    expect(document).toContain('<meta property="og:image:height" content="630" />');
    expect(document).toContain('<meta name="twitter:card" content="summary_large_image" />');
  });
});
