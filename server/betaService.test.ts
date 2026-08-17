import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), createAuditLog: vi.fn(), requireOperationalPermission: vi.fn() }));

vi.mock("./db", () => ({ getDb: mocks.getDb, createAuditLog: mocks.createAuditLog }));
vi.mock("./adminOperationsService", () => ({ requireOperationalPermission: mocks.requireOperationalPermission }));

import { acceptBetaInvitation, requireBetaMemberAccess, setBetaMode } from "./betaService";

function fakeDb(selectRows: unknown[][]) {
  const inserts: unknown[] = []; const updates: unknown[] = [];
  const db = {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => selectRows.shift() ?? [] }) }) }),
    insert: (table: unknown) => ({ values: async (values: unknown) => { inserts.push({ table, values }); return [{ insertId: inserts.length }]; } }),
    update: (table: unknown) => ({ set: (values: unknown) => ({ where: async () => { updates.push({ table, values }); return [{ affectedRows: 1 }]; } }) }),
  };
  return { db, inserts, updates };
}

const inviteOnly = { environment: "development", mode: "invite_only" as const };
const pendingInvitation = { id: 41, status: "pending" as const, expiresAt: new Date(Date.now() + 60_000), invitedEmail: "beta@example.com" };

describe("closed-beta invitation acceptance", () => {
  beforeEach(() => vi.clearAllMocks());

  it("denies an invalid or modified invitation before enrollment writes", async () => {
    const fake = fakeDb([[inviteOnly], []]); mocks.getDb.mockResolvedValue(fake.db);
    await expect(acceptBetaInvitation(7, "beta@example.com", "x".repeat(24))).rejects.toThrow(/invalid/i);
    expect(fake.inserts).toHaveLength(0); expect(mocks.createAuditLog).not.toHaveBeenCalled();
  });

  it("denies expired, revoked, and already-used invitation states", async () => {
    for (const invitation of [
      { ...pendingInvitation, expiresAt: new Date(Date.now() - 1) },
      { ...pendingInvitation, status: "revoked" },
      { ...pendingInvitation, status: "accepted" },
    ]) {
      const fake = fakeDb([[inviteOnly], [invitation]]); mocks.getDb.mockResolvedValue(fake.db);
      await expect(acceptBetaInvitation(7, "beta@example.com", "x".repeat(24))).rejects.toThrow(/invalid|unavailable/i);
      expect(fake.inserts).toHaveLength(0);
    }
  });

  it("denies unauthorized email use and replayed enrollment without recording an enrollment", async () => {
    const mismatch = fakeDb([[inviteOnly], [pendingInvitation]]); mocks.getDb.mockResolvedValue(mismatch.db);
    await expect(acceptBetaInvitation(7, "other@example.com", "x".repeat(24))).rejects.toThrow(/invalid/i);
    expect(mismatch.inserts).toHaveLength(0);

    const replay = fakeDb([[inviteOnly], [pendingInvitation], [{ id: 9, status: "enrolled" }]]); mocks.getDb.mockResolvedValue(replay.db);
    await expect(acceptBetaInvitation(7, "beta@example.com", "x".repeat(24))).rejects.toThrow(/already enrolled/i);
    expect(replay.inserts).toHaveLength(0);
  });

  it("accepts a matching pending invitation once and records only metadata events", async () => {
    const fake = fakeDb([[inviteOnly], [pendingInvitation], []]); mocks.getDb.mockResolvedValue(fake.db);
    await expect(acceptBetaInvitation(7, "beta@example.com", "x".repeat(24))).resolves.toEqual({ enrollmentStatus: "enrolled" });
    expect(fake.updates).toHaveLength(1); expect(fake.inserts.length).toBeGreaterThanOrEqual(3);
    expect(mocks.createAuditLog).toHaveBeenCalledWith(7, "beta.enrollment_completed", "beta_enrollment", "1", { invitationId: 41 });
  });

  it("denies direct member access for an authenticated but unenrolled account", async () => {
    const fake = fakeDb([[inviteOnly], []]); mocks.getDb.mockResolvedValue(fake.db);
    await expect(requireBetaMemberAccess(7)).rejects.toThrow(/not enrolled/i);
  });

  it("denies an enrolled account during emergency shutdown", async () => {
    const fake = fakeDb([[{ environment: "development", mode: "shutdown" }], [{ id: 8, status: "enrolled" }]]); mocks.getDb.mockResolvedValue(fake.db);
    await expect(requireBetaMemberAccess(7)).rejects.toThrow(/temporarily unavailable/i);
  });

  it("binds beta mode changes to the trusted runtime environment rather than a staff client input", async () => {
    const previousNodeEnv = process.env.NODE_ENV; const previousAppEnv = process.env.APP_ENV;
    const inserts: unknown[] = [];
    try {
      process.env.NODE_ENV = "development"; delete process.env.APP_ENV;
      mocks.getDb.mockResolvedValue({
        insert: (table: unknown) => ({ values: (values: unknown) => { inserts.push({ table, values }); return { onDuplicateKeyUpdate: async () => undefined }; } }),
        select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ id: 11 }] }) }) }),
      });
      await setBetaMode(7, { mode: "paused" });
      expect(inserts[0]).toMatchObject({ values: { environment: "development", mode: "paused", updatedByUserId: 7 } });
      expect(mocks.createAuditLog).toHaveBeenCalledWith(7, "beta.mode_changed", "beta_launch_control", "11", { environment: "development", mode: "paused" });
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
      if (previousAppEnv === undefined) delete process.env.APP_ENV; else process.env.APP_ENV = previousAppEnv;
    }
  });
});
