import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  createAuditLog: vi.fn(),
  createNotification: vi.fn(),
  getCompatibilityExplanation: vi.fn(),
  addCaseNote: vi.fn(),
  getCaseNotes: vi.fn(),
}));

vi.mock("./db", () => ({ getDb: mocks.getDb, createAuditLog: mocks.createAuditLog, createNotification: mocks.createNotification }));
vi.mock("./compatibilityService", () => ({ getCompatibilityExplanation: mocks.getCompatibilityExplanation }));
vi.mock("./operations", () => ({ addCaseNote: mocks.addCaseNote, getCaseNotes: mocks.getCaseNotes }));

import { decideConnectionReview, flagConnectionIntegrityConcern, grantConnectionConsent, revokeConnectionForConversation, withdrawConnectionConsent } from "./readinessService";

function fakeDb(rows: unknown[][]) {
  const updates: Array<{ table: unknown; values: Record<string, unknown> }> = [];
  const inserts: Array<{ table: unknown; values: Record<string, unknown> }> = [];
	  const select = () => {
	    const result = rows.shift() ?? [];
	    const query = { limit: async () => result, orderBy: () => ({ limit: async () => result }), then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) };
	    return { from: () => ({ where: () => query }) };
	  };
  const update = (table: unknown) => ({ set: (values: Record<string, unknown>) => ({ where: async () => { updates.push({ table, values }); } }) });
  const insert = (table: unknown) => ({ values: (values: Record<string, unknown>) => { inserts.push({ table, values }); return Object.assign([{ insertId: inserts.length }], { onDuplicateKeyUpdate: async () => undefined }); } });
  return { db: { select, update, insert }, updates, inserts };
}

const conversation = { id: 10, matchId: 20, status: "active" };
const match = { id: 20, memberOneProfileId: 3, memberTwoProfileId: 4, status: "active" };
const connectionState = { id: 70, conversationId: 10 };

