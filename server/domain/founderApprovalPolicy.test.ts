import { describe, expect, it } from "vitest";
import {
  validateFounderApproval,
  validateFounderApprovals,
  type FounderApprovalRecord,
} from "./founderApprovalPolicy";

const approval = (
  overrides: Partial<FounderApprovalRecord> = {}
): FounderApprovalRecord => ({
  decisionId: "STAGE-001",
  title: "Authorize isolated staging",
  description: "Approve a separate non-production deployment target",
  whyApprovalRequired: "Staging requires founder-controlled resources",
  recommendedOption: "Use a separate managed deployment target",
  requiredResources: "Host, domain, database, storage, and secret manager",
  securityImplications: "Separate credentials and deny production access",
  relatedLaunchGates: ["INF-001", "INF-002"],
  status: "AWAITING FOUNDER APPROVAL",
  executionStatus: "Not executed",
  approvalVersion: 1,
  currentVersion: 1,
  ...overrides,
});

describe("founder approval policy", () => {
  it("keeps an unapproved decision free of approver evidence", () => {
    expect(() =>
      validateFounderApproval(
        approval({ status: "APPROVED", approvingPerson: "Founder" })
      )
    ).toThrow("requires an approver and role");
  });

  it("requires approval and execution evidence before verified", () => {
    expect(() =>
      validateFounderApproval(
        approval({
          status: "VERIFIED",
          approvingPerson: "Approved reviewer",
          approvingRole: "Founder-approved technical owner",
          approvalTimestamp: "2026-11-02T00:00:00Z",
        })
      )
    ).toThrow("requires execution evidence");
  });

  it("rejects duplicate decisions and stale approval versions", () => {
    expect(() => validateFounderApprovals([approval(), approval()])).toThrow(
      "Duplicate founder decision ID"
    );
    expect(() =>
      validateFounderApproval(
        approval({ approvalVersion: 1, currentVersion: 2 })
      )
    ).toThrow("is stale");
  });

  it("accepts only a fully evidenced verified decision", () => {
    expect(() =>
      validateFounderApproval(
        approval({
          status: "VERIFIED",
          approvingPerson: "Named technical owner",
          approvingRole: "Technical/platform owner",
          approvalTimestamp: "2026-11-02T00:00:00Z",
          executionStatus: "Executed in isolated staging",
          verificationEvidence: "Redacted environment and isolation evidence",
        })
      )
    ).not.toThrow();
  });
});
