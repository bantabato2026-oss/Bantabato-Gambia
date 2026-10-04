import { describe, expect, it } from "vitest";
import {
  REHEARSAL_AREAS,
  assertNoProductionRehearsal,
  createRehearsal,
  rehearsalStateIsVerified,
} from "./operationalRehearsal";

describe("Sprint 56 controlled operational rehearsal framework", () => {
  it("defines the required synthetic-only rehearsal areas", () => {
    expect(REHEARSAL_AREAS).toEqual([
      "staging_deployment",
      "database_backup",
      "storage_backup",
      "database_restore",
      "storage_restore",
      "rollback",
      "monitoring",
      "alert_escalation",
      "incident_response",
      "account_recovery",
      "data_deletion",
      "data_export",
      "session_revocation",
      "safety_escalation",
    ]);
  });

  it("keeps simulated, disposable-tested, and verified states distinct", () => {
    const simulated = createRehearsal({
      area: "database_restore",
      state: "SIMULATED",
      evidence: "Procedure documented; no restore performed.",
      dependency: "Disposable restore target",
      ownerStatus: "OWNER REQUIRED",
      nextAction: "Run against isolated synthetic datastore.",
    });
    const tested = createRehearsal({
      area: "database_backup",
      state: "TESTED IN DISPOSABLE ENVIRONMENT",
      evidence: "Evidence: disposable backup artifact checksum recorded.",
      dependency: "Disposable backup service",
      ownerStatus: "OWNER REQUIRED",
      nextAction: "Assign recovery owner.",
    });
    expect(simulated.syntheticOnly).toBe(true);
    expect(rehearsalStateIsVerified(simulated.state)).toBe(false);
    expect(rehearsalStateIsVerified(tested.state)).toBe(true);
  });

  it("rejects simulated claims that contain production or live-member evidence", () => {
    expect(() =>
      createRehearsal({
        area: "rollback",
        state: "SIMULATED",
        evidence: "Production rollback completed successfully.",
        dependency: "Deployment target",
        ownerStatus: "OWNER REQUIRED",
        nextAction: "Obtain disposable target.",
      })
    ).toThrow(/production/);
  });

  it("rejects non-synthetic rehearsal records", () => {
    expect(() =>
      assertNoProductionRehearsal([
        {
          area: "monitoring",
          state: "VERIFIED",
          evidence: "Evidence: live provider alert fired.",
          dependency: "Provider",
          ownerStatus: "OWNER ASSIGNED",
          nextAction: "None",
          syntheticOnly: false,
        },
      ])
    ).toThrow(/synthetic-only/);
  });
});
