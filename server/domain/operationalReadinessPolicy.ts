export const READINESS_STATES = [
  "COMPLETE",
  "CONFIGURED",
  "VERIFIED",
  "PENDING",
  "BLOCKED",
  "LEGAL DECISION REQUIRED",
  "OPERATIONAL OWNER REQUIRED",
  "EXTERNAL PROVIDER REQUIRED",
] as const;

export type ReadinessState = (typeof READINESS_STATES)[number];

export type RetentionPolicy = {
  dataClass:
    | "member_profile"
    | "identity_document"
    | "messages"
    | "notifications"
    | "support"
    | "audit_events"
    | "exports";
  operationalDays: number | null;
  policyRequiredDays: number | null;
  legalDecision: "pending" | "configured";
  deletionBehavior:
    | "delete_when_eligible"
    | "retain_minimum_audit_record"
    | "withdraw_access_and_expire_artifact";
};

const DATA_CLASSES: RetentionPolicy["dataClass"][] = [
  "member_profile",
  "identity_document",
  "messages",
  "notifications",
  "support",
  "audit_events",
  "exports",
];

function configuredDays(
  env: NodeJS.ProcessEnv,
  dataClass: RetentionPolicy["dataClass"]
) {
  const key = `BANTABATO_RETENTION_${dataClass.toUpperCase()}_DAYS`;
  const value = Number(env[key]);
  return Number.isInteger(value) && value > 0 && value <= 36500 ? value : null;
}

export function getRetentionPolicy(
  env: NodeJS.ProcessEnv = process.env
): RetentionPolicy[] {
  return DATA_CLASSES.map(dataClass => ({
    dataClass,
    operationalDays: configuredDays(env, dataClass),
    policyRequiredDays: null,
    legalDecision: "pending",
    deletionBehavior:
      dataClass === "audit_events"
        ? "retain_minimum_audit_record"
        : dataClass === "exports"
          ? "withdraw_access_and_expire_artifact"
          : "delete_when_eligible",
  }));
}

export function retentionReadiness(env: NodeJS.ProcessEnv = process.env) {
  const policy = getRetentionPolicy(env);
  const hasLegalDecision = env.BANTABATO_LEGAL_RETENTION_APPROVED === "1";
  return {
    state: hasLegalDecision
      ? ("CONFIGURED" as const)
      : ("LEGAL DECISION REQUIRED" as const),
    policy,
    note: hasLegalDecision
      ? "Retention configuration is supplied by an operational owner and legal decision."
      : "No legal retention period is claimed; policy-required periods remain pending.",
  };
}

export type ExportReadiness = {
  scope: string[];
  memberOnly: true;
  staffArbitraryAccess: false;
  freshAuthRequired: true;
  staleSafe: true;
  publicArtifact: false;
  deliveryState: ReadinessState;
  note: string;
};

export function exportReadiness(
  env: NodeJS.ProcessEnv = process.env
): ExportReadiness {
  const deliveryConfigured = env.BANTABATO_EXPORT_DELIVERY_CONFIGURED === "1";
  return {
    scope: [
      "member profile",
      "member preferences",
      "member-owned account and security controls",
      "authorized connections",
      "member-owned safety activity",
    ],
    memberOnly: true,
    staffArbitraryAccess: false,
    freshAuthRequired: true,
    staleSafe: true,
    publicArtifact: false,
    deliveryState: deliveryConfigured
      ? "CONFIGURED"
      : "EXTERNAL PROVIDER REQUIRED",
    note: deliveryConfigured
      ? "Delivery configuration exists but still requires verification before launch."
      : "No secure delivery infrastructure is claimed; export requests remain truthful and non-public.",
  };
}

export function backupRestoreReadiness(env: NodeJS.ProcessEnv = process.env) {
  const configured = env.BANTABATO_BACKUP_CONFIGURED === "1";
  const verified = env.BANTABATO_RESTORE_VERIFIED === "1";
  return {
    database: configured
      ? ("CONFIGURED" as const)
      : ("NOT CONFIGURED" as const),
    storage: configured ? ("CONFIGURED" as const) : ("NOT CONFIGURED" as const),
    restoreTest: verified ? ("VERIFIED" as const) : ("PENDING" as const),
    retention: configured
      ? ("OPERATIONAL OWNER REQUIRED" as const)
      : ("PENDING" as const),
    rollback: "PENDING" as const,
    lastVerifiedBackup: null as string | null,
    restoreTestDate: verified ? (null as string | null) : null,
    backupOwnerStatus: configured
      ? ("OPERATIONAL OWNER REQUIRED" as const)
      : ("OWNER REQUIRED" as const),
    recoveryOwnerStatus: configured
      ? ("OPERATIONAL OWNER REQUIRED" as const)
      : ("OWNER REQUIRED" as const),
    note: "No backup or restore infrastructure is inferred from application persistence tests.",
  };
}
