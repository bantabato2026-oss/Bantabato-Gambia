import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), createAuditLog: vi.fn(), createNotification: vi.fn(), createReport: vi.fn(), blockProfile: vi.fn(), storageGetSignedUrl: vi.fn(), storagePut: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb, createAuditLog: mocks.createAuditLog, createNotification: mocks.createNotification, createReport: mocks.createReport, blockProfile: mocks.blockProfile }));
vi.mock("./storage", () => ({ storageGetSignedUrl: mocks.storageGetSignedUrl, storagePut: mocks.storagePut }));

import { blocks, conversationEvents, conversationInteractionSignals, conversationPreferences, conversations, matches, memberProfiles, messages } from "../drizzle/schema";
import { sendText, uploadVoiceNote } from "./messagingService";

const activeConversation = { id: 10, matchId: 20, status: "active" };
const activeMatch = { id: 20, memberOneProfileId: 3, memberTwoProfileId: 4, status: "active" };

function concurrentHarness(options: { requestLookupRows?: Array<unknown[] | (() => unknown[])> } = {}) {
  const inserted: Array<{ table: unknown; values: any }> = [];
  const messageRows: Array<{ id: number; clientRequestId: string; requestFingerprint: string; deliveryStatus: "sent"; durationSeconds: number | null }> = [];
  const requestLookupRows = [...(options.requestLookupRows ?? [])];
  let nextId = 1;
  const select = (fields?: Record<string, unknown>) => {
    let table: unknown;
    const rows = () => {
      if (table === conversations) return [activeConversation];
      if (table === matches) return [activeMatch];
      if (table === blocks || table === conversationPreferences) return [];
      if (table === memberProfiles) return [{ userId: 44 }];
      if (table === messages && fields && "requestFingerprint" in fields) {
        const planned = requestLookupRows.shift();
        if (planned) return typeof planned === "function" ? planned() : planned;
        return messageRows.map(row => ({ id: row.id, deliveryStatus: row.deliveryStatus, durationSeconds: row.durationSeconds, requestFingerprint: row.requestFingerprint }));
      }
      if (table === messages) return [];
      return [];
    };
    const chain: any = { from: (nextTable: unknown) => { table = nextTable; return chain; }, where: () => chain, orderBy: () => chain, limit: async () => rows() };
    chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(rows()).then(resolve);
    return chain;
  };
  const db: any = {
    select,
    update: () => ({ set: () => ({ where: async () => undefined }) }),
    insert: (table: unknown) => ({ values: (values: any) => {
      inserted.push({ table, values });
      if (table === messages) {
        const duplicate = messageRows.find(row => row.clientRequestId === values.clientRequestId);
        if (duplicate) throw new Error("duplicate unique key");
        const row = { id: nextId++, clientRequestId: values.clientRequestId, requestFingerprint: values.requestFingerprint, deliveryStatus: "sent" as const, durationSeconds: values.durationSeconds ?? null };
        messageRows.push(row);
        return { 0: { insertId: row.id } };
      }
      return { onDuplicateKeyUpdate: async () => undefined, 0: { insertId: nextId++ } };
    } }),
  };
  return { db, inserted, messageRows };
}

describe("private message concurrency assurance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storagePut.mockImplementation(async key => ({ key }));
  });

  it("creates one text message for two concurrent identical request keys and records content-free deduplication evidence", async () => {
    const harness = concurrentHarness(); mocks.getDb.mockResolvedValue(harness.db);
    const requestId = "text_concurrent_request_0001";
    const [first, second] = await Promise.all([sendText(3, 10, "A respectful message", undefined, requestId), sendText(3, 10, "A respectful message", undefined, requestId)]);
    expect(harness.messageRows).toHaveLength(1);
    expect([first.duplicate, second.duplicate].filter(Boolean)).toHaveLength(1);
    const events = harness.inserted.filter(entry => entry.table === conversationEvents).map(entry => entry.values);
    expect(events.some(event => event.eventType === "message_sent")).toBe(true);
    expect(events.some(event => event.eventType === "message_deduplicated" && event.metadata?.outcome === "same_request_key")).toBe(true);
    expect(JSON.stringify(events)).not.toContain("A respectful message");
  });

  it("creates one logical voice message and one private storage key for concurrent identical request keys", async () => {
    const harness = concurrentHarness(); mocks.getDb.mockResolvedValue(harness.db);
    const requestId = "voice_concurrent_request_0001";
    const [first, second] = await Promise.all([uploadVoiceNote(3, 10, "data:audio/webm;base64,GkXfow==", 12, requestId), uploadVoiceNote(3, 10, "data:audio/webm;base64,GkXfow==", 12, requestId)]);
    expect(harness.messageRows).toHaveLength(1);
    expect([first.duplicate, second.duplicate].filter(Boolean)).toHaveLength(1);
    const keys = mocks.storagePut.mock.calls.map(call => call[0]);
    expect(new Set(keys)).toEqual(new Set([`members/3/conversations/10/voice/${requestId}.webm`]));
    expect(harness.inserted.filter(entry => entry.table === messages)).toHaveLength(2);
  });

  it("returns the original result after an uncertain network response and preserves one logical message", async () => {
    const harness = concurrentHarness(); mocks.getDb.mockResolvedValue(harness.db);
    const requestId = "network_interruption_request_01";
    const first = await sendText(3, 10, "Please let us continue respectfully.", undefined, requestId);
    const retry = await sendText(3, 10, "Please let us continue respectfully.", undefined, requestId);
    expect(first.duplicate).toBe(false);
    expect(retry.duplicate).toBe(true);
    expect(harness.messageRows).toHaveLength(1);
  });

  it("keeps distinct request keys as distinct operations while rejecting a reused key with different payload", async () => {
    const harness = concurrentHarness({ requestLookupRows: [[], [], () => [{ id: 1, deliveryStatus: "sent", durationSeconds: null, requestFingerprint: harness.messageRows[0]?.requestFingerprint }]] }); mocks.getDb.mockResolvedValue(harness.db);
    await sendText(3, 10, "First separate operation", undefined, "distinct_request_key_000001");
    await sendText(3, 10, "Second separate operation", undefined, "distinct_request_key_000002");
    await expect(sendText(3, 10, "Changed payload", undefined, "distinct_request_key_000001")).rejects.toThrow("already linked to a different private message");
    expect(harness.messageRows).toHaveLength(2);
    const conflict = harness.inserted.find(entry => entry.table === conversationEvents && entry.values.eventType === "message_request_conflict");
    expect(conflict?.values.metadata).toEqual({ messageType: "text", outcome: "different_payload" });
    expect(JSON.stringify(conflict?.values)).not.toContain("Changed payload");
  });
});
