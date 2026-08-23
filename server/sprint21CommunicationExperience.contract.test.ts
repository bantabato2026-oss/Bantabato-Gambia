import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Sprint 21 member communication, voice, and connection experience contracts", () => {
  it("provides profile-gated, factual Messages landing states without inventing conversations or bypassing current authorization", () => {
    const messages = read("client/src/pages/MemberPages.tsx");
    const routes = read("client/src/pages/MemberRouteStates.tsx");

    expect(messages).toContain("profileComplete === true");
    expect(messages).toContain('enabled: profileReady');
    expect(messages).toContain("Complete your profile before reviewing messages.");
    expect(messages).toContain("conversationLandingState");
    expect(messages).toContain("Communication available");
    expect(messages).toContain("Paused");
    expect(messages).toContain("Sending unavailable");
    expect(messages).toContain("Communication unavailable");
    expect(messages).toContain("Private safety or account details are not shown.");
    expect(messages).toContain("unread private message");
    expect(routes).toContain('loadingLabel="Loading your protected message space…"');
    expect(messages).not.toContain("sample message");
  });

  it("uses an authorized privacy-safe thread header with versioned pause/resume, Safety Center handoff, block confirmation, and profile recovery", () => {
    const page = read("client/src/pages/MemberDetailPages.tsx");
    const router = read("server/routers.ts");
    const service = read("server/messagingService.ts");

    expect(page).toContain("expectedUpdatedAt: conversation?.updatedAt");
    expect(page).toContain("Private communication available");
    expect(page).toContain("View profile");
    expect(page).toContain("Block this member?");
    expect(page).toContain("It does not reveal your reason to the other member.");
    expect(page).toContain("Report");
    expect(router).toContain("expectedUpdatedAt: z.coerce.date().optional()");
    expect(service).toContain("This conversation changed before your update. Refresh the conversation and try again.");
    expect(service).toContain("This conversation is no longer paused. Refresh before changing it again.");
    expect(service).toContain("This conversation is not available to pause right now.");
  });

  it("keeps text and voice sends request-key-safe, verifies send authority again before persistence, and prevents a delayed send from reactivating paused or restricted communication", () => {
    const service = read("server/messagingService.ts");

    expect(service).toContain('await requireConversationAccess(profileId, conversationId, ["mutual_interest", "active"]);');
    expect(service).toContain("Storage preparation does not grant send authority");
    expect(service).toContain('inArray(conversations.status, ["mutual_interest", "active"])');
    expect(service).toContain("resolveExistingClientRequest(db, profileId, conversationId, requestId, fingerprint");
    expect(service).toContain("This retry key is already linked to a different private message");
    expect(service).toContain('createHmac("sha256"');
    expect(service).not.toContain("premium");
  });

  it("requires a member request before preparing a signed private voice URL and communicates revoked, deleted, or unavailable media without exposing storage keys", () => {
    const page = read("client/src/pages/MemberDetailPages.tsx");
    const service = read("server/messagingService.ts");

    expect(page).toContain("const [requested, setRequested] = useState(false)");
    expect(page).toContain("enabled: requested");
    expect(page).toContain("Prepare private audio");
    expect(page).toContain("It may have been deleted, expired, or no longer be available to this conversation.");
    expect(service).toContain("assertPrivateVoiceAccess");
    expect(service).toContain("storageGetSignedUrl(voice.mediaStorageKey!)");
    expect(service).not.toContain("publicUrl");
    expect(page).not.toContain("mediaStorageKey");
  });

  it("announces microphone, recording, preview, upload, failure, and confirmed-send boundaries without claiming device execution or deriving sensitive waveform data", () => {
    const page = read("client/src/pages/MemberDetailPages.tsx");
    const styles = read("client/src/index.css");

    expect(page).toContain("function VoiceCaptureState");
    expect(page).toContain("Permission not requested");
    expect(page).toContain("Permission available");
    expect(page).toContain("Permission denied");
    expect(page).toContain("Recording");
    expect(page).toContain("Stopped — preview ready");
    expect(page).toContain("Upload pending");
    expect(page).toContain("Upload failed");
    expect(page).toContain("Your private voice note is not confirmed until the server responds.");
    expect(page).toContain("The waveform is visual feedback only. It is never used to rate your activity.");
    expect(page).toContain('aria-live="polite"');
    expect(styles).toContain('html[data-low-bandwidth="true"] .voice-waveform span');
    expect(styles).toContain("@media (prefers-reduced-motion:reduce)");
  });

  it("uses conditional voice deletion and preserves connection, readiness, Family Circle, staff, notification, safety, and premium boundaries", () => {
    const service = read("server/messagingService.ts");
    const readiness = read("server/readinessService.ts");
    const page = read("client/src/pages/MemberDetailPages.tsx");
    const family = read("client/src/pages/FamilyCirclePages.tsx");
    const policy = read("server/domain/paymentPolicy.ts");

    expect(service).toContain("isNull(messages.deletedAt)");
    expect(service).toContain("This voice note changed before it could be deleted. Refresh the conversation and try again.");
    expect(readiness).toContain("withdrawFamilySharesForProfilePair");
    expect(readiness).toContain("Voice and video calling technology is not connected yet.");
    expect(page).toContain("Connection readiness");
    expect(page).toContain("Both members must agree.");
    expect(family).toContain("view private conversations or voice notes");
    expect(policy).toContain('"matching_rank"');
    expect(service).not.toContain("staffMessageContent");
  });
});
