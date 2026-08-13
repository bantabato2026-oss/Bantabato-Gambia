import { describe, expect, it, vi } from "vitest";
import { claimReportCase, claimVerificationCase, decideReportCase, decideVerificationCase } from "./operations";

function createWorkflowHarness(selectRows: unknown[][]) {
  const updates: Record<string, unknown>[] = [];
  const audit = vi.fn(async () => undefined);
  const notify = vi.fn(async () => undefined);
  const db = {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => selectRows.shift() ?? [] }) }) }),
    update: () => ({ set: (values: Record<string, unknown>) => ({ where: async () => { updates.push(values); } }) }),
  };
  return { updates, audit, notify, dependencies: { getDb: async () => db, createAuditLog: audit, createNotification: notify } };
}

describe("operational workflow transitions", () => {
  it("claims and approves a submitted verification case with a safe member outcome and audit event", async () => {
    const claimHarness = createWorkflowHarness([[{ status: "submitted", assignedReviewerUserId: null }]]);
    await claimVerificationCase(31, 401, claimHarness.dependencies);
    expect(claimHarness.updates).toContainEqual({ status: "under_review", assignedReviewerUserId: 31 });
    expect(claimHarness.audit).toHaveBeenCalledWith(31, "verification.claimed", "verification_record", "401", expect.objectContaining({ previousStatus: "submitted", newStatus: "under_review" }));

    const decisionHarness = createWorkflowHarness([[{ status: "under_review", profileId: 72 }], [{ userId: 88 }]]);
    await decideVerificationCase({ actorUserId: 31, verificationId: 401, decision: "approved" }, decisionHarness.dependencies);
    expect(decisionHarness.updates[0]).toMatchObject({ status: "approved", reviewedByUserId: 31, assignedReviewerUserId: 31 });
    expect(decisionHarness.notify).toHaveBeenCalledWith(88, "verification", "Identity verification approved", "Your identity verification has been approved.", "/app/verification", expect.any(String));
    expect(decisionHarness.audit).toHaveBeenCalledWith(31, "verification.approved", "verification_record", "401", expect.objectContaining({ previousStatus: "under_review", newStatus: "approved" }));
  });

  it("rejects an invalid verification transition before any write occurs", async () => {
    const harness = createWorkflowHarness([[{ status: "approved", profileId: 72 }]]);
    await expect(decideVerificationCase({ actorUserId: 31, verificationId: 401, decision: "rejected" }, harness.dependencies)).rejects.toThrow("not awaiting an operational decision");
    expect(harness.updates).toHaveLength(0);
    expect(harness.audit).not.toHaveBeenCalled();
  });

  it("claims and resolves a report case with an auditable controlled action", async () => {
    const claimHarness = createWorkflowHarness([[{ status: "open" }]]);
    await claimReportCase(41, 501, claimHarness.dependencies);
    expect(claimHarness.updates).toContainEqual({ status: "in_review", assignedModeratorUserId: 41, reviewedByUserId: 41 });
    expect(claimHarness.audit).toHaveBeenCalledWith(41, "report.claimed", "report", "501", expect.objectContaining({ previousStatus: "open", newStatus: "in_review" }));

    const decisionHarness = createWorkflowHarness([[{ status: "in_review", reportedProfileId: null }]]);
    await decideReportCase({ actorUserId: 41, reportId: 501, status: "resolved", memberAction: "warn" }, decisionHarness.dependencies);
    expect(decisionHarness.updates[0]).toMatchObject({ status: "resolved", memberAction: "warn", assignedModeratorUserId: 41, reviewedByUserId: 41 });
    expect(decisionHarness.audit).toHaveBeenCalledWith(41, "report.resolved", "report", "501", expect.objectContaining({ previousStatus: "in_review", newStatus: "resolved", memberAction: "warn" }));
  });
});
