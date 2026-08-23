import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const messaging = readFileSync(join(process.cwd(), "server/messagingService.ts"), "utf8");
const routers = readFileSync(join(process.cwd(), "server/routers.ts"), "utf8");
const thread = readFileSync(join(process.cwd(), "client/src/pages/MemberDetailPages.tsx"), "utf8");

describe("Sprint 4 private communication completion contracts", () => {
  it("keeps new text and voice sends limited to active mutual conversations while allowing private historical access only through approved states", () => {
    expect(messaging).toContain('await requireConversationAccess(profileId, conversationId, ["mutual_interest", "active"]);');
    expect(messaging).toContain('await requireConversationAccess(profileId, conversationId, ["mutual_interest", "active", "paused", "reported", "restricted"]);');
    expect(messaging).toContain('const conversation = await db.select().from(conversations).where(and(eq(conversations.id, conversationId), inArray(conversations.status, allowed))).limit(1);');
    expect(messaging).toContain('eq(matches.status, "active")');
  });

  it("protects duplicate retries, writes only private voice keys, and resolves voice playback through signed authorization", () => {
    expect(messaging).toContain('const fingerprint = requestFingerprint("text", clean);');
    expect(messaging).toContain('const fingerprint = requestFingerprint("voice", `${mimeType}:${durationSeconds}`, buffer);');
    expect(messaging).toContain('members/${profileId}/conversations/${conversationId}/voice/${requestId}.${extension}');
    expect(messaging).toContain('return { messageId, url: await storageGetSignedUrl(voice.mediaStorageKey!)');
    expect(messaging).toContain('Only your own available voice notes can be deleted');
  });

  it("retains server-authoritative block and high-risk-report revocation with privacy-safe member-facing access failure", () => {
    expect(messaging).toContain('await db.update(conversations).set({ status: "blocked"');
    expect(messaging).toContain('await revokeConnectionForConversation(conversationId, "block", { profileId });');
    expect(messaging).toContain('await revokeConnectionForConversation(conversationId, "open_report", { profileId });');
    expect(messaging).toContain('if (blocked[0]) throw new Error("Conversation is unavailable");');
  });

  it("supports member-controlled pause and resume without enabling messages in paused, reported, restricted, blocked, or closed states", () => {
    expect(routers).toContain('state: z.enum(["active", "paused", "closed"])');
    expect(messaging).toContain('state: "active" | "paused" | "closed"');
    expect(thread).toContain('const canSendInConversation = conversationStatus === "mutual_interest" || conversationStatus === "active";');
    expect(thread).toContain('(messages.isError ? "unavailable" : undefined)');
    expect(thread).toContain('conversationStatus === "closed" || conversationStatus === "blocked" || conversationStatus === "unavailable"');
    expect(thread).toContain('conversationStatus === "paused" ? "This conversation is paused. Resume it before sending another message or voice note."');
    expect(thread).toContain('changeConversationState("active")');
    expect(thread).toContain('expectedUpdatedAt: conversation?.updatedAt');
    expect(thread).toContain('disabled={!canSendInConversation || send.isPending');
  });

  it("keeps offline failure truthful and immediately refreshes client state after block, message report, or voice deletion", () => {
    expect(thread).toContain('You appear to be offline. Your message draft is saved on this device; reconnect before sending.');
    expect(thread).toContain('loadSafeDraft<string | { body: string; clientRequestId?: string }>(messageDraftKey)');
    expect(thread).toContain('saveSafeDraft(messageDraftKey, { body: body.trim(), clientRequestId: requestId });');
    expect(thread).toContain('Message sent to this private conversation.');
    expect(thread).toContain('void utils.messaging.messages.invalidate({ conversationId }); void utils.messaging.conversations.invalidate(); void utils.readiness.status.invalidate({ conversationId });');
    expect(thread).toContain('Your private voice note was deleted from this conversation.');
    expect(thread).toContain('The message report was sent privately to Trust & Safety.');
  });

  it("uses the existing authorized cursor contract to paginate older messages without changing visible history on a failed fetch", () => {
    expect(routers).toContain('messages: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), cursor: z.number().int().positive().optional(), limit: z.number().int().min(1).max(50).optional() }))');
    expect(thread).toContain('const olderHistory = trpc.messaging.messages.useQuery({ conversationId, cursor: historyCursor ?? 1 }, { enabled: historyCursor !== null });');
    expect(thread).toContain('Earlier messages were not loaded. Your visible messages have not changed.');
    expect(thread).toContain('Load earlier messages');
  });
});
