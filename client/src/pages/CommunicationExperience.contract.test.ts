import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const detailPages = readFileSync(join(process.cwd(), "client/src/pages/MemberDetailPages.tsx"), "utf8");
const discovery = readFileSync(join(process.cwd(), "client/src/pages/CuratedDiscoveryPage.tsx"), "utf8");
const styles = readFileSync(join(process.cwd(), "client/src/index.css"), "utf8");

describe("communication and authenticated experience contracts", () => {
  it("keeps voice-note lifecycle feedback private, explicit, recoverable, and non-scoring", () => {
    expect(detailPages).toContain("The waveform is visual feedback only. It is never used to rate your activity.");
    expect(detailPages).toContain("Voice note paused");
    expect(detailPages).toContain("Stop and preview");
    expect(detailPages).toContain("Cancel and delete");
    expect(detailPages).toContain("Retry voice note");
    expect(detailPages).toContain("Allow it in your browser settings, or send a text message instead.");
    expect(detailPages).toContain("function VoiceWaveform");
    expect(detailPages).toContain('aria-hidden="true"');
  });

  it("uses shared accessible recovery surfaces for private messaging, voice playback, profile detail, and curated discovery reads", () => {
    expect(detailPages).toContain('StateSkeleton label="Loading your private conversation…"');
    expect(detailPages).toContain('title="This conversation is unavailable right now."');
    expect(detailPages).toContain('title="This profile is unavailable right now."');
    expect(detailPages).toContain("voice.refetch()");
    expect(detailPages).toContain('aria-label="Voice-note playback progress"');
    expect(discovery).toContain('StateSkeleton label="Preparing thoughtful introductions…"');
    expect(discovery).toContain('title="Introductions are unavailable right now."');
    expect(discovery).toContain("discovery.refetch()");
  });

  it("suppresses waveform motion when reduced motion or low-bandwidth preferences are active", () => {
    expect(styles).toContain(".voice-waveform span{animation:none!important;transition:none!important}");
    expect(styles).toContain('html[data-low-bandwidth="true"] .voice-waveform span');
    expect(styles).toContain("@keyframes voice-wave-pulse");
  });
});
