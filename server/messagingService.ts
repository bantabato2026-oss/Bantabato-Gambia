import { and, desc, eq, gt, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { blocks, conversationEvents, conversationInteractionSignals, conversationPreferences, conversations, matches, memberProfiles, messageReads, messages, reports } from "../drizzle/schema";
import { getCompatibilityExplanation } from "./compatibilityService";
import { blockProfile, createAuditLog, createNotification, createReport, getDb } from "./db";
import { storageGetSignedUrl, storagePut } from "./storage";
import { assertExpectedFileSignature } from "./fileValidation";
import { normalizeOptionalUserText, normalizeUserText } from "./inputSecurity";
import { safePromptForDimension, validateVoiceNoteMeta } from "./domain/messagingPolicy";
import { createIntegritySignal } from "./integrityService";
import { revokeConnectionForConversation } from "./readinessService";
import { ENV } from "./_core/env";

const MAX_TEXT_LENGTH = 2_000;
const MAX_VOICE_SECONDS = 180;
const MAX_VOICE_BYTES = 6 * 1024 * 1024;
const ALLOWED_VOICE_MIME = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg"];

type ConversationStatus = "mutual_interest" | "active" | "paused" | "archived" | "blocked" | "reported" | "restricted" | "closed";
type ReportReason = "fake_profile" | "impersonation" | "scam" | "harassment" | "inappropriate_content" | "financial_solicitation" | "suspicious_behavior" | "safety_concern" | "other";

type VoiceMessageContract = { id: number; conversationId: number; senderProfileId: number; messageType: "text" | "voice" | "image"; mediaStorageKey: string | null; deletedAt: Date | null };

export function assertPrivateVoiceAccess(message: VoiceMessageContract | undefined, conversationId: number) {
  if (!message || message.conversationId !== conversationId || message.messageType !== "voice" || message.deletedAt || !message.mediaStorageKey) throw new Error("Voice note is unavailable");
  return message;
}

export function assertOwnVoiceDeletion(message: VoiceMessageContract | undefined, conversationId: number, profileId: number) {
  const voice = assertPrivateVoiceAccess(message, conversationId);
  if (voice.senderProfileId !== profileId) throw new Error("Only your own available voice notes can be deleted");
  return voice;
}

export function unreadMessageIdsForViewer<T extends { id: number; senderProfileId: number; readAt: Date | null }>(rows: T[], viewerProfileId: number) {
  return rows.filter(row => row.senderProfileId !== viewerProfileId && !row.readAt).map(row => row.id);
}

export function interactionSignalKind(kind: "text" | "voice" | "read") {
  return kind === "text" ? "messagesSent" : kind === "voice" ? "voiceNotesSent" : "readEvents";
}

export async function listConversations(profileId: number, input: { cursor?: number; limit?: number } = {}) {
  const db = await getDb();
  if (!db) return { items: [], nextCursor: undefined };
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 30);
  const profileMatches = await db.select().from(matches).where(and(or(eq(matches.memberOneProfileId, profileId), eq(matches.memberTwoProfileId, profileId)), inArray(matches.status, ["active", "blocked"]))).limit(100);
  if (!profileMatches.length) return { items: [], nextCursor: undefined };
  const matchIds = profileMatches.map(match => match.id);
  const conditions = [inArray(conversations.matchId, matchIds)];
  if (input.cursor) conditions.push(lt(conversations.id, input.cursor));
  const records = await db.select().from(conversations).where(and(...conditions)).orderBy(desc(conversations.lastActivityAt), desc(conversations.id)).limit(limit + 1);
  const page = records.slice(0, limit);
  const otherIds = profileMatches.map(match => match.memberOneProfileId === profileId ? match.memberTwoProfileId : match.memberOneProfileId);
  const people = otherIds.length ? await db.select({ id: memberProfiles.id, displayName: memberProfiles.displayName }).from(memberProfiles).where(inArray(memberProfiles.id, otherIds)) : [];
  const peopleById = new Map(people.map(person => [person.id, person]));
  const matchById = new Map(profileMatches.map(match => [match.id, match]));
  const unreadRows = await db.select({ conversationId: messages.conversationId, id: messages.id }).from(messages).where(and(inArray(messages.conversationId, page.map(item => item.id)), isNull(messages.deletedAt), sql`${messages.senderProfileId} <> ${profileId}`, isNull(messages.readAt)));
  const unreadByConversation = new Map<number, number>();
  unreadRows.forEach(row => unreadByConversation.set(row.conversationId, (unreadByConversation.get(row.conversationId) ?? 0) + 1));
  return { items: page.map(record => { const match = matchById.get(record.matchId)!; const otherProfileId = match.memberOneProfileId === profileId ? match.memberTwoProfileId : match.memberOneProfileId; return { ...record, otherProfile: peopleById.get(otherProfileId), unreadCount: unreadByConversation.get(record.id) ?? 0 }; }), nextCursor: records.length > limit ? page.at(-1)?.id : undefined };
}

