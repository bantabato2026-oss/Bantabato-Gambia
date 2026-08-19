import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const designCss = readFileSync(join(process.cwd(), "client/src/design-system.css"), "utf8");
const statePanel = readFileSync(join(process.cwd(), "client/src/components/StatePanel.tsx"), "utf8");
const bridge = readFileSync(join(process.cwd(), "client/src/components/DesignPreferenceBridge.tsx"), "utf8");

describe("design-system interaction contracts", () => {
  it("defines one named micro, standard, and emphasis motion language with reduced-motion equivalence", () => {
    expect(designCss).toContain("--motion-micro: 160ms");
    expect(designCss).toContain("--motion-standard: 260ms");
    expect(designCss).toContain("--motion-emphasis: 400ms");
    expect(designCss).toContain("prefers-reduced-motion: reduce");
  });

  it("keeps state surfaces accessible and distinguishes retryable errors from empty content", () => {
    expect(statePanel).toContain('kind === "error" ? "alert" : "status"');
    expect(statePanel).toContain("aria-live");
    expect(statePanel).toContain('type StateKind = "empty" | "error" | "success" | "loading"');
  });

  it("connects the persisted low-bandwidth preference to an app-wide visual data attribute", () => {
    expect(bridge).toContain('document.documentElement.dataset.lowBandwidth');
    expect(bridge).toContain('"bantabato:low-bandwidth-change"');
    expect(designCss).toContain('html[data-low-bandwidth="true"]');
  });
});
