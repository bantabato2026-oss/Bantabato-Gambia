import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const matrix = JSON.parse(
  readFileSync(resolve(root, "docs/launch-readiness.json"), "utf8")
) as Record<string, any>;

describe("Sprint 66 founder decision evidence contract", () => {
  it("preserves the authoritative launch gate and decision counts", () => {
    expect(matrix.sprint).toBe(66);
    expect(matrix.launchStatus).toBe("NOT READY");
    expect(matrix.gates).toHaveLength(36);
    expect(matrix.hardBlockers).toHaveLength(29);
    expect(matrix.sprint66DecisionRegister.decisionCount).toBe(10);
    expect(matrix.sprint66DecisionRegister.approved).toBe(0);
    expect(matrix.sprint66DecisionRegister.authenticatedApprovals).toBe(0);
  });

  it("keeps financial and staging authorization fail-closed", () => {
    expect(matrix.sprint66FinancialPlan.verifiedFinancialCommitment).toBe("$0");
    expect(matrix.sprint66FinancialPlan.spendAuthorized).toBe(false);
    expect(matrix.sprint66FinancialPlan.firstYearCommitment).toBe(
      "NOT CALCULABLE"
    );
    expect(matrix.sprint66Stage001.status).toBe("AWAITING FOUNDER APPROVAL");
    expect(matrix.sprint66Stage001.approvalAuthenticated).toBe(false);
    expect(matrix.sprint66Stage001.provisioningAuthorized).toBe(false);
    expect(matrix.sprint66Stage001.budgetAloneAuthorizesProvisioning).toBe(
      false
    );
  });

  it("keeps owner acceptance and Milestone 1 execution blocked", () => {
    expect(matrix.sprint66OwnerAcceptance.formalAcceptances).toBe(0);
    expect(matrix.sprint66OwnerAcceptance.technicalPlatformOwner).toBe(
      "OWNER REQUIRED"
    );
    expect(matrix.sprint66OwnerAcceptance.databaseRecoveryOwner).toBe(
      "OWNER REQUIRED"
    );
    expect(matrix.sprint66Milestone1.status).toBe("PLANNED; EXECUTION BLOCKED");
    expect(matrix.sprint66Milestone1.authorized).toBe(false);
    expect(matrix.sprint66Milestone1.realMemberData).toBe("PROHIBITED");
    expect(matrix.sprint66Milestone1.productionMutation).toBe("PROHIBITED");
  });
});
