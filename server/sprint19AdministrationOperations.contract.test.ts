import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Sprint 19 Administration, Trust & Safety Operations Experience contracts", () => {
  it("keeps report review minimum-necessary and rejects stale or reassigned claim and decision attempts", () => {
    const operations = read("server/operations.ts");
    const reportsPage = read("client/src/pages/AdminOperations.tsx");

    expect(operations).toContain('"This report case is already assigned to another reviewer"');
    expect(operations).toContain('"This report case changed before it could be claimed. Refresh the queue and try again."');
    expect(operations).toContain('"This report case changed before the decision was recorded. Refresh the case and try again."');
    expect(operations).toContain('or(isNull(reports.assignedModeratorUserId), eq(reports.assignedModeratorUserId, input.actorUserId))');
    expect(operations).not.toContain('reporter: record.reporterProfileId');
    expect(reportsPage).toContain("Reporter identity is intentionally omitted from this queue.");
    expect(reportsPage).toContain("Reporter identity is intentionally withheld.");
    expect(reportsPage).not.toContain("Reported by {caseRecord.reporter");
  });

  it("uses factual permission-scoped notification delivery failure workload rather than member unread notifications", () => {
    const service = read("server/adminOperationsService.ts");
    const dashboard = read("client/src/pages/AdminPage.tsx");

    expect(service).toContain('count(notificationDeliveries, inArray(notificationDeliveries.status, ["failed", "retrying", "unavailable", "expired"]))');
    expect(service).not.toContain('count(notifications, isNull(notifications.readAt))');
    expect(dashboard).toContain('key: "notificationFailures"');
    expect(dashboard).not.toContain("popularity");
  });

  it("supports staff-authorized support queue filtering and active assignment with audit-safe stale-action protection", () => {
    const service = read("server/adminOperationsService.ts");
    const router = read("server/routers.ts");
    const page = read("client/src/pages/AdminSupport.tsx");

    expect(service).toContain('filters.assignment === "assigned" ? isNotNull(supportTickets.assignedStaffProfileId)');
    expect(service).toContain('filters.assignment === "unassigned" ? isNull(supportTickets.assignedStaffProfileId)');
    expect(service).toContain('eq(staffProfiles.status, "active")');
    expect(service).toContain('eq(supportTickets.updatedAt, input.expectedUpdatedAt)');
    expect(service).toContain('"This support ticket changed before your update. Refresh the queue and try again."');
    expect(service).toContain('assignmentChanged: input.assignedStaffProfileId !== undefined');
    expect(router).toContain("supportAssignees: staffOnlyProcedure");
    expect(router).toContain("expectedUpdatedAt: z.coerce.date()");
    expect(page).toContain("Assignment boundary");
    expect(page).toContain("No active staff owner");
    expect(page).toContain("out-of-date update is rejected");
  });

  it("filters notification operations by private metadata only and uses shared loading and recovery states", () => {
    const service = read("server/notificationService.ts");
    const router = read("server/routers.ts");
    const page = read("client/src/pages/AdminNotifications.tsx");

    expect(service).toContain("export async function listNotificationOperations(filters:");
    expect(service).toContain("filters.status ? eq(notificationDeliveries.status, filters.status)");
    expect(service).toContain("filters.channel ? eq(notificationDeliveries.channel, filters.channel)");
    expect(service).not.toContain("recipientUserId: notificationEvents.recipientUserId");
    expect(router).toContain('notificationOperations: protectedProcedure.input(z.object({ status: z.enum(["pending", "queued", "sending"');
    expect(page).toContain("Delivery state");
    expect(page).toContain("Notification operations are unavailable right now.");
    expect(page).toContain("StateSkeleton");
    expect(page).toContain("This is expected while external providers remain intentionally unconfigured");
  });

  it("provides authorized audit search across action, module, target, actor, outcome, and time without returning metadata payloads", () => {
    const service = read("server/adminOperationsService.ts");
    const router = read("server/routers.ts");
    const page = read("client/src/pages/AdminOperationsManagement.tsx");

    expect(service).toContain('input?.entityId ? eq(auditLogs.entityId, input.entityId)');
    expect(service).toContain('input?.actorId ? eq(auditLogs.actorUserId, input.actorId)');
    expect(service).toContain('input?.outcome ? like(auditLogs.action, `%.${input.outcome}`)');
    expect(service).toContain('input?.from ? sql`${auditLogs.createdAt} >= ${input.from}`');
    expect(service).toContain('input?.to ? sql`${auditLogs.createdAt} <= ${input.to}`');
    expect(service).not.toContain('metadata: auditLogs.metadata');
    expect(router).toContain("Audit start time must be before the end time.");
    expect(page).toContain("Module / resource type");
    expect(page).toContain("Outcome suffix");
    expect(page).toContain("Audit payloads, private documents, messages, and secrets are never shown here.");
  });

  it("keeps consent-first editorial publication behind an unexpired independent approval and makes that state visible without exposing approval details", () => {
    const db = read("server/db.ts");
    const page = read("client/src/pages/AdminContentReview.tsx");

    expect(db).toContain("publicationApprovalStatus");
    expect(db).toContain('gt(operationalApprovals.expiresAt, new Date())');
    expect(db).toContain('"Independent publication approval is required before this story can be published"');
    expect(page).toContain("Publication approval:");
    expect(page).toContain("Independent approval is pending. Publication remains unavailable.");
    expect(page).toContain("Request new independent approval");
    expect(page).not.toContain("approval.reason");
  });

  it("provides a permission-filtered mobile staff navigator while preserving server-authoritative role isolation and premium neutrality", () => {
    const shell = read("client/src/components/AdminShell.tsx");
    const styles = read("client/src/index.css");
    const policy = read("server/domain/adminOperationsPolicy.ts");
    const authorization = read("server/admin.authorization.test.ts");

    expect(shell).toContain("admin-mobile-nav");
    expect(shell).toContain('aria-label="Staff workspace navigation"');
    expect(shell).toContain('aria-current={active ? "page" : undefined}');
    expect(styles).toContain(".admin-mobile-nav{display:block");
    expect(styles).toContain(".admin-mobile-nav-item:focus-visible");
    expect(policy).toContain('"finance.transactions.view"');
    expect(policy).toContain('"safety.cases.view"');
    expect(authorization).toContain("operationsMemberSummary({ profileId: 1 })");
    expect(policy).not.toContain("premium.override");
  });
});
