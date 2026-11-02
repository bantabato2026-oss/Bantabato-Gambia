import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function readJson(path: string) {
  return JSON.parse(readFileSync(resolve(root, path), "utf8")) as Record<
    string,
    any
  >;
}

describe("Sprint 65 staging evidence contract", () => {
  it("preserves the fail-closed launch and approval state", () => {
    const matrix = readJson("docs/launch-readiness.json");
    const staging = matrix.sprint65StagingDecision;

    expect(matrix.sprint).toBe(65);
    expect(matrix.launchStatus).toBe("NOT READY");
    expect(matrix.gates).toHaveLength(36);
    expect(matrix.hardBlockers).toHaveLength(29);
    expect(staging.decisionId).toBe("STAGE-001");
    expect(staging.approvalStatus).toBe("AWAITING FOUNDER APPROVAL");
    expect(staging.provisioned).toBe(false);
    expect(staging.newSpendAuthorized).toBe(false);
    expect(staging.budgetApprovalTriggersProvisioning).toBe(false);
    expect(staging.technicalOwner).toBe("OWNER REQUIRED");
    expect(staging.recoveryOwner).toBe("OWNER REQUIRED");
  });

  it("records public pricing without overstating account eligibility", () => {
    const matrix = readJson("docs/launch-readiness.json");
    const costs = matrix.sprint65CostAnalysis;
    const tidb = costs.tidbStarterPublicPricing;

    expect(costs.newSpendAuthorized).toBe(false);
    expect(tidb.startingPrice).toBe("$0/month to start");
    expect(tidb.accountEligibility).toBe("NOT VERIFIED");
    expect(costs.webdevStaging).toBe("PRICE NOT VERIFIED");
    expect(costs.storage).toBe("PRICE NOT VERIFIED");
    expect(costs.oauth).toBe("PRICE NOT VERIFIED");
    expect(costs.backupRestore).toBe("PRICE NOT VERIFIED");
  });

  it("does not put credential values in Sprint 65 evidence documents", () => {
    const paths = [
      "docs/sprint65-webdev-staging-feasibility.md",
      "docs/sprint65-database-isolation.md",
      "docs/sprint65-storage-oauth-isolation.md",
      "docs/sprint65-verified-cost-analysis.md",
      "docs/sprint65-founder-approval-request.md",
      "docs/sprint65-provider-sources.md",
    ];
    const forbidden =
      /(?:DATABASE_URL|JWT_SECRET|API_KEY|TOKEN|PASSWORD)\s*[:=]\s*[^`\n]+/i;

    for (const path of paths) {
      expect(readFileSync(resolve(root, path), "utf8")).not.toMatch(forbidden);
    }
  });
});
