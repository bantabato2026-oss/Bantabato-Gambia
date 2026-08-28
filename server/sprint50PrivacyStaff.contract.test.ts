import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

describe("Sprint 50 privacy and staff-boundary contracts", () => {
  it("keeps member projections minimum-necessary and excludes private operational fields", async () => {
    const db = await read("./db.ts");
    const projection = db.slice(db.indexOf("export async function getProfileForMember"), db.indexOf("export async function createInterest"));
    expect(projection).toContain("displayName: profile[0].displayName");
    expect(projection).toContain("locationDisplay");
    expect(projection).not.toContain("exactLocation");
    expect(projection).not.toContain("privateDeclaration");
    expect(projection).not.toContain("staffNotes");
    expect(projection).not.toContain("credentials");
  });

  it("keeps support and safety permissions separated at the real staff authority boundary", async () => {
    const admin = await read("./adminOperationsService.ts");
    expect(admin).toContain('requireOperationalPermission(actorUserId, "support.manage")');
    expect(admin).toContain('requireOperationalPermission(actorUserId, "incidents.manage")');
    expect(admin).toContain('requireOperationalPermission(actorUserId, "approvals.view")');
    expect(admin).toContain("Your staff permissions do not permit this action.");
  });

  it("keeps verification documents behind an explicitly authorized review authority", async () => {
    const operations = await read("./operations.ts");
    expect(operations).toContain("getVerificationDocumentForAuthorizedReview");
    expect(operations).toContain("getVerificationDocumentForReview");
    expect(operations).toContain("verification.document_accessed");
  });

  it("keeps billing dormant and prevents paid state from becoming a member-access shortcut", async () => {
    const billing = await read("./billingService.ts");
    const mode = await read("./commercialMode.ts");
    expect(mode).toContain("FREE_LAUNCH");
    expect(billing).toContain("isFreeLaunch() ? []");
    expect(billing).toContain("payment_not_configured");
    expect(mode).toContain("No checkout, payment, transaction, or entitlement is required or created.");
  });

  it("keeps staff access role-scoped and revoked sessions unusable", async () => {
    const admin = await read("./adminOperationsService.ts");
    expect(admin).toContain("getEffectiveStaffAccess");
    expect(admin).toContain("staffRole");
    expect(admin).toContain("staffSessionIsUsable");
    expect(admin).toContain('status, "active"');
    expect(admin).toContain('status: "revoked"');
    expect(admin).toContain("staffSessionControls");
  });

  it("retains independent approval and fresh-state requirements for sensitive operational actions", async () => {
    const admin = await read("./adminOperationsService.ts");
    expect(admin).toContain("requiresIndependentApproval");
    expect(admin).toContain("requireFresh");
    expect(admin).toContain("expectedUpdatedAt");
    expect(admin).toContain("changed before your update");
  });
});

export {};

// Keep the test executable from the server directory while reading sibling authorities.
void read;