export async function listMessages(profileId: number, conversationId: number, input: { cursor?: number; limit?: number } = {}) {
  const db = await getDb();
  if (!db) return { items: [], nextCursor: undefined };
  const access = await requireConversationAccess(profileId, conversationId, ["mutual_interest", "active", "paused", "reported", "restricted"]);
  const limit = Math.min(Math.max(input.limit ?? 30, 1), 50);
  const conditions = [eq(messages.conversationId, conversationId), isNull(messages.deletedAt)];
  if (input.cursor) conditions.push(lt(messages.id, input.cursor));
  const rows = await db.select().from(messages).where(and(...conditions)).orderBy(desc(messages.id)).limit(limit + 1);
  const page = rows.slice(0, limit);
  await markMessagesRead(profileId, conversationId, page.filter(message => message.senderProfileId !== profileId).map(message => message.id));
  return { items: page.reverse(), nextCursor: rows.length > limit ? page.at(-1)?.id : undefined, conversation: { id: access.conversation.id, status: access.conversation.status, otherProfileId: access.otherProfileId } };
}

export async function sendText(profileId: number, conversationId: number, body: string, retryOfMessageId?: number, clientRequestId?: string) {
  const clean = normalizeUserText(body).trim();
  if (!clean || clean.length > MAX_TEXT_LENGTH) throw new Error("Messages must contain up to 2,000 characters");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await requireConversationAccess(profileId, conversationId, ["mutual_interest", "active"]);
  const requestId = normalizeClientRequestId(clientRequestId);
  const fingerprint = requestFingerprint("text", clean);
  const existing = await resolveExistingClientRequest(db, profileId, conversationId, requestId, fingerprint, "text");
  if (existing) return { id: existing.id, deliveryStatus: existing.deliveryStatus, duplicate: true };
  const recent = await db.select({ id: messages.id }).from(messages).where(and(eq(messages.conversationId, conversationId), eq(messages.senderProfileId, profileId), gt(messages.createdAt, new Date(Date.now() - 60_000)))).limit(9);
  if (recent.length >= 8) throw new Error("Please pause briefly before sending another message");
  if (retryOfMessageId) {
    const original = await db.select().from(messages).where(and(eq(messages.id, retryOfMessageId), eq(messages.senderProfileId, profileId), eq(messages.conversationId, conversationId), eq(messages.deliveryStatus, "failed"))).limit(1);
    if (!original[0]) throw new Error("This message cannot be retried");
  }
  let result;
  try {
    result = await db.insert(messages).values({ conversationId, senderProfileId: profileId, messageType: "text", body: clean, retryOfMessageId: retryOfMessageId ?? null, clientRequestId: requestId, requestFingerprint: fingerprint, deliveryStatus: "sent" });
  } catch (error) {
    const duplicate = await resolveExistingClientRequest(db, profileId, conversationId, requestId, fingerprint, "text");
    if (duplicate) return { id: duplicate.id, deliveryStatus: duplicate.deliveryStatus, duplicate: true };
    throw error;
  }
  const messageId = Number(result[0].insertId);
  await touchConversation(conversationId, profileId, "message_sent", "text");
  await notifyParticipant(profileId, conversationId, "message", "New message from a match", "You have received a new message in a private conversation.");
  return { id: messageId, deliveryStatus: "sent" as const, duplicate: false };
}

