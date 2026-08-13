import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  createAuditLog: vi.fn(),
  createNotification: vi.fn(),
  createReport: vi.fn(),
  blockProfile: vi.fn(),
  storageGetSignedUrl: vi.fn(),
  storagePut: vi.fn(),
}));

vi.mock("./db", () => ({
  getDb: mocks.getDb,
  createAuditLog: mocks.createAuditLog,
  createNotification: mocks.createNotification,
  createReport: mocks.createReport,
  blockProfile: mocks.blockProfile,
}));
vi.mock("./storage", () => ({ storageGetSignedUrl: mocks.storageGetSignedUrl, storagePut: mocks.storagePut }));

import { deleteOwnVoiceNote, getVoiceNoteUrl, markMessagesRead, recordInteraction } from "./messagingService";

function fakeDb(rows: unknown[][]) {
  const updates: unknown[] = [];
  const inserts: unknown[] = [];
  const select = () => ({ from: () => ({ where: () => ({ limit: async () => rows.shift() ?? [], orderBy: () => ({ limit: async () => rows.shift() ?? [] }) }), orderBy: () => ({ limit: async () => rows.shift() ?? [] }) }) });
  const update = (table: unknown) => ({ set: (values: unknown) => ({ where: async () => { updates.push({ table, values }); } }) });
  const insert = (table: unknown) => ({ values: (values: unknown) => { inserts.push({ table, values }); return { onDuplicateKeyUpdate: async () => undefined }; } });
  return { db: { select, update, insert }, updates, inserts };
}

const activeConversation = { id: 10, matchId: 20, status: "active" };
const activeMatch = { id: 20, memberOneProfileId: 3, memberTwoProfileId: 4, status: "active" };

describe("messaging service database workflows", () => {
  beforeEach(() => vi.clearAllMocks());

  it("denies a blocked member before private voice storage can be resolved", async () => {
    const fake = fakeDb([[activeConversation], [activeMatch], [{ id: 99 }]]);
    mocks.getDb.mockResolvedValue(fake.db);
    await expect(getVoiceNoteUrl(3, 10, 7)).rejects.toThrow("Conversation is unavailable");
    expect(mocks.storageGetSignedUrl).not.toHaveBeenCalled();
  });

  it("persists a deletion only after real conversation authorization and sender ownership", async () => {
    const fake = fakeDb([[activeConversation], [activeMatch], [], [{ id: 7, conversationId: 10, senderProfileId: 3, messageType: "voice", mediaStorageKey: "private.webm", deletedAt: null }]]);
    mocks.getDb.mockResolvedValue(fake.db);
    await deleteOwnVoiceNote(3, 10, 7);
    expect(fake.updates).toHaveLength(1);
    expect(mocks.createAuditLog).toHaveBeenCalledWith(null, "voice_note.deleted", "message", "7", { conversationId: 10, actorProfileId: 3 });
  });

  it("rejects a counterpart attempting to delete the original sender's voice note", async () => {
    const fake = fakeDb([[activeConversation], [activeMatch], [], [{ id: 7, conversationId: 10, senderProfileId: 4, messageType: "voice", mediaStorageKey: "private.webm", deletedAt: null }]]);
    mocks.getDb.mockResolvedValue(fake.db);
    await expect(deleteOwnVoiceNote(3, 10, 7)).rejects.toThrow("Only your own available voice notes can be deleted");
    expect(fake.updates).toHaveLength(0);
  });

  it("persists read state and records read interaction signals without a relationship score", async () => {
    const fake = fakeDb([]);
    mocks.getDb.mockResolvedValue(fake.db);
    await markMessagesRead(3, 10, [71, 72]);
    expect(fake.updates).toHaveLength(1);
    expect(fake.inserts.length).toBeGreaterThanOrEqual(4);
  });

  it("writes distinct database interaction updates for text, voice, and read events", async () => {
    const fake = fakeDb([]);
    mocks.getDb.mockResolvedValue(fake.db);
    await recordInteraction(10, 3, "text");
    await recordInteraction(10, 3, "voice");
    await recordInteraction(10, 3, "read");
    expect(fake.inserts).toHaveLength(3);
  });
});
