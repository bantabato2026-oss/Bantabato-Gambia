import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), createAuditLog: vi.fn(), createNotification: vi.fn(), createReport: vi.fn(), blockProfile: vi.fn(), storageGetSignedUrl: vi.fn(), storagePut: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb, createAuditLog: mocks.createAuditLog, createNotification: mocks.createNotification, createReport: mocks.createReport, blockProfile: mocks.blockProfile }));
vi.mock("./storage", () => ({ storageGetSignedUrl: mocks.storageGetSignedUrl, storagePut: mocks.storagePut }));

import { listConversations, markMessagesRead, sendText, uploadVoiceNote } from "./messagingService";

function statefulHarness(queryRows: unknown[][]) {
  const inserts: Array<{ table: unknown; values: unknown }> = [];
  const updates: Array<{ table: unknown; values: unknown }> = [];
  const take = () => queryRows.shift() ?? [];
  const select = () => {
    const chain: any = { from: () => chain, where: () => chain, orderBy: () => chain, limit: async () => take() };
    chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(take()).then(resolve);
    return chain;
  };
  const db: any = {
    select,
    update: (table: unknown) => ({ set: (values: unknown) => ({ where: async () => { updates.push({ table, values }); } }) }),
    insert: (table: unknown) => ({ values: (values: unknown) => { inserts.push({ table, values }); return { onDuplicateKeyUpdate: async () => undefined, 0: { insertId: 91 } }; } }),
  };
  return { db, inserts, updates };
}

const conversation = { id: 10, matchId: 20, status: "active" };
const match = { id: 20, memberOneProfileId: 3, memberTwoProfileId: 4, status: "active" };
const accessRows = () => [[conversation], [match], []];
const notificationRows = () => [[conversation], [match], [], [{ userId: 44 }], []];

describe("Phase 4 messaging service flows", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.storagePut.mockResolvedValue({ key: "members/3/conversations/10/voice/private.webm" }); });

  it("sends text through mutual-match authorization and records a text interaction", async () => {
    const harness = statefulHarness([...accessRows(), [], [], ...accessRows(), ...notificationRows()]);
    mocks.getDb.mockResolvedValue(harness.db);
    await sendText(3, 10, "Assalamu alaikum. I would be glad to discuss our intentions respectfully.");
    expect(harness.inserts.some(entry => (entry.values as any).messageType === "text")).toBe(true);
    expect(harness.inserts.some(entry => (entry.values as any).profileId === 3 && (entry.values as any).conversationId === 10)).toBe(true);
    expect(harness.updates.length).toBeGreaterThan(0);
  });

  it("stores a validated private voice note through the same mutual-match gate and records a voice interaction", async () => {
    const harness = statefulHarness([...accessRows(), [], ...accessRows(), ...notificationRows()]);
    mocks.getDb.mockResolvedValue(harness.db);
    await uploadVoiceNote(3, 10, "data:audio/webm;base64,GkXfow==", 12);
    expect(mocks.storagePut).toHaveBeenCalledWith(expect.stringContaining("members/3/conversations/10/voice/"), expect.any(Buffer), "audio/webm");
    expect(harness.inserts.some(entry => (entry.values as any).messageType === "voice")).toBe(true);
    expect(harness.inserts.some(entry => (entry.values as any).voiceNotesSent === undefined && (entry.values as any).profileId === 3)).toBe(true);
  });

  it("persists reads and returns a bounded unread count for a member conversation list", async () => {
    const readHarness = statefulHarness([]);
    mocks.getDb.mockResolvedValue(readHarness.db);
    await markMessagesRead(3, 10, [71]);
    expect(readHarness.updates).toHaveLength(1);
    expect(readHarness.inserts.length).toBeGreaterThanOrEqual(3);

    const listHarness = statefulHarness([[match], [conversation], [{ id: 4, displayName: "Private match" }], [{ conversationId: 10, id: 71 }, { conversationId: 10, id: 72 }]]);
    mocks.getDb.mockResolvedValue(listHarness.db);
    const listed = await listConversations(3);
    expect(listed.items[0]?.unreadCount).toBe(2);
    expect(listed.items[0]?.otherProfile?.displayName).toBe("Private match");
  });
});