describe("Phase 5 readiness service flows", () => {
  beforeEach(() => vi.clearAllMocks());

  it("immediately revokes only the withdrawn capability and persists an audit event", async () => {
    const fake = fakeDb([[conversation], [match], [connectionState], [connectionState]]);
    mocks.getDb.mockResolvedValue(fake.db);

    await expect(withdrawConnectionConsent(3, 10, "voice")).resolves.toEqual({ withdrawn: true });

    expect(fake.updates.some(update => update.values.status === "revoked" && update.values.voiceEligible === false && update.values.videoEligible === false)).toBe(true);
    expect(fake.inserts.some(insert => insert.values.reason === "member_withdrew_consent" && insert.values.capability === "voice")).toBe(true);
    expect(mocks.createAuditLog).toHaveBeenCalledWith(null, "connection.revoked", "connection_state", "70", expect.objectContaining({ capability: "voice", reason: "member_withdrew_consent" }));
  });

  it("revokes both future-provider permissions for a safety or account lifecycle trigger", async () => {
    const fake = fakeDb([[connectionState]]);
    mocks.getDb.mockResolvedValue(fake.db);

    await revokeConnectionForConversation(10, "account_suspended", { userId: 99 });

    expect(fake.inserts.some(insert => insert.values.reason === "account_suspended" && insert.values.capability === "all")).toBe(true);
    expect(fake.inserts.filter(insert => insert.values.status === "revoked")).toHaveLength(2);
    expect(mocks.createAuditLog).toHaveBeenCalledWith(99, "connection.revoked", "connection_state", "70", expect.objectContaining({ capability: "all", reason: "account_suspended" }));
  });

  it("immediately persists restricted state and revoked permissions for an applied safety restriction", async () => {
    const fake = fakeDb([[connectionState]]);
    mocks.getDb.mockResolvedValue(fake.db);

    await revokeConnectionForConversation(10, "safety_restriction", { userId: 99 });

    expect(fake.updates.some(update => update.values.status === "restricted" && update.values.restrictedAt instanceof Date)).toBe(true);
    expect(fake.inserts.filter(insert => insert.values.status === "revoked")).toHaveLength(2);
    expect(mocks.createAuditLog).toHaveBeenCalledWith(99, "connection.revoked", "connection_state", "70", expect.objectContaining({ reason: "safety_restriction" }));
  });

  it("immediately persists revoked state and permissions when a new hard incompatibility is detected", async () => {
    const fake = fakeDb([[connectionState]]);
    mocks.getDb.mockResolvedValue(fake.db);

    await revokeConnectionForConversation(10, "hard_incompatibility", { profileId: 3 });

    expect(fake.updates.some(update => update.values.status === "revoked" && update.values.voiceEligible === false && update.values.videoEligible === false)).toBe(true);
    expect(fake.inserts.some(insert => insert.values.reason === "hard_incompatibility" && insert.values.capability === "all")).toBe(true);
    expect(fake.inserts.filter(insert => insert.values.status === "revoked")).toHaveLength(2);
  });

  it("records separate member consent only after the configurable mutual-readiness evidence is met", async () => {
    const signals = [
      { profileId: 3, messagesSent: 5, voiceNotesSent: 2, firstParticipatedAt: new Date("2026-08-01"), lastParticipatedAt: new Date("2026-08-04") },
      { profileId: 4, messagesSent: 5, voiceNotesSent: 2, firstParticipatedAt: new Date("2026-08-01"), lastParticipatedAt: new Date("2026-08-04") },
    ];
	    const events = [
	      { actorProfileId: 3, eventType: "message_sent", createdAt: new Date("2026-08-01") },
	      { actorProfileId: 3, eventType: "voice_note_sent", createdAt: new Date("2026-08-04") },
	      { actorProfileId: 4, eventType: "message_sent", createdAt: new Date("2026-08-01") },
	      { actorProfileId: 4, eventType: "voice_note_sent", createdAt: new Date("2026-08-04") },
	    ];
	    const fake = fakeDb([[conversation], [match], [], [connectionState], signals, events, [{ id: 3, profileStatus: "active", deletedAt: null }, { id: 4, profileStatus: "active", deletedAt: null }], [], [], [{ profileId: 3 }, { profileId: 4 }], [], [], [{ userId: 44 }]]);
    mocks.getDb.mockResolvedValue(fake.db);
    mocks.getCompatibilityExplanation.mockResolvedValue({ eligible: true });

    await expect(grantConnectionConsent(3, 10, "voice")).resolves.toEqual({ granted: true });

    expect(fake.inserts.some(insert => insert.values.capability === "voice" && insert.values.status === "granted" && insert.values.profileId === 3)).toBe(true);
    expect(mocks.createNotification).toHaveBeenCalledWith(44, "connection", "Voice communication consent", expect.stringContaining("separate consent"), "/app/readiness/10", expect.any(String));
  });

  it("creates an auditable human-review hold and immediately revokes both capabilities when staff flag an interaction-integrity concern", async () => {
    const fake = fakeDb([[ ], [connectionState], []]);
    mocks.getDb.mockResolvedValue(fake.db);

    await flagConnectionIntegrityConcern(99, 10, "Pattern requires manual review.");

    expect(mocks.addCaseNote).toHaveBeenCalledWith(99, "connection_review", expect.any(Number), "Pattern requires manual review.");
    expect(fake.inserts.some(insert => insert.values.reason === "other" && insert.values.capability === "all")).toBe(true);
    expect(fake.inserts.filter(insert => insert.values.status === "revoked")).toHaveLength(2);
    expect(mocks.createAuditLog).toHaveBeenCalledWith(99, "connection.integrity_flagged", "connection_review", expect.any(String), { conversationId: 10 });
  });

  it("makes only the approved capability available after a scoped connection-review decision", async () => {
    const review = { id: 81, connectionStateId: 70, status: "pending" };
    const fake = fakeDb([[review], [connectionState]]);
    mocks.getDb.mockResolvedValue(fake.db);

    await decideConnectionReview(99, 81, "approved_voice");

    expect(fake.updates.some(update => update.values.status === "approved_voice" && update.values.voiceEligible === true && update.values.videoEligible === false)).toBe(true);
    expect(fake.inserts.some(insert => insert.values.capability === "voice" && insert.values.status === "available")).toBe(true);
    expect(mocks.createAuditLog).toHaveBeenCalledWith(99, "connection_review.approved_voice", "connection_review", "81", { connectionStateId: 70 });
  });

  it("revokes both permissions when a scoped connection-review decision restricts a case", async () => {
    const review = { id: 81, connectionStateId: 70, status: "pending" };
    const fake = fakeDb([[review], [connectionState]]);
    mocks.getDb.mockResolvedValue(fake.db);

    await decideConnectionReview(99, 81, "restricted");

    expect(fake.updates.some(update => update.values.status === "restricted" && update.values.voiceEligible === false && update.values.videoEligible === false)).toBe(true);
    expect(fake.inserts.filter(insert => insert.values.status === "revoked")).toHaveLength(2);
    expect(mocks.createAuditLog).toHaveBeenCalledWith(99, "connection_review.restricted", "connection_review", "81", { connectionStateId: 70 });
  });
});