export async function uploadVoiceNote(profileId: number, conversationId: number, dataUrl: string, durationSeconds: number, clientRequestId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await requireConversationAccess(profileId, conversationId, ["mutual_interest", "active"]);
  const requestId = normalizeClientRequestId(clientRequestId);
  const { buffer, mimeType, extension } = decodeVoice(dataUrl);
  const validation = validateVoiceNoteMeta({ mimeType, byteLength: buffer.length, durationSeconds });
  if (!validation.valid) throw new Error(validation.reason);
  const fingerprint = requestFingerprint("voice", `${mimeType}:${durationSeconds}`, buffer);
  const existing = await resolveExistingClientRequest(db, profileId, conversationId, requestId, fingerprint, "voice");
  if (existing) return { id: existing.id, durationSeconds: existing.durationSeconds ?? durationSeconds, duplicate: true };
  const stored = await storagePut(`members/${profileId}/conversations/${conversationId}/voice/${requestId}.${extension}`, buffer, mimeType);
  let result;
  try {
    result = await db.insert(messages).values({ conversationId, senderProfileId: profileId, messageType: "voice", mediaStorageKey: stored.key, mimeType, durationSeconds, clientRequestId: requestId, requestFingerprint: fingerprint, deliveryStatus: "sent", metadata: { optimizedFor: "low_bandwidth", download: "controlled_access" } });
  } catch (error) {
    const duplicate = await resolveExistingClientRequest(db, profileId, conversationId, requestId, fingerprint, "voice");
    if (duplicate) return { id: duplicate.id, durationSeconds: duplicate.durationSeconds ?? durationSeconds, duplicate: true };
    throw error;
  }
  const messageId = Number(result[0].insertId);
  await touchConversation(conversationId, profileId, "voice_note_sent", "voice");
  await notifyParticipant(profileId, conversationId, "message", "New voice note from a match", "You have received a private voice note in your conversation.");
  return { id: messageId, durationSeconds, duplicate: false };
}

export async function getVoiceNoteUrl(profileId: number, conversationId: number, messageId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await requireConversationAccess(profileId, conversationId, ["mutual_interest", "active", "paused", "reported", "restricted"]);
  const message = await db.select().from(messages).where(and(eq(messages.id, messageId), eq(messages.conversationId, conversationId), eq(messages.messageType, "voice"), isNull(messages.deletedAt))).limit(1);
  const voice = assertPrivateVoiceAccess(message[0], conversationId);
  return { messageId, url: await storageGetSignedUrl(voice.mediaStorageKey!), mimeType: message[0].mimeType, durationSeconds: message[0].durationSeconds };
}

export async function deleteOwnVoiceNote(profileId: number, conversationId: number, messageId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await requireConversationAccess(profileId, conversationId, ["mutual_interest", "active", "paused", "reported", "restricted"]);
  const message = await db.select().from(messages).where(and(eq(messages.id, messageId), eq(messages.conversationId, conversationId), eq(messages.messageType, "voice"), isNull(messages.deletedAt))).limit(1);
  assertOwnVoiceDeletion(message[0], conversationId, profileId);
  await db.update(messages).set({ deletedAt: new Date(), body: null, mediaStorageKey: null }).where(eq(messages.id, messageId));
  await createAuditLog(null, "voice_note.deleted", "message", String(messageId), { conversationId, actorProfileId: profileId });
}

