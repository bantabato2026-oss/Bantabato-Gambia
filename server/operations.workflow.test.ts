import { describe, expect, it, vi } from "vitest";
import { claimReportCase, claimVerificationCase, decideReportCase, decideVerificationCase } from "./operations";

function createWorkflowHarness(selectRows: unknown[][], affectedRows = 1) {
  const updates: Record<string, unknown>[] = [];
  const audit = vi.fn(async () => undefined);
  const notify = vi.fn(async () => undefined);
  const db = {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => selectRows.shift() ?? [] }) }) }),
    update: () => ({ set: (values: Record<string, unknown>) => ({ where: async () => { updates.push(values); return { affectedRows }; } }) }),
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
    expect(decisionHarness.notify).toHaveBeenCalledWith(88, "verification", "Identity verification approved", "Your identity verification has been approved.", "/app/verification", "verification:401:approved", "verification_completed");
    expect(decisionHarness.audit).toHaveBeenCalledWith(31, "verification.approved", "verification_record", "401", expect.objectContaining({ previousStatus: "under_review", newStatus: "approved" }));
  });

  it("rejects an invalid verification transition before any write occurs", async () => {
    const harness = createWorkflowHarness([[{ status: "approved", profileId: 72 }]]);
    await expect(decideVerificationCase({ actorUserId: 31, verificationId: 401, decision: "rejected" }, harness.dependencies)).rejects.toThrow("not awaiting an operational decision");
    expect(harness.updates).toHaveLength(0);
    expect(harness.audit).not.toHaveBeenCalled();
  });

  it("keeps a claimed case with its assigned reviewer and strips sensitive operational language from member-facing copy", async () => {
    const otherReviewer = createWorkflowHarness([[{ status: "under_review", assignedReviewerUserId: 88 }]]);
    await expect(claimVerificationCase(31, 401, otherReviewer.dependencies)).rejects.toThrow("already assigned to another reviewer");
    expect(otherReviewer.updates).toHaveLength(0);

    const safeCopy = createWorkflowHarness([[{ status: "under_review", profileId: 72, assignedReviewerUserId: 31 }], [{ userId: 88 }]]);
    await decideVerificationCase({ actorUserId: 31, verificationId: 401, decision: "escalated", memberMessage: "An internal investigation is in progress." }, safeCopy.dependencies);
    expect(safeCopy.updates[0]).toMatchObject({ memberMessage: "Your verification requires additional review. We will notify you when there is an update." });
    expect(safeCopy.notify).toHaveBeenCalledWith(88, "verification", "Verification review update", "Your verification requires additional review. We will notify you when there is an update.", "/app/verification", "verification:401:escalated", "verification_additional_review");
  });

  it("uses a factual resubmission notification without exposing reviewer context", async () => {
    const harness = createWorkflowHarness([[{ status: "under_review", profileId: 72, assignedReviewerUserId: 31 }], [{ userId: 88 }]]);
    await decideVerificationCase({ actorUserId: 31, verificationId: 401, decision: "requires_resubmission", reason: "document_unclear", memberMessage: "An internal fraud investigation is open." }, harness.dependencies);
    expect(harness.updates[0]).toMatchObject({ status: "requires_resubmission", memberMessage: "Action is required before verification can continue: please submit a clearer image of your valid document." });
    expect(harness.notify).toHaveBeenCalledWith(88, "verification", "Verification action required", "Action is required before verification can continue: please submit a clearer image of your valid document.", "/app/verification", "verification:401:requires_resubmission", "verification_changes_required");
  });

  it("rejects an observed-version verification decision when a concurrent reviewer wins the conditional write", async () => {
    const stale = createWorkflowHarness([[{ status: "escalated", profileId: 72, assignedReviewerUserId: 31, updatedAt: new Date("2026-01-01T00:00:00.000Z") }]], 0);
    await expect(decideVerificationCase({ actorUserId: 31, verificationId: 401, decision: "escalated", expectedUpdatedAt: new Date("2026-01-01T00:00:00.000Z") }, stale.dependencies)).rejects.toThrow("changed before the decision was recorded");
    expect(stale.audit).not.toHaveBeenCalled();
    expect(stale.notify).not.toHaveBeenCalled();
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

  it("rejects report claim and decision attempts when another reviewer owns the case or the case is already closed", async () => {
    const claimedByAnother = createWorkflowHarness([[{ status: "in_review", assignedModeratorUserId: 88 }]]);
    await expect(claimReportCase(41, 501, claimedByAnother.dependencies)).rejects.toThrow("already assigned to another reviewer");
    expect(claimedByAnother.updates).toHaveLength(0);

    const decisionByAnother = createWorkflowHarness([[{ status: "action_required", reportedProfileId: 72, assignedModeratorUserId: 88 }]]);
    await expect(decideReportCase({ actorUserId: 41, reportId: 501, status: "resolved" }, decisionByAnother.dependencies)).rejects.toThrow("assigned to another reviewer");
    expect(decisionByAnother.updates).toHaveLength(0);

    const terminal = createWorkflowHarness([[{ status: "resolved", reportedProfileId: 72, assignedModeratorUserId: 41 }]]);
    await expect(decideReportCase({ actorUserId: 41, reportId: 501, status: "resolved" }, terminal.dependencies)).rejects.toThrow("not awaiting an operational decision");
    expect(terminal.updates).toHaveLength(0);
  });

  it("rejects a report decision when a concurrent update wins the conditional write", async () => {
    const stale = createWorkflowHarness([[{ status: "in_review", reportedProfileId: null, assignedModeratorUserId: 41 }]], 0);
    await expect(decideReportCase({ actorUserId: 41, reportId: 501, status: "resolved" }, stale.dependencies)).rejects.toThrow("changed before the decision was recorded");
    expect(stale.audit).not.toHaveBeenCalled();
  });
});
