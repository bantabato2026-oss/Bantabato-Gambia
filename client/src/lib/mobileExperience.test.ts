import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { clearAllMobileDrafts, clearSafeDraft, draftKey, installPromptRecentlyDismissed, loadSafeDraft, lowBandwidthEnabled, recordInstallDismissal, saveLowBandwidthPreference, saveSafeDraft } from "./mobileExperience";

function createStorage() {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

describe("mobile experience privacy and PWA boundaries", () => {
  let localStorage: ReturnType<typeof createStorage>;

  beforeEach(() => {
    localStorage = createStorage();
    vi.stubGlobal("window", { localStorage, isSecureContext: true, addEventListener: vi.fn(), dispatchEvent: vi.fn() });
    vi.stubGlobal("navigator", { onLine: true, connection: { saveData: false, effectiveType: "4g" } });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("uses narrowly scoped device-local draft keys and clears them without touching unrelated storage", () => {
    const message = draftKey("message", "71"); const onboarding = draftKey("onboarding");
    saveSafeDraft(message, "A respectful unsent note"); saveSafeDraft(onboarding, { displayName: "Awa" }); localStorage.setItem("manus-cookie", "not-a-real-token");
    clearAllMobileDrafts();
    expect(loadSafeDraft(message)).toBeNull(); expect(loadSafeDraft(onboarding)).toBeNull(); expect(localStorage.getItem("manus-cookie")).toBe("not-a-real-token");
  });

  it("round-trips an allowed safe draft and rejects malformed or oversized local content", () => {
    const key = draftKey("onboarding");
    expect(saveSafeDraft(key, { country: "The Gambia", about: "Marriage with intention" })).toBe(true);
    expect(loadSafeDraft<{ country: string }>(key)?.country).toBe("The Gambia");
    localStorage.setItem(key, "not-json"); expect(loadSafeDraft(key)).toBeNull();
    expect(saveSafeDraft(key, "x".repeat(12_001))).toBe(false);
  });

  it("supports explicit low-bandwidth preference without persisting server responses", () => {
    expect(lowBandwidthEnabled()).toBe(false); expect(saveLowBandwidthPreference(true)).toBe(true); expect(lowBandwidthEnabled()).toBe(true);
    clearSafeDraft(draftKey("message", "23")); expect(localStorage.getItem("bantabato.device.v1.low-bandwidth")).toBe("true");
    expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "bantabato:low-bandwidth-change" }));
  });

  it("throttles a dismissed install prompt for thirty days", () => {
    recordInstallDismissal(); expect(installPromptRecentlyDismissed()).toBe(true); expect(installPromptRecentlyDismissed(Date.now() + 31 * 24 * 60 * 60 * 1000)).toBe(false);
  });

  it("defines manifest metadata for an installable standalone Bantabato experience", () => {
    const manifest = JSON.parse(readFileSync(join(process.cwd(), "client/public/manifest.webmanifest"), "utf8"));
    expect(manifest).toMatchObject({ short_name: "Bantabato", start_url: "/app", display: "standalone", theme_color: "#173a2d" });
    expect(manifest.icons).toHaveLength(2);
    expect(manifest.icons).toContainEqual(expect.objectContaining({ src: "/manus-storage/public/bantabato-native-app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }));
    expect(manifest.icons).toContainEqual(expect.objectContaining({ src: "/manus-storage/public/bantabato-native-app-icon-1024.png", sizes: "1024x1024", type: "image/png" }));
  });

  it("keeps the service worker static-only and explicitly excludes private paths", () => {
    const worker = readFileSync(join(process.cwd(), "client/public/sw.js"), "utf8");
    expect(worker).toContain('"/api/"'); expect(worker).toContain('"/manus-storage/"'); expect(worker).toContain('request.method !== "GET"'); expect(worker).toContain('request.mode === "navigate"'); expect(worker).toContain('"/offline.html"');
  });
});