export async function setConversationPreference(profileId: number, conversationId: number, input: { isMuted?: boolean; readReceiptsEnabled?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await requireConversationAccess(profileId, conversationId, ["mutual_interest", "active", "paused", "reported", "restricted"]);
  await db.insert(conversationPreferences).values({ conversationId, profileId, ...input }).onDuplicateKeyUpdate({ set: input });
  return db.select().from(conversationPreferences).where(and(eq(conversationPreferences.conversationId, conversationId), eq(conversationPreferences.profileId, profileId))).limit(1);
}

export async function setConversationState(profileId: number, conversationId: number, state: "active" | "paused" | "closed") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await requireConversationAccess(profileId, conversationId, ["mutual_interest", "active", "paused", "reported", "restricted"]);
  await db.update(conversations).set({ status: state, closedAt: state === "closed" ? new Date() : null, lastActivityAt: new Date() }).where(eq(conversations.id, conversationId));
  await recordEvent(conversationId, profileId, state === "closed" ? "conversation_closed" : state === "paused" ? "conversation_paused" : "conversation_started");
}

export async function blockConversationMember(profileId: number, conversationId: number, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const access = await requireConversationAccess(profileId, conversationId, ["mutual_interest", "active", "paused", "reported", "restricted"]);
  await blockProfile(profileId, access.otherProfileId, reason);
  await db.update(conversations).set({ status: "blocked", closedAt: new Date(), lastActivityAt: new Date() }).where(eq(conversations.id, conversationId));
  await db.update(matches).set({ status: "blocked", closedAt: new Date() }).where(eq(matches.id, access.match.id));
  await recordEvent(conversationId, profileId, "member_blocked");
  await revokeConnectionForConversation(conversationId, "block", { profileId });
}

export async function reportMessage(profileId: number, conversationId: number, messageId: number, reason: ReportReason, details?: string, clientRequestId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const access = await requireConversationAccess(profileId, conversationId, ["mutual_interest", "active", "paused", "reported", "restricted"]);
  const message = await db.select().from(messages).where(and(eq(messages.id, messageId), eq(messages.conversationId, conversationId), isNull(messages.deletedAt))).limit(1);
  if (!message[0]) throw new Error("Message is unavailable");
  const reportedProfileId = message[0].senderProfileId === profileId ? access.otherProfileId : message[0].senderProfileId;
  const report = await createReport(profileId, { reportedProfileId, conversationId, messageId, reason, details: normalizeOptionalUserText(details) ?? undefined, clientRequestId });
	  if (report.duplicate) return { created: false, duplicate: true, reportId: report.reportId };
  await createIntegritySignal({ subjectProfileId: reportedProfileId, reportId: report.reportId, source: "messaging", category: reason === "financial_solicitation" ? "financial_solicitation" : "messaging_behavior", severity: ["scam", "harassment", "financial_solicitation", "safety_concern"].includes(reason) ? "medium" : "low", evidenceConfidence: "unverified", idempotencyKey: `message-report:${report.reportId}` });
  await db.update(messages).set({ reportCount: sql`${messages.reportCount} + 1`, moderationStatus: "flagged" }).where(eq(messages.id, messageId));
  await db.update(conversations).set({ status: "reported", lastActivityAt: new Date() }).where(eq(conversations.id, conversationId));
  await recordEvent(conversationId, profileId, "safety_reported", { messageId, reason });
  if (["scam", "harassment", "financial_solicitation", "safety_concern"].includes(reason)) await revokeConnectionForConversation(conversationId, "open_report", { profileId });
  return { created: true, duplicate: false, reportId: report.reportId };
}

/** Scoped Trust & Safety hook; a member never self-applies a moderation restriction. */
export async function setConversationModerationState(actorUserId: number, conversationId: number, state: "restricted" | "active", reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const record = await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  if (!record[0]) throw new Error("Conversation is unavailable");
  await db.update(conversations).set({ status: state, restrictedAt: state === "restricted" ? new Date() : null, lastActivityAt: new Date() }).where(eq(conversations.id, conversationId));
  await recordEvent(conversationId, null, "conversation_restricted", { state, reason: reason ?? null });
  await createAuditLog(actorUserId, `conversation.${state}`, "conversation", String(conversationId), { reason: reason ?? null });
}

