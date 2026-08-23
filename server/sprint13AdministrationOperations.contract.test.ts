import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Sprint 13 Administration, Operations, and Trust & Safety Command Center contracts", () => {
  it("surfaces only factual, permission-scoped operational workloads with no popularity, performance, or fabricated success metrics", () => {
    const service = read("server/adminOperationsService.ts");
    const page = read("client/src/pages/AdminPage.tsx");
    expect(service).toContain('can("photos.review") ? await count(profilePhotos');
    expect(service).toContain('can("safety.cases.view") ? await count(safetyAppeals');
    expect(service).toContain('can("success_stories.review") ? await count(memberSuccessDeclarations');
    expect(service).toContain('can("finance.transactions.view") ? await count(paymentRefunds');
    expect(service).toContain('can("beta.view") ? await count(betaInvitations');
    expect(page).toContain('key: "photoReviews"');
    expect(page).toContain('key: "appeals"');
    expect(page).toContain('key: "family"');
    expect(page).toContain('key: "editorial"');
    expect(page).toContain('key: "refunds"');
    expect(page).not.toContain("success rate");
    expect(page).not.toContain("staff performance");
  });

  it("creates a minimum-necessary member operational projection with permission-specific restricted sections and an append-only audit reference", () => {
    const service = read("server/adminOperationsService.ts");
    const router = read("server/routers.ts");
    const page = read("client/src/pages/AdminOperationsManagement.tsx");
    expect(service).toContain('requireOperationalPermission(actorUserId, "members.view")');
    expect(service).toContain("export async function getOperationalMemberSummary");
    expect(service).toContain("memberVisible:");
    expect(service).toContain("operational:");
    expect(service).toContain("restricted:");
    expect(service).toContain("staffOnly:");
    expect(service).toContain('"operations.member_summary_viewed"');
    expect(service).not.toContain("documentStorageKey");
    expect(service).not.toContain("getMessagesForProfile");
    expect(router).toContain("operationsMemberSummary: staffOnlyProcedure");
    expect(page).toContain("Member-visible data");
    expect(page).toContain("Restricted: verification");
    expect(page).toContain("Staff-only audit context");
    expect(page).toContain("Identity documents, private communications, Family Circle content, payment credentials, and safety evidence are never shown here.");
  });

  it("keeps direct-object access, case actions, independent approval, and stale decision handling server-authoritative", () => {
    const router = read("server/routers.ts");
    const operations = read("server/adminOperationsService.ts");
    const policy = read("server/domain/adminOperationsPolicy.ts");
    const authorization = read("server/admin.authorization.test.ts");
    expect(router).toContain("operationsMemberSummary: staffOnlyProcedure");
    expect(authorization).toContain("operationsMemberSummary({ profileId: 1 })");
    expect(policy).toContain("requesterUserId !== approverUserId");
    expect(operations).toContain('eq(operationalApprovals.status, "pending")');
    expect(operations).toContain("This approval was already decided or is no longer available.");
    expect(operations).toContain("requiresIndependentApproval");
  });

  it("retains scoped specialist operations for identity documents, photos, safety, Family Circle, editorial consent, finance, membership, beta, and notification boundaries", () => {
    const verification = read("client/src/pages/AdminOperations.tsx");
    const content = read("client/src/pages/AdminContentReview.tsx");
    const billing = read("client/src/pages/AdminBilling.tsx");
    const family = read("client/src/pages/AdminFamilyCircle.tsx");
    expect(verification).toContain("Open private document");
    expect(content).toContain("temporary review link");
    expect(content).toContain("independent publication approval");
    expect(billing).toContain("It does not move money");
    expect(billing).toContain("No live provider here.");
    expect(family).toContain("Private messages, voice notes, verification documents, readiness criteria, and internal compatibility calculations are not available in this workspace.");
  });

  it("keeps membership and premium unable to bypass safety, verification, privacy, Family Circle, eligibility, or staff authority", () => {
    const paymentPolicy = read("server/domain/paymentPolicy.ts");
    const billing = read("client/src/pages/AdminBilling.tsx");
    const dashboard = read("client/src/pages/AdminPage.tsx");
    expect(paymentPolicy).toContain('"matching_rank"');
    expect(paymentPolicy).toContain('"verification"');
    expect(billing).toContain("cannot change matching, compatibility, verification, safety, blocks, privacy, Family Circle, consent, or voice/video readiness");
    expect(dashboard).toContain("Authorization is evaluated on the server for every action.");
  });
});
