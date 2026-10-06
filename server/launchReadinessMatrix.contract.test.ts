import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  deriveLaunchReadinessStatus,
  validateLaunchGates,
  type LaunchGate,
} from "./domain/launchReadinessPolicy";

type MatrixGate = Omit<
  LaunchGate,
  "evidenceDateOrVersion" | "ownerStatus" | "nextAction"
> & {
  evidence_date_or_version?: string;
  owner_status: string;
  next_action: string;
};

type Matrix = {
  launchStatus: string;
  gates: MatrixGate[];
  hardBlockers: string[];
};
const matrix = JSON.parse(
  readFileSync(join(process.cwd(), "docs/launch-readiness.json"), "utf8")
) as Matrix;
const gates: LaunchGate[] = matrix.gates.map(gate => ({
  ...gate,
  evidenceDateOrVersion: gate.evidence_date_or_version,
  ownerStatus: gate.owner_status,
  nextAction: gate.next_action,
}));

describe("authoritative launch-readiness matrix", () => {
  it("contains unique, policy-valid gates with evidence metadata", () => {
    expect(gates.length).toBeGreaterThan(30);
    validateLaunchGates(gates);
    expect(new Set(gates.map(gate => gate.id)).size).toBe(gates.length);
  });

  it("keeps the canonical launch state fail-closed while hard blockers remain", () => {
    expect(matrix.launchStatus).toBe("NOT READY");
    expect(matrix.hardBlockers.length).toBeGreaterThan(0);
    expect(deriveLaunchReadinessStatus(gates)).toBe("NOT READY");
  });

  it("records every gate field required for founder review", () => {
    for (const gate of gates) {
      expect(gate.id).toBeTruthy();
      expect(gate.category).toBeTruthy();
      expect(gate.status).toBeTruthy();
      expect(gate.evidence).toBeTruthy();
      expect(gate.dependency).toBeTruthy();
      expect(gate.ownerStatus).toBeTruthy();
      expect(gate.nextAction).toBeTruthy();
      expect(typeof gate.blocking).toBe("boolean");
    }
  });
});
