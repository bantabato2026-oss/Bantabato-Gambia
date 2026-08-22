import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const detailPages = readFileSync(join(process.cwd(), "client/src/pages/MemberDetailPages.tsx"), "utf8");
const discovery = readFileSync(join(process.cwd(), "client/src/pages/CuratedDiscoveryPage.tsx"), "utf8");
const styles = readFileSync(join(process.cwd(), "client/src/index.css"), "utf8");
const family = readFileSync(join(process.cwd(), "client/src/pages/FamilyCirclePages.tsx"), "utf8");
const billing = readFileSync(join(process.cwd(), "client/src/pages/BillingPage.tsx"), "utf8");
const memberPages = readFileSync(join(process.cwd(), "client/src/pages/MemberPages.tsx"), "utf8");
const verificationCenter = readFileSync(join(process.cwd(), "client/src/pages/VerificationCenter.tsx"), "utf8");
const messagingService = readFileSync(join(process.cwd(), "server/messagingService.ts"), "utf8");
const messagingRouter = readFileSync(join(process.cwd(), "server/routers.ts"), "utf8");
const schema = readFileSync(join(process.cwd(), "drizzle/schema.ts"), "utf8");

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

	  it("uses one opaque per-conversation request key for member-initiated text and voice retries, with server-scoped duplicate lookup", () => {
    expect(detailPages).toContain("const [messageRequestId, setMessageRequestId]");
    expect(detailPages).toContain("clientRequestId: requestId");
    expect(detailPages).toContain("clientRequestId: createClientRequestId()");
    expect(detailPages).toContain("Retry message");
    expect(detailPages).toContain("Retry voice note");
    expect(messagingRouter).toContain("clientRequestId: z.string().regex");
    expect(messagingService).toContain("resolveExistingClientRequest(db, profileId, conversationId, requestId, fingerprint");
    expect(schema).toContain('clientRequestId: varchar("clientRequestId", { length: 96 })');
	    expect(schema).toContain("messages_sender_conversation_client_request_unique");
	    expect(schema).toContain('requestFingerprint: varchar("requestFingerprint", { length: 64 })');
	    expect(schema).toContain('"message_deduplicated"');
	    expect(schema).toContain('"message_request_conflict"');
	    expect(messagingService).toContain("createHmac(\"sha256\"");
	    expect(messagingService).toContain("same_request_key");
	    expect(messagingService).toContain("different_payload");
	  });

  it("uses shared recovery states and factual status language for verification, Family Circle, and provider-bound billing", () => {
    expect(memberPages).toContain('StateSkeleton label="Loading your verification status…"');
    expect(memberPages).toContain('title="Verification status is unavailable right now."');
    expect(memberPages).toContain("verificationStatusCopy");
    expect(verificationCenter).toContain('StateSkeleton label="Loading your verification status…"');
    expect(verificationCenter).toContain('title="Verification status is unavailable right now."');
    expect(verificationCenter).toContain("You may submit another supported document when ready.");
    expect(family).toContain('StateSkeleton label="Loading your Family Circle…"');
    expect(family).toContain('title="Family Circle is unavailable right now."');
    expect(family).toContain("familyStatusExplanation");
	    expect(billing).toContain('StateSkeleton label="Loading available membership terms…"');
	    expect(billing).toContain("Payment not configured");
	    expect(billing).toContain("Checkout unavailable");
	    expect(billing).toContain("No transaction, charge, refund, or Premium entitlement was created.");
  });
});