export async function getConversationPrompts(profileId: number, conversationId: number) {
  const access = await requireConversationAccess(profileId, conversationId, ["mutual_interest", "active", "paused", "reported", "restricted"]);
  const generic = ["What are you hoping to build in a marriage?", "What role do you believe family should play in marriage?", "Where would you ideally like to build your family?", "What qualities matter most to you in a spouse?", "What are your expectations around communication?", "How important is religious practice in your household?", "What does a peaceful marriage mean to you?"];
  const explanation = await getCompatibilityExplanation(profileId, access.otherProfileId);
  const guided = [...explanation.compatible, ...explanation.considerations].slice(0, 3).map(item => safePromptForDimension(item.dimension));
  return { introduction: "You both expressed interest in getting to know each other for marriage.", prompts: Array.from(new Set([...guided.filter(Boolean), ...generic])).slice(0, 7) };
}


async function requireConversationAccess(profileId: number, conversationId: number, allowed: ConversationStatus[]) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const conversation = await db.select().from(conversations).where(and(eq(conversations.id, conversationId), inArray(conversations.status, allowed))).limit(1);
  if (!conversation[0]) throw new Error("Conversation is unavailable");
  const match = await db.select().from(matches).where(and(eq(matches.id, conversation[0].matchId), eq(matches.status, "active"))).limit(1);
  if (!match[0] || (match[0].memberOneProfileId !== profileId && match[0].memberTwoProfileId !== profileId)) throw new Error("Conversation is unavailable");
  const otherProfileId = match[0].memberOneProfileId === profileId ? match[0].memberTwoProfileId : match[0].memberOneProfileId;
  const blocked = await db.select({ id: blocks.id }).from(blocks).where(or(and(eq(blocks.blockerProfileId, profileId), eq(blocks.blockedProfileId, otherProfileId)), and(eq(blocks.blockerProfileId, otherProfileId), eq(blocks.blockedProfileId, profileId)))).limit(1);
  if (blocked[0]) throw new Error("Conversation is unavailable");
  return { conversation: conversation[0], match: match[0], otherProfileId };
}

export async function markMessagesRead(profileId: number, conversationId: number, ids: number[]) {
  if (!ids.length) return;
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  await db.update(messages).set({ readAt: now, deliveredAt: now, deliveryStatus: "delivered" }).where(and(inArray(messages.id, ids), eq(messages.conversationId, conversationId)));
  for (const id of ids) await db.insert(messageReads).values({ messageId: id, readerProfileId: profileId, readAt: now }).onDuplicateKeyUpdate({ set: { readAt: now } });
  await recordInteraction(conversationId, profileId, "read");
  await recordEvent(conversationId, profileId, "message_read", { messageCount: ids.length });
}

async function touchConversation(conversationId: number, profileId: number, event: "message_sent" | "voice_note_sent", kind: "text" | "voice") {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  await db.update(conversations).set({ status: "active", lastMessageAt: now, lastActivityAt: now }).where(eq(conversations.id, conversationId));
  await recordInteraction(conversationId, profileId, kind);
  await recordEvent(conversationId, profileId, event);
}

export async function recordInteraction(conversationId: number, profileId: number, kind: "text" | "voice" | "read") {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  const signal = interactionSignalKind(kind);
  const set = signal === "messagesSent" ? { messagesSent: sql`${conversationInteractionSignals.messagesSent} + 1`, lastParticipatedAt: now } : signal === "voiceNotesSent" ? { voiceNotesSent: sql`${conversationInteractionSignals.voiceNotesSent} + 1`, lastParticipatedAt: now } : { readEvents: sql`${conversationInteractionSignals.readEvents} + 1`, lastParticipatedAt: now };
  await db.insert(conversationInteractionSignals).values({ conversationId, profileId, firstParticipatedAt: now, lastParticipatedAt: now }).onDuplicateKeyUpdate({ set });
}

