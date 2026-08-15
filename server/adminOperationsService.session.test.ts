import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  createAuditLog: vi.fn(),
  getActiveAdminScopes: vi.fn(),
}));

vi.mock("./db", () => ({ getDb: mocks.getDb, createAuditLog: mocks.createAuditLog }));
vi.mock("./operations", () => ({ getActiveAdminScopes: mocks.getActiveAdminScopes }));

import { staffProfiles, staffSessionControls } from "../drizzle/schema";
import { getEffectiveStaffAccess } from "./adminOperationsService";

function sessionHarness() {
  let selectedTable: unknown;
  const chain = {
    from(table: unknown) { selectedTable = table; return chain; },
    where() { return chain; },
    innerJoin() { return chain; },
    limit() {
      if (selectedTable === staffProfiles) {
        return [{ id: 17, userId: 8, staffRole: "platform_administrator", status: "active", lastReauthenticatedAt: new Date() }];
      }
      if (selectedTable === staffSessionControls) {
        return [{ id: 4, status: "revoked", expiresAt: new Date(Date.now() + 60_000) }];
      }
      return [];
    },
  };
  return { select: vi.fn(() => chain) };
}

describe("Operations Center request-bound staff sessions", () => {
  it("rejects a revoked session control before returning the staff member's effective permissions", async () => {
    mocks.getDb.mockResolvedValue(sessionHarness());
    await expect(getEffectiveStaffAccess(8, "derived-session-reference")).rejects.toThrow(/session is no longer active/i);
  });
});
