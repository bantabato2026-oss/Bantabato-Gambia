import { describe, expect, it } from "vitest";
import {
  assertBudgetAndProvisioningAuthorized,
  assertDeveloperAccessAllowed,
  assertFounderRoleAccepted,
  assertFourEyesApproval,
  assertOwnerAccepted,
  assertSyntheticStagingData,
  assertStagingIsolationReady,
} from "./operationalAccessPolicy";

const completeIsolation = () => ({
  deployment: true,
  environmentSecrets: true,
  database: true,
  migrations: true,
  storage: true,
  oauthAndSessions: true,
  communicationsDisabled: true,
  monitoring: true,
  backupRestore: true,
  rollbackAndProductionDenied: true,
});

describe("Sprint 67 operational access policy", () => {
  it("denies system access to a discussion-only, unappointed developer", () => {
    expect(() =>
      assertDeveloperAccessAllowed({
        status: "DISCUSSION_ONLY",
        writtenAgreement: false,
        accessApproval: false,
      })
    ).toThrow("developer is not appointed");
  });

  it("requires authenticated founder acceptance rather than inferring a role", () => {
    expect(() =>
      assertFounderRoleAccepted({
        role: "Founder",
        person: "Bubacarr Sillah",
        accepted: false,
      })
    ).toThrow("Owner acceptance pending");

    expect(() =>
      assertOwnerAccepted({
        role: "Technical/platform owner",
        person: "Bubacarr Sillah",
        accepted: true,
      })
    ).toThrow("Owner acceptance evidence required");
  });

  it("does not let budget ceilings authorize spending or provisioning", () => {
    expect(() =>
      assertBudgetAndProvisioningAuthorized({
        initialCeilingD: 500,
        monthlyCeilingD: 500,
        spendingAuthorized: false,
        provisioningAuthorized: false,
      })
    ).toThrow("Spending authorization is required");
  });

  it("blocks staging approval when any isolation evidence is missing", () => {
    expect(() =>
      assertStagingIsolationReady({
        ...completeIsolation(),
        oauthAndSessions: false,
      })
    ).toThrow("oauthAndSessions");
    expect(() =>
      assertStagingIsolationReady(completeIsolation())
    ).not.toThrow();
  });

  it("requires a genuinely separate accepted four-eyes reviewer", () => {
    expect(() =>
      assertFourEyesApproval({
        action: "Provision staging",
        requester: "Bubacarr Sillah",
        approver: "Bubacarr Sillah",
        approverIsAcceptedReviewer: true,
      })
    ).toThrow("distinct reviewer");

    expect(() =>
      assertFourEyesApproval({
        action: "Provision staging",
        requester: "Bubacarr Sillah",
        approver: "Unappointed reviewer",
        approverIsAcceptedReviewer: false,
      })
    ).toThrow("accepted reviewer");
  });

  it("rejects production data as a staging test source", () => {
    expect(() => assertSyntheticStagingData("PRODUCTION")).toThrow(
      "synthetic data only"
    );
    expect(() => assertSyntheticStagingData("SYNTHETIC")).not.toThrow();
  });
});
