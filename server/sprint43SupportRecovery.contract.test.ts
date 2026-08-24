import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Sprint 43 — member support recovery & operations", () => {
  it("keeps support member-owned and duplicate-safe without requiring a profile or exposing staff fields", () => {
    const schema = read("drizzle/schema.ts");
    const service = read("server/adminOperationsService.ts");
    const router = read("server/routers.ts");
    const page = read("client/src/pages/MemberSupportPage.tsx");
    expect(schema).toContain("requesterUserId: int(\"requesterUserId\").references(() => users.id");
    expect(schema).toContain("idempotencyKey: varchar(\"idempotencyKey\"");
    expect(service).toContain("createMemberSupportTicket");
    expect(service).toContain("member:${userId}:${input.idempotencyKey.trim()}");
    expect(service).toContain("if (existing?.requesterUserId === userId)");
    expect(router).toContain("support: router({");
    expect(router).toContain("mine: betaMemberProcedure");
    expect(page).toContain("Only support requests created from this account are shown.");
    const projection = service.slice(service.indexOf("function memberSupportProjection"), service.indexOf("export async function listMemberSupportTickets"));
    expect(projection).not.toMatch(/assignedStaff|recentAudit|verification|safety|payment|family/i);
  });

  it("protects member status changes with ownership and observed-version recovery", () => {
    const service = read("server/adminOperationsService.ts");
    const page = read("client/src/pages/MemberSupportPage.tsx");
    expect(service).toContain("eq(supportTickets.requesterUserId, userId)");
    expect(service).toContain("eq(supportTickets.updatedAt, expectedUpdatedAt)");
    expect(service).toContain("Only a resolved or withdrawn request can be reopened.");
    expect(service).toContain("closed and cannot be changed here");
    expect(page).toContain("expectedUpdatedAt: ticket.updatedAt");
    expect(page).toContain("The request changed before it could be withdrawn");
    expect(page).toContain("The request changed before it could be reopened");
  });

  it("keeps staff actions permission-scoped, assignment-safe, and separate from Trust & Safety", () => {
    const service = read("server/adminOperationsService.ts");
    const staffPage = read("client/src/pages/AdminSupport.tsx");
    expect(service).toContain('requireOperationalPermission(actorUserId, "support.manage")');
    expect(service).toContain("Choose an active staff identity for assignment.");
    expect(service).toContain("This support ticket changed before your update");
    expect(service).toContain("Staff cannot withdraw a member request");
    expect(staffPage).toContain("Support records are kept separate from Trust & Safety");
    expect(staffPage).toContain("Escalation must use the authorized Trust & Safety case flow");
  });

  it("uses factual, preference-aware support status notifications and no sensitive payload", () => {
    const policy = read("server/domain/notificationPolicy.ts");
    const service = read("server/adminOperationsService.ts");
    expect(policy).toContain("support_request_update");
    expect(policy).toContain("support_request_action_required");
    expect(policy).toContain("support_request_resolved");
    expect(service).toContain("emitTrustedNotification");
    expect(service).toContain('category: "product_updates"');
    expect(service).toContain("notificationType: \"product\"");
    expect(service).not.toContain("staffNotes");
  });

  it("keeps support reachable, offline-safe, and Premium-neutral from protected member navigation", () => {
    const shell = read("client/src/components/MemberShell.tsx");
    const page = read("client/src/pages/MemberSupportPage.tsx");
    expect(shell).toContain('{ label: "Support", href: "/app/support"');
    expect(page).toContain("Support requests are not queued while offline.");
    expect(page).toContain("disabled={submitDisabled}");
    expect(page).toContain("cannot bypass verification, eligibility, safety, privacy, consent, or account security");
    expect(shell).toContain("Account & privacy");
    expect(page).not.toMatch(/Premium.*priority|priority.*Premium|premium.*bypass/i);
  });
});
