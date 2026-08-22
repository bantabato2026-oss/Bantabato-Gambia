import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), createAuditLog: vi.fn(), getActiveAdminScopes: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb, createAuditLog: mocks.createAuditLog }));
vi.mock("./operations", () => ({ getActiveAdminScopes: mocks.getActiveAdminScopes }));

import { acceptStaffInvitation, decideOperationalApproval } from "./adminOperationsService";

function scriptedDb(rows: unknown[][], affectedRows = 1) {
  const updates: Array<Record<string, unknown>> = [];
  const select = () => {
    const result = rows.shift() ?? [];
    const query = {
      limit: async () => result,
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
      orderBy: () => query,
    };
    const joined = { where: () => query, innerJoin: () => joined };
    return { from: () => ({ where: () => query, innerJoin: () => joined }) };
  };
  const update = () => ({ set: (values: Record<string, unknown>) => ({ where: async () => { updates.push(values); return [{ affectedRows }]; } }) });
  const insert = () => ({ values: () => Object.assign([{ insertId: 1 }], { onDuplicateKeyUpdate: async () => undefined }) });
  return { db: { select, update, insert }, updates };
}

const freshAdmin = { id: 17, userId: 20, staffRole: "platform_administrator" as const, status: "active", lastReauthenticatedAt: new Date() };
const pendingRefund = { id: 81, requestedByUserId: 10, requiredApproverRole: "platform_administrator" as const, status: "pending" as const, expiresAt: new Date(Date.now() + 60_000), approvalType: "refund" as const, resourceType: "payment_refund", resourceId: "71", impactSummary: "{}" };

describe("controlled operational approval and invitation integrity", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getActiveAdminScopes.mockResolvedValue([]); });

  it("denies a proposer’s own pending approval before any decision write", async () => {
    const fake = scriptedDb([[{ ...freshAdmin, userId: 10 }], [], [], [pendingRefund]]); mocks.getDb.mockResolvedValue(fake.db);
    await expect(decideOperationalApproval(10, 81, "approved")).rejects.toThrow("cannot be decided");
    expect(fake.updates).toHaveLength(0);
  });

  it("denies an expired pending approval and a race-lost duplicate decision", async () => {
    const expired = scriptedDb([[freshAdmin], [], [], [{ ...pendingRefund, expiresAt: new Date(Date.now() - 1) }]]); mocks.getDb.mockResolvedValue(expired.db);
    await expect(decideOperationalApproval(20, 81, "approved")).rejects.toThrow("cannot be decided");
    expect(expired.updates).toHaveLength(0);

    const duplicate = scriptedDb([[freshAdmin], [], [], [pendingRefund]], 0); mocks.getDb.mockResolvedValue(duplicate.db);
    await expect(decideOperationalApproval(20, 81, "approved")).rejects.toThrow("already decided or is no longer available");
    expect(duplicate.updates).toHaveLength(1);
  });

  it("records an independent approved refund decision with safe audit metadata only", async () => {
    const fake = scriptedDb([[freshAdmin], [], [], [pendingRefund]]); mocks.getDb.mockResolvedValue(fake.db);
    await expect(decideOperationalApproval(20, 81, "approved")).resolves.toEqual({ success: true });
    expect(fake.updates).toContainEqual(expect.objectContaining({ status: "approved", approvedByUserId: 20, decidedAt: expect.any(Date) }));
    expect(mocks.createAuditLog).toHaveBeenCalledWith(20, "approval.approved", "operational_approval", "81", { approvalType: "refund" });
    expect(JSON.stringify(mocks.createAuditLog.mock.calls)).not.toMatch(/private message|document|audio|token/i);
  });

  it("rejects an expired or already-used staff invitation before creating a staff identity", async () => {
    const invitation = { id: 91, status: "accepted", expiresAt: new Date(Date.now() + 60_000), invitedEmail: "reviewer@example.test", invitationCodeHash: "unused-in-test" };
    const fake = scriptedDb([[invitation]]); mocks.getDb.mockResolvedValue(fake.db);
    await expect(acceptStaffInvitation(1201, "reviewer@example.test", "fictional-code")).rejects.toThrow("invalid, expired, or unavailable");
    expect(fake.updates).toHaveLength(0);
  });
});
