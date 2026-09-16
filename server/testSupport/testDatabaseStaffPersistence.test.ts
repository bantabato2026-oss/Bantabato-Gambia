import { mkdir, writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { operationalApprovals, staffProfiles, staffSessionControls } from "../../drizzle/schema";
import { createSupportTicket, decideOperationalApproval, getEffectiveStaffAccess, listSupportTickets, requireOperationalPermission } from "../adminOperationsService";
import { canDecideApproval, DEFAULT_ROLE_PERMISSIONS, roleCan, staffSessionIsUsable } from "../domain/adminOperationsPolicy";
import { closeIsolatedTestDatabase, openIsolatedTestDatabase, seedFictionalMembers, seedFictionalStaff, withIsolatedRollback, withSeededFictionalStaff } from "./testDatabaseAdapter";
import { compareStaffStates, expectedStaffState, normalizeInMemoryStaffState } from "./staffStateNormalizer";

const configuredForIsolatedDatabase = Boolean(
  process.env.BANTABATO_TEST_MODE &&
  process.env.BANTABATO_TEST_DATABASE_URL &&
  process.env.BANTABATO_TEST_DATABASE_NAME,
);

describe("Sprint 51 persisted fictional staff authority", () => {
  it.skipIf(!configuredForIsolatedDatabase)("resolves each persisted staff role and denies cross-role permissions", async () => {
    const handle = await openIsolatedTestDatabase();
    try {
      await withSeededFictionalStaff(handle, async staff => {
        const byId = new Map(staff.map(identity => [identity.id, identity]));
        const comparisons = [];
        for (const identity of staff) {
          const access = await getEffectiveStaffAccess(identity.userId, identity.sessionReferenceHash);
          expect(access.staffRole).toBe(identity.staffRole);
          expect(access.status).toBe("active");
          expect(access.permissions).toEqual(expect.arrayContaining(["audit.view"]));
          const expected = expectedStaffState(identity, DEFAULT_ROLE_PERMISSIONS[identity.staffRole]);
          const inMemory = normalizeInMemoryStaffState(identity, DEFAULT_ROLE_PERMISSIONS[identity.staffRole], true);
          const database = normalizeInMemoryStaffState(identity, access.permissions, true);
          const comparison = compareStaffStates(identity, expected, inMemory, database);
          comparisons.push(comparison);
          expect(comparison.comparison).toBe("match");
        }
        const comparisonFile = process.env.BANTABATO_STAFF_COMPARISON_RESULT_FILE;
        if (comparisonFile) {
          await mkdir(comparisonFile.substring(0, comparisonFile.lastIndexOf("/")) || ".", { recursive: true });
          await writeFile(comparisonFile, JSON.stringify({ suite: "bantabato-staff-comparison", status: "PASS", scenarios: comparisons, environment: "isolated-test-datastore" }, null, 2) + "\\n");
        }
        const verification = byId.get("VER")!;
        const support = byId.get("SUP")!;
        const finance = byId.get("FIN")!;
        const editorial = byId.get("EDT")!;
        expect(roleCan(verification.staffRole, "verification.review")).toBe(true);
        expect(roleCan(support.staffRole, "safety.actions.create")).toBe(false);
        expect(roleCan(finance.staffRole, "messages.view" as never)).toBe(false);
        await expect(requireOperationalPermission(support.userId, "safety.actions.create")).rejects.toThrow(/permissions do not permit/i);
        await expect(requireOperationalPermission(finance.userId, "support.manage")).rejects.toThrow(/permissions do not permit/i);
        await expect(requireOperationalPermission(editorial.userId, "safety.actions.approve")).rejects.toThrow(/permissions do not permit/i);
        await expect(requireOperationalPermission(verification.userId, "support.manage")).rejects.toThrow(/permissions do not permit/i);
      });
    } finally {
      await closeIsolatedTestDatabase(handle);
    }
  });

  it.skipIf(!configuredForIsolatedDatabase)("persists a synthetic support workload and keeps it separate from safety permissions", async () => {
    const handle = await openIsolatedTestDatabase();
    try {
      await withIsolatedRollback(handle, async () => {
        const members = await seedFictionalMembers(handle, "bantabato-sprint51-staff");
        const staff = await seedFictionalStaff(handle);
        const support = staff.find(identity => identity.id === "SUP")!;
        const finance = staff.find(identity => identity.id === "FIN")!;
        const created = await createSupportTicket(support.userId, { memberProfileId: members[0]!.profileId, category: "technical_issue", subject: "Synthetic support case", description: "Test-only support description", priority: "normal" });
        const queue = await listSupportTickets(support.userId, { assignment: "unassigned" });
        expect(queue.some(ticket => ticket.id === created.ticketId && ticket.memberProfileId === members[0]!.profileId)).toBe(true);
        await expect(requireOperationalPermission(finance.userId, "support.manage")).rejects.toThrow(/permissions do not permit/i);
        await expect(requireOperationalPermission(support.userId, "safety.cases.update")).rejects.toThrow(/permissions do not permit/i);
      });
    } finally {
      await closeIsolatedTestDatabase(handle);
    }
  });

  it.skipIf(!configuredForIsolatedDatabase)("rejects revoked persisted sessions and preserves the active-session boundary", async () => {
    const handle = await openIsolatedTestDatabase();
    try {
      await withSeededFictionalStaff(handle, async staff => {
        const operations = staff.find(identity => identity.id === "OPS")!;
        await expect(getEffectiveStaffAccess(operations.userId, operations.sessionReferenceHash)).resolves.toMatchObject({ staffRole: "operations_manager", status: "active" });
        await handle.db.update(staffSessionControls).set({ status: "revoked", revokedAt: new Date("2026-08-24T13:00:00.000Z") }).where(and(eq(staffSessionControls.staffProfileId, operations.staffProfileId), eq(staffSessionControls.sessionReferenceHash, operations.sessionReferenceHash)));
        expect(staffSessionIsUsable("revoked", new Date("2030-08-24T12:00:00.000Z"))).toBe(false);
        await expect(getEffectiveStaffAccess(operations.userId, operations.sessionReferenceHash)).rejects.toThrow(/session is no longer active/i);
      });
    } finally {
      await closeIsolatedTestDatabase(handle);
    }
  });

  it.skipIf(!configuredForIsolatedDatabase)("enforces persisted four-eyes approval and rejects the requester’s own decision", async () => {
    const handle = await openIsolatedTestDatabase();
    try {
      await withSeededFictionalStaff(handle, async staff => {
        const requester = staff.find(identity => identity.id === "SAF")!;
        const approver = staff.find(identity => identity.id === "SAF2")!;
        const expiresAt = new Date("2030-08-24T12:00:00.000Z");
        const inserted = await handle.db.insert(operationalApprovals).values({ approvalType: "safety_action", resourceType: "synthetic_safety_case", resourceId: "sprint51-case-001", requestedByUserId: requester.userId, requiredApproverRole: "trust_safety_officer", status: "pending", reason: "Synthetic test-only safety decision", impactSummary: "Synthetic test-only approval", expiresAt });
        const approvalId = Number(inserted[0].insertId);
        const freshReauthentication = new Date();
        await handle.db.update(staffProfiles).set({ lastReauthenticatedAt: freshReauthentication }).where(eq(staffProfiles.id, requester.staffProfileId));
        await handle.db.update(staffProfiles).set({ lastReauthenticatedAt: freshReauthentication }).where(eq(staffProfiles.id, approver.staffProfileId));
        expect(canDecideApproval(requester.userId, requester.userId, requester.staffRole, "trust_safety_officer", "pending", expiresAt)).toBe(false);
        await expect(decideOperationalApproval(requester.userId, approvalId, "approved")).rejects.toThrow(/cannot be decided/i);
        await expect(decideOperationalApproval(approver.userId, approvalId, "approved")).resolves.toEqual({ success: true });
        await expect(decideOperationalApproval(approver.userId, approvalId, "approved")).rejects.toThrow(/already decided|no longer available/i);
      });
    } finally {
      await closeIsolatedTestDatabase(handle);
    }
  });
});
