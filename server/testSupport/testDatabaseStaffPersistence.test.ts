import { mkdir, writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import {
  familyLinks,
  memberSuccessDeclarations,
  operationalApprovals,
  paymentRefunds,
  profilePhotos,
  reports,
  safetyAppeals,
  staffProfiles,
  staffSessionControls,
  supportTickets,
  verificationRecords,
} from "../../drizzle/schema";
import {
  createSupportTicket,
  decideOperationalApproval,
  getEffectiveStaffAccess,
  listSupportTickets,
  requireOperationalPermission,
  updateSupportTicket,
} from "../adminOperationsService";
import {
  claimVerificationCase,
  getReportQueue,
  getVerificationQueue,
} from "../operations";
import {
  listProfilePhotoReviewQueue,
  listSuccessStoryEditorialQueue,
} from "../db";
import {
  canDecideApproval,
  DEFAULT_ROLE_PERMISSIONS,
  roleCan,
  staffSessionIsUsable,
} from "../domain/adminOperationsPolicy";
import {
  closeIsolatedTestDatabase,
  openIsolatedTestDatabase,
  seedFictionalMembers,
  seedFictionalStaff,
  seedFictionalStaffWorkloads,
  withIsolatedRollback,
  withSeededFictionalStaff,
} from "./testDatabaseAdapter";
import {
  compareStaffStates,
  expectedStaffState,
  normalizeInMemoryStaffState,
} from "./staffStateNormalizer";

const configuredForIsolatedDatabase = Boolean(
  process.env.BANTABATO_TEST_MODE &&
    process.env.BANTABATO_TEST_DATABASE_URL &&
    process.env.BANTABATO_TEST_DATABASE_NAME
);

describe("Sprint 51 persisted fictional staff authority", () => {
  it.skipIf(!configuredForIsolatedDatabase)(
    "resolves each persisted staff role and denies cross-role permissions",
    async () => {
      const handle = await openIsolatedTestDatabase();
      try {
        await withSeededFictionalStaff(handle, async staff => {
          const byId = new Map(staff.map(identity => [identity.id, identity]));
          const comparisons = [];
          for (const identity of staff) {
            const access = await getEffectiveStaffAccess(
              identity.userId,
              identity.sessionReferenceHash
            );
            expect(access.staffRole).toBe(identity.staffRole);
            expect(access.status).toBe("active");
            expect(access.permissions).toEqual(
              expect.arrayContaining([
                ...DEFAULT_ROLE_PERMISSIONS[identity.staffRole],
              ])
            );
            const expected = expectedStaffState(
              identity,
              DEFAULT_ROLE_PERMISSIONS[identity.staffRole]
            );
            const inMemory = normalizeInMemoryStaffState(
              identity,
              DEFAULT_ROLE_PERMISSIONS[identity.staffRole],
              true
            );
            const database = normalizeInMemoryStaffState(
              identity,
              access.permissions,
              true
            );
            const comparison = compareStaffStates(
              identity,
              expected,
              inMemory,
              database
            );
            comparisons.push(comparison);
            expect(comparison.comparison).toBe("match");
          }
          const comparisonFile =
            process.env.BANTABATO_STAFF_COMPARISON_RESULT_FILE;
          if (comparisonFile) {
            await mkdir(
              comparisonFile.substring(0, comparisonFile.lastIndexOf("/")) ||
                ".",
              { recursive: true }
            );
            await writeFile(
              comparisonFile,
              JSON.stringify(
                {
                  suite: "bantabato-staff-comparison",
                  status: "PASS",
                  scenarios: comparisons,
                  environment: "isolated-test-datastore",
                },
                null,
                2
              ) + "\\n"
            );
          }
          const verification = byId.get("VER")!;
          const support = byId.get("SUP")!;
          const finance = byId.get("FIN")!;
          const editorial = byId.get("EDT")!;
          expect(roleCan(verification.staffRole, "verification.review")).toBe(
            true
          );
          expect(roleCan(support.staffRole, "safety.actions.create")).toBe(
            false
          );
          expect(roleCan(finance.staffRole, "messages.view" as never)).toBe(
            false
          );
          await expect(
            requireOperationalPermission(
              support.userId,
              "safety.actions.create"
            )
          ).rejects.toThrow(/permissions do not permit/i);
          await expect(
            requireOperationalPermission(finance.userId, "support.manage")
          ).rejects.toThrow(/permissions do not permit/i);
          await expect(
            requireOperationalPermission(
              editorial.userId,
              "safety.actions.approve"
            )
          ).rejects.toThrow(/permissions do not permit/i);
          await expect(
            requireOperationalPermission(verification.userId, "support.manage")
          ).rejects.toThrow(/permissions do not permit/i);
        });
      } finally {
        await closeIsolatedTestDatabase(handle);
      }
    }
  );

  it.skipIf(!configuredForIsolatedDatabase)(
    "persists a synthetic support workload and keeps it separate from safety permissions",
    async () => {
      const handle = await openIsolatedTestDatabase();
      try {
        await withIsolatedRollback(handle, async () => {
          const members = await seedFictionalMembers(
            handle,
            "bantabato-sprint51-staff"
          );
          const staff = await seedFictionalStaff(handle);
          const support = staff.find(identity => identity.id === "SUP")!;
          const finance = staff.find(identity => identity.id === "FIN")!;
          const created = await createSupportTicket(support.userId, {
            memberProfileId: members[0]!.profileId,
            category: "technical_issue",
            subject: "Synthetic support case",
            description: "Test-only support description",
            priority: "normal",
          });
          const queue = await listSupportTickets(support.userId, {
            assignment: "unassigned",
          });
          expect(
            queue.some(
              ticket =>
                ticket.id === created.ticketId &&
                ticket.memberProfileId === members[0]!.profileId
            )
          ).toBe(true);
          await expect(
            requireOperationalPermission(finance.userId, "support.manage")
          ).rejects.toThrow(/permissions do not permit/i);
          await expect(
            requireOperationalPermission(support.userId, "safety.cases.update")
          ).rejects.toThrow(/permissions do not permit/i);
        });
      } finally {
        await closeIsolatedTestDatabase(handle);
      }
    }
  );

  it.skipIf(!configuredForIsolatedDatabase)(
    "persists supported staff workloads with assignments, minimum-necessary queues, and role boundaries",
    async () => {
      const handle = await openIsolatedTestDatabase();
      try {
        await withIsolatedRollback(handle, async () => {
          const members = await seedFictionalMembers(
            handle,
            "bantabato-sprint51-workloads"
          );
          const staff = await seedFictionalStaff(handle);
          const workloads = await seedFictionalStaffWorkloads(
            handle,
            members,
            staff
          );
          const byId = new Map(staff.map(identity => [identity.id, identity]));
          const verification = byId.get("VER")!;
          const safety = byId.get("SAF")!;
          const support = byId.get("SUP")!;
          const operations = byId.get("OPS")!;
          const finance = byId.get("FIN")!;
          const editorial = byId.get("EDT")!;
          await expect(
            requireOperationalPermission(operations.userId, "members.view")
          ).resolves.toMatchObject({ staffRole: "operations_manager" });
          await expect(
            requireOperationalPermission(
              verification.userId,
              "verification.review"
            )
          ).resolves.toMatchObject({ staffRole: "verification_officer" });
          await expect(
            requireOperationalPermission(safety.userId, "safety.cases.update")
          ).resolves.toMatchObject({ staffRole: "trust_safety_officer" });
          await expect(
            requireOperationalPermission(support.userId, "support.manage")
          ).resolves.toMatchObject({ staffRole: "customer_support_officer" });
          await expect(
            requireOperationalPermission(
              finance.userId,
              "finance.transactions.view"
            )
          ).resolves.toMatchObject({ staffRole: "finance_officer" });
          await expect(
            requireOperationalPermission(
              editorial.userId,
              "success_stories.review"
            )
          ).resolves.toMatchObject({ staffRole: "content_policy_manager" });
          await expect(
            requireOperationalPermission(support.userId, "verification.review")
          ).rejects.toThrow(/permissions do not permit/i);
          await expect(
            requireOperationalPermission(finance.userId, "support.manage")
          ).rejects.toThrow(/permissions do not permit/i);
          await expect(
            requireOperationalPermission(
              editorial.userId,
              "safety.actions.approve"
            )
          ).rejects.toThrow(/permissions do not permit/i);
          await expect(
            requireOperationalPermission(
              verification.userId,
              "finance.transactions.view"
            )
          ).rejects.toThrow(/permissions do not permit/i);

          const verificationQueue = await getVerificationQueue();
          const photoQueue = await listProfilePhotoReviewQueue();
          const reportQueue = await getReportQueue();
          const editorialQueue = await listSuccessStoryEditorialQueue();
          expect(
            verificationQueue.find(item => item.id === workloads.verificationId)
          ).toMatchObject({
            status: "submitted",
            assignedReviewerUserId: null,
          });
          expect(
            verificationQueue.find(item => item.id === workloads.verificationId)
          ).not.toHaveProperty("documentStorageKey");
          expect(
            photoQueue.find(item => item.photoId === workloads.photoId)
          ).toMatchObject({ reviewStatus: "pending" });
          expect(
            reportQueue.find(item => item.id === workloads.reportId)
          ).toMatchObject({
            status: "in_review",
            assignedModeratorUserId: safety.userId,
          });
          expect(
            editorialQueue.find(item => item.id === workloads.declarationId)
          ).toMatchObject({
            editorialStatus: "pending_review",
            publicationApprovalStatus: "not_requested",
          });
          expect(
            (
              await handle.db
                .select({ status: familyLinks.status })
                .from(familyLinks)
                .where(eq(familyLinks.id, workloads.familyLinkId))
                .limit(1)
            )[0]?.status
          ).toBe("pending_verification");
          expect(
            (
              await handle.db
                .select({ status: paymentRefunds.status })
                .from(paymentRefunds)
                .where(eq(paymentRefunds.id, workloads.refundId))
                .limit(1)
            )[0]?.status
          ).toBe("requested");
          expect(
            (
              await handle.db
                .select({ status: safetyAppeals.status })
                .from(safetyAppeals)
                .where(eq(safetyAppeals.id, workloads.appealId))
                .limit(1)
            )[0]?.status
          ).toBe("submitted");

          await claimVerificationCase(
            verification.userId,
            workloads.verificationId,
            {
              getDb: async () => handle.db,
              createAuditLog: async () => undefined,
              createNotification: async () => undefined,
              synchronizeProfileEligibility: async () => undefined,
            }
          );
          expect(
            (
              await handle.db
                .select({
                  status: verificationRecords.status,
                  assignedReviewerUserId:
                    verificationRecords.assignedReviewerUserId,
                })
                .from(verificationRecords)
                .where(eq(verificationRecords.id, workloads.verificationId))
                .limit(1)
            )[0]
          ).toMatchObject({
            status: "under_review",
            assignedReviewerUserId: verification.userId,
          });

          const supportBefore = (
            await handle.db
              .select({ updatedAt: supportTickets.updatedAt })
              .from(supportTickets)
              .where(eq(supportTickets.id, workloads.supportTicketId))
              .limit(1)
          )[0]!;
          await expect(
            updateSupportTicket(support.userId, workloads.supportTicketId, {
              status: "open",
              assignedStaffProfileId: operations.staffProfileId,
              expectedUpdatedAt: new Date(0),
            })
          ).rejects.toThrow(/changed before your update/i);
          await updateSupportTicket(support.userId, workloads.supportTicketId, {
            status: "open",
            assignedStaffProfileId: operations.staffProfileId,
            expectedUpdatedAt: supportBefore.updatedAt,
          });
          expect(
            (
              await handle.db
                .select({
                  assignedStaffProfileId: supportTickets.assignedStaffProfileId,
                  status: supportTickets.status,
                })
                .from(supportTickets)
                .where(eq(supportTickets.id, workloads.supportTicketId))
                .limit(1)
            )[0]
          ).toMatchObject({
            assignedStaffProfileId: operations.staffProfileId,
            status: "open",
          });
          expect(
            (
              await handle.db
                .select({
                  editorialStatus: memberSuccessDeclarations.editorialStatus,
                })
                .from(memberSuccessDeclarations)
                .where(
                  eq(memberSuccessDeclarations.id, workloads.declarationId)
                )
                .limit(1)
            )[0]?.editorialStatus
          ).toBe("pending_review");
          expect(
            (
              await handle.db
                .select({ status: reports.status })
                .from(reports)
                .where(eq(reports.id, workloads.reportId))
                .limit(1)
            )[0]?.status
          ).toBe("in_review");
          expect(
            (
              await handle.db
                .select({ reviewStatus: profilePhotos.reviewStatus })
                .from(profilePhotos)
                .where(eq(profilePhotos.id, workloads.photoId))
                .limit(1)
            )[0]?.reviewStatus
          ).toBe("pending");
        });
      } finally {
        await closeIsolatedTestDatabase(handle);
      }
    }
  );

  it.skipIf(!configuredForIsolatedDatabase)(
    "rejects revoked persisted sessions and preserves the active-session boundary",
    async () => {
      const handle = await openIsolatedTestDatabase();
      try {
        await withSeededFictionalStaff(handle, async staff => {
          const operations = staff.find(identity => identity.id === "OPS")!;
          await expect(
            getEffectiveStaffAccess(
              operations.userId,
              operations.sessionReferenceHash
            )
          ).resolves.toMatchObject({
            staffRole: "operations_manager",
            status: "active",
          });
          await handle.db
            .update(staffSessionControls)
            .set({
              status: "revoked",
              revokedAt: new Date("2026-08-24T13:00:00.000Z"),
            })
            .where(
              and(
                eq(
                  staffSessionControls.staffProfileId,
                  operations.staffProfileId
                ),
                eq(
                  staffSessionControls.sessionReferenceHash,
                  operations.sessionReferenceHash
                )
              )
            );
          expect(
            staffSessionIsUsable(
              "revoked",
              new Date("2030-08-24T12:00:00.000Z")
            )
          ).toBe(false);
          await expect(
            getEffectiveStaffAccess(
              operations.userId,
              operations.sessionReferenceHash
            )
          ).rejects.toThrow(/session is no longer active/i);
        });
      } finally {
        await closeIsolatedTestDatabase(handle);
      }
    }
  );

  it.skipIf(!configuredForIsolatedDatabase)(
    "enforces persisted four-eyes approval and rejects the requester’s own decision",
    async () => {
      const handle = await openIsolatedTestDatabase();
      try {
        await withSeededFictionalStaff(handle, async staff => {
          const requester = staff.find(identity => identity.id === "SAF")!;
          const approver = staff.find(identity => identity.id === "SAF2")!;
          const expiresAt = new Date("2030-08-24T12:00:00.000Z");
          const inserted = await handle.db.insert(operationalApprovals).values({
            approvalType: "safety_action",
            resourceType: "synthetic_safety_case",
            resourceId: "sprint51-case-001",
            requestedByUserId: requester.userId,
            requiredApproverRole: "trust_safety_officer",
            status: "pending",
            reason: "Synthetic test-only safety decision",
            impactSummary: "Synthetic test-only approval",
            expiresAt,
          });
          const approvalId = Number(inserted[0].insertId);
          const freshReauthentication = new Date();
          await handle.db
            .update(staffProfiles)
            .set({ lastReauthenticatedAt: freshReauthentication })
            .where(eq(staffProfiles.id, requester.staffProfileId));
          await handle.db
            .update(staffProfiles)
            .set({ lastReauthenticatedAt: freshReauthentication })
            .where(eq(staffProfiles.id, approver.staffProfileId));
          expect(
            canDecideApproval(
              requester.userId,
              requester.userId,
              requester.staffRole,
              "trust_safety_officer",
              "pending",
              expiresAt
            )
          ).toBe(false);
          await expect(
            decideOperationalApproval(requester.userId, approvalId, "approved")
          ).rejects.toThrow(/cannot be decided/i);
          await expect(
            decideOperationalApproval(approver.userId, approvalId, "approved")
          ).resolves.toEqual({ success: true });
          await expect(
            decideOperationalApproval(approver.userId, approvalId, "approved")
          ).rejects.toThrow(/already decided|no longer available/i);
        });
      } finally {
        await closeIsolatedTestDatabase(handle);
      }
    }
  );
});