async function recordEvent(conversationId: number, actorProfileId: number | null, eventType: "mutual_interest" | "conversation_started" | "message_sent" | "voice_note_sent" | "message_deduplicated" | "message_request_conflict" | "message_read" | "conversation_paused" | "conversation_restricted" | "conversation_closed" | "safety_reported" | "member_blocked", metadata?: unknown) {
  const db = await getDb();
  if (!db) return;
  await db.insert(conversationEvents).values({ conversationId, actorProfileId, eventType, metadata: metadata ?? null });
}

async function notifyParticipant(senderProfileId: number, conversationId: number, type: "message", title: string, body: string) {
  const db = await getDb();
  if (!db) return;
  const access = await requireConversationAccess(senderProfileId, conversationId, ["mutual_interest", "active"]);
  const recipient = await db.select({ userId: memberProfiles.userId }).from(memberProfiles).where(eq(memberProfiles.id, access.otherProfileId)).limit(1);
  const preference = await db.select().from(conversationPreferences).where(and(eq(conversationPreferences.conversationId, conversationId), eq(conversationPreferences.profileId, access.otherProfileId))).limit(1);
  if (recipient[0] && !preference[0]?.isMuted) await createNotification(recipient[0].userId, type, title, body, `/app/messages/${conversationId}`, `${type}:${conversationId}:${Date.now()}`);
}

function normalizeClientRequestId(value?: string) {
  const requestId = value?.trim() || randomUUID();
  if (!/^[A-Za-z0-9_-]{16,96}$/.test(requestId)) throw new Error("This message could not be prepared safely. Please try again.");
  return requestId;
}

async function findExistingClientRequest(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, profileId: number, conversationId: number, clientRequestId: string) {
  const existing = await db.select({ id: messages.id, deliveryStatus: messages.deliveryStatus, durationSeconds: messages.durationSeconds, requestFingerprint: messages.requestFingerprint }).from(messages).where(and(eq(messages.senderProfileId, profileId), eq(messages.conversationId, conversationId), eq(messages.clientRequestId, clientRequestId))).limit(1);
  return existing[0];
}

function requestFingerprint(kind: "text" | "voice", payload: string, binary?: Buffer) {
  const secret = ENV.cookieSecret || "bantabato-development-request-fingerprint";
  const hmac = createHmac("sha256", secret).update(`${kind}\u0000${payload}\u0000`);
  if (binary) hmac.update(binary);
  return hmac.digest("hex");
}

function sameFingerprint(existing: string | null | undefined, next: string) {
  if (!existing || existing.length !== next.length) return false;
  return timingSafeEqual(Buffer.from(existing, "utf8"), Buffer.from(next, "utf8"));
}

async function resolveExistingClientRequest(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, profileId: number, conversationId: number, clientRequestId: string, fingerprint: string, messageType: "text" | "voice") {
  const existing = await findExistingClientRequest(db, profileId, conversationId, clientRequestId);
  if (!existing) return undefined;
  if (!sameFingerprint(existing.requestFingerprint, fingerprint)) {
    await recordEvent(conversationId, profileId, "message_request_conflict", { messageType, outcome: "different_payload" });
    throw new Error("This retry key is already linked to a different private message. Start a new message or voice note instead.");
  }
  await recordEvent(conversationId, profileId, "message_deduplicated", { messageType, outcome: "same_request_key" });
  return existing;
}

function decodeVoice(dataUrl: string) {
  const match = /^data:([^;]+);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw new Error("The voice-note upload format is invalid");
  const [, mimeType, encoded] = match;
  if (!ALLOWED_VOICE_MIME.includes(mimeType)) throw new Error("Use a supported compressed audio format");
  const buffer = Buffer.from(encoded, "base64");
  if (!buffer.length || buffer.length > MAX_VOICE_BYTES) throw new Error("Voice note is empty or exceeds the 6 MB limit");
  assertExpectedFileSignature(buffer, mimeType);
  const extension = ({ "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/mpeg": "mp3" } as Record<string, string>)[mimeType];
  return { buffer, mimeType, extension };
}
