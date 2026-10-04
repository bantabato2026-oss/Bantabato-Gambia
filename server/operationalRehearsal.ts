export const REHEARSAL_STATES = [
  "SIMULATED",
  "TESTED IN DISPOSABLE ENVIRONMENT",
  "CONFIGURED",
  "VERIFIED",
  "PENDING",
  "BLOCKED",
  "OWNER REQUIRED",
  "LEGAL DECISION REQUIRED",
  "EXTERNAL REVIEW REQUIRED",
] as const;

export type RehearsalState = (typeof REHEARSAL_STATES)[number];

export const REHEARSAL_AREAS = [
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
] as const;

export type RehearsalArea = (typeof REHEARSAL_AREAS)[number];

export type OperationalRehearsal = {
  area: RehearsalArea;
  state: RehearsalState;
  evidence: string;
  dependency: string;
  ownerStatus: "OWNER ASSIGNED" | "OWNER REQUIRED" | "EXTERNAL OWNER REQUIRED";
  nextAction: string;
  syntheticOnly: true;
};

export function createRehearsal(
  input: Omit<OperationalRehearsal, "syntheticOnly">
): OperationalRehearsal {
  if (input.state === "VERIFIED" && !/evidence/i.test(input.evidence)) {
    throw new Error("A verified rehearsal requires explicit evidence.");
  }
  if (
    input.state === "SIMULATED" &&
    /production|real member|live provider/i.test(input.evidence)
  ) {
    throw new Error(
      "Simulated rehearsals cannot claim production, real-member, or live-provider evidence."
    );
  }
  return { ...input, syntheticOnly: true };
}

export function rehearsalStateIsVerified(state: RehearsalState) {
  return state === "VERIFIED" || state === "TESTED IN DISPOSABLE ENVIRONMENT";
}

export function assertNoProductionRehearsal(
  rehearsals: Array<
    Omit<OperationalRehearsal, "syntheticOnly"> & { syntheticOnly: boolean }
  >
) {
  if (rehearsals.some(item => !item.syntheticOnly))
    throw new Error("Operational rehearsals must remain synthetic-only.");
  return rehearsals;
}
