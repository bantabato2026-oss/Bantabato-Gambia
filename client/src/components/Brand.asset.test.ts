import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("official Brand asset", () => {
  it("uses the deployed official logo with descriptive alternative text and preserved source dimensions", () => {
    const source = readFileSync(join(process.cwd(), "client/src/components/Brand.tsx"), "utf8");

    expect(source).toContain('"/manus-storage/public/bantabato-logo-official-f445863c.png"');
    expect(source).toContain('alt="Bantabato"');
    expect(source).toContain("width={1536}");
    expect(source).toContain("height={1024}");
    expect(source).not.toContain("VITE_APP_LOGO");
  });

  it("uses the same deployed official asset inside the square PWA icon frame", () => {
    const icon = readFileSync(join(process.cwd(), "client/public/pwa-icon.svg"), "utf8");

    expect(icon).toContain('/manus-storage/public/bantabato-logo-official-f445863c.png');
    expect(icon).toContain('preserveAspectRatio="xMidYMid meet"');
  });

  it("exposes a public-header-only, reduced-motion-safe hover treatment", () => {
    const layout = readFileSync(join(process.cwd(), "client/src/components/PublicLayout.tsx"), "utf8");
    const styles = readFileSync(join(process.cwd(), "client/src/index.css"), "utf8");

    expect(layout).toContain("<Brand hoverMotion />");
    expect(styles).toContain("@media (prefers-reduced-motion:no-preference)");
    expect(styles).toContain(".brand-wordmark-hover:hover .brand-logo-image");
  });
});
