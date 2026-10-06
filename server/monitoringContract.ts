import type {
  OperationalEventCategory,
  OperationalSeverity,
} from "./operationalTelemetry";

export type MonitoringOwnershipState = "OWNER CONFIGURED" | "OWNER REQUIRED";
export type AlertConfigurationState =
  | "ALERT CONFIGURED"
  | "ALERT CONFIGURATION REQUIRED";
export type EscalationState = "ESCALATION CONFIGURED" | "ESCALATION REQUIRED";

export type MonitoringContractEntry = {
  category: OperationalEventCategory;
  signal: string;
  severity: OperationalSeverity;
  expectedResponse: string;
  ownerStatus: MonitoringOwnershipState;
  alertStatus: AlertConfigurationState;
  escalationStatus: EscalationState;
};

const CATALOG: Array<
  Omit<
    MonitoringContractEntry,
    "ownerStatus" | "alertStatus" | "escalationStatus"
  >
> = [
  {
    category: "application_health",
    signal: "Health endpoint unavailable or repeated failed probes",
    severity: "critical",
    expectedResponse:
      "Confirm service state, inspect recent deployment, and restore availability using the rollback runbook",
  },
  {
    category: "database_connectivity",
    signal: "Database connection or transaction failures",
    severity: "critical",
    expectedResponse:
      "Stop unsafe mutations, verify database identity and connectivity, then follow recovery procedure",
  },
  {
    category: "authentication_failure",
    signal: "Elevated authentication failures or callback errors",
    severity: "warning",
    expectedResponse:
      "Check auth target, rate limits, and session errors without exposing credentials",
  },
  {
    category: "authorization_failure",
    signal: "Unexpected increase in denied protected operations",
    severity: "warning",
    expectedResponse:
      "Review role policy and suspected abuse; do not broaden access to quiet alerts",
  },
  {
    category: "unexpected_server_error",
    signal: "Elevated 5xx or uncaught application errors",
    severity: "error",
    expectedResponse:
      "Correlate by request ID and operation only, then mitigate or roll back safely",
  },
  {
    category: "queue_failure",
    signal: "Background job failure or backlog where a queue is configured",
    severity: "error",
    expectedResponse:
      "Pause retries if they could duplicate work and recover from the job runbook",
  },
  {
    category: "storage_failure",
    signal: "Managed storage upload/read failure",
    severity: "error",
    expectedResponse:
      "Verify storage identity and availability; do not expose object keys or substitute public access",
  },
  {
    category: "safety_workflow_failure",
    signal: "Trust & Safety case or enforcement workflow cannot complete",
    severity: "critical",
    expectedResponse:
      "Preserve fail-closed safety state and escalate to the authorized safety owner",
  },
  {
    category: "backup_failure",
    signal:
      "Expected backup artifact or provider backup job fails or is absent",
    severity: "critical",
    expectedResponse:
      "Record the failure without inventing a backup timestamp and escalate to the recovery owner",
  },
  {
    category: "restore_failure",
    signal:
      "Synthetic restore rehearsal fails or cannot reach its disposable target",
    severity: "critical",
    expectedResponse:
      "Keep recovery readiness blocked, preserve diagnostics without secrets, and escalate to the recovery owner",
  },
];

export function getMonitoringContract(
  env: NodeJS.ProcessEnv = process.env
): MonitoringContractEntry[] {
  const ownerConfigured = env.BANTABATO_MONITORING_OWNER_CONFIGURED === "1";
  const alertsConfigured = env.BANTABATO_ALERTS_CONFIGURED === "1";
  const escalationConfigured = env.BANTABATO_ESCALATION_CONFIGURED === "1";
  return CATALOG.map(entry => ({
    ...entry,
    ownerStatus: ownerConfigured ? "OWNER CONFIGURED" : "OWNER REQUIRED",
    alertStatus: alertsConfigured
      ? "ALERT CONFIGURED"
      : "ALERT CONFIGURATION REQUIRED",
    escalationStatus: escalationConfigured
      ? "ESCALATION CONFIGURED"
      : "ESCALATION REQUIRED",
  }));
}

export function monitoringReadiness(env: NodeJS.ProcessEnv = process.env) {
  const entries = getMonitoringContract(env);
  const providerConfigured =
    env.BANTABATO_MONITORING_PROVIDER_CONFIGURED === "1";
  const configured =
    providerConfigured &&
    entries.every(
      entry =>
        entry.ownerStatus === "OWNER CONFIGURED" &&
        entry.alertStatus === "ALERT CONFIGURED" &&
        entry.escalationStatus === "ESCALATION CONFIGURED"
    );
  return {
    state: configured ? ("CONFIGURED" as const) : ("PENDING" as const),
    entries,
    providerStatus: providerConfigured
      ? "EXTERNAL PROVIDER CONFIGURED"
      : "EXTERNAL PROVIDER REQUIRED",
    note: "No provider credentials, telemetry destinations, or named owners are inferred or activated by this contract.",
  };
}
