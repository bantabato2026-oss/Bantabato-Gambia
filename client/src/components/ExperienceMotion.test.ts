import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("experience motion primitives", () => {
  it("uses lightweight route, reveal, stagger, and branded loading primitives with a reduced-motion override", () => {
    const component = readFileSync(join(process.cwd(), "client/src/components/ExperienceMotion.tsx"), "utf8");
    const app = readFileSync(join(process.cwd(), "client/src/App.tsx"), "utf8");
    const styles = readFileSync(join(process.cwd(), "client/src/index.css"), "utf8");

    expect(component).toContain("motion-page-enter");
    expect(component).toContain("motion-stagger");
    expect(component).toContain("brand-route-loading");
    expect(app).toContain("<PageEnter key={location}>");
    expect(app).toContain("<BrandedRouteLoading />");
    expect(styles).toContain("@media (prefers-reduced-motion:reduce)");
    expect(styles).toContain("transform:translateY");
  });
});
