export type NotificationMode = "DISABLED" | "SYNTHETIC_SINK" | "REAL";
export type DataSource = "SYNTHETIC" | "PRODUCTION";
export type MigrationTarget = "STAGING" | "PRODUCTION";
export type RollbackTarget = "DISPOSABLE" | "PRODUCTION";

export type SyntheticStagingPlan = {
  deploymentTarget: string;
  productionDeploymentTarget: string;
  databaseTarget: string;
  productionDatabaseTarget: string;
  storageNamespace: string;
  productionStorageNamespace: string;
  oauthCallback: string;
  productionOauthCallback: string;
  secretNamespace: string;
  productionSecretNamespace: string;
  notificationMode: NotificationMode;
  dataSource: DataSource;
  migrationTarget: MigrationTarget;
  rollbackTarget: RollbackTarget;
  isolationEvidence: Partial<
    Record<
      | "deployment"
      | "database"
      | "storage"
      | "oauth"
      | "sessions"
      | "secrets"
      | "communications"
      | "monitoring"
      | "backupRestore"
      | "rollback",
      boolean
    >
  >;
};

const requiredEvidence = [
  "deployment",
  "database",
  "storage",
  "oauth",
  "sessions",
  "secrets",
  "communications",
  "monitoring",
  "backupRestore",
  "rollback",
] as const;

export function assertSyntheticStagingPlan(plan: SyntheticStagingPlan): void {
  const distinctPairs: Array<[string, string, string]> = [
    [plan.deploymentTarget, plan.productionDeploymentTarget, "deployment"],
    [plan.databaseTarget, plan.productionDatabaseTarget, "database"],
    [plan.storageNamespace, plan.productionStorageNamespace, "storage"],
    [plan.oauthCallback, plan.productionOauthCallback, "OAuth callback"],
    [plan.secretNamespace, plan.productionSecretNamespace, "secret namespace"],
  ];

  for (const [staging, production, label] of distinctPairs) {
    if (!staging.trim() || !production.trim() || staging === production) {
      throw new Error(`Synthetic staging ${label} is not isolated`);
    }
  }
  if (plan.notificationMode === "REAL") {
    throw new Error("Synthetic staging cannot use real notifications");
  }
  if (plan.dataSource !== "SYNTHETIC") {
    throw new Error("Synthetic staging cannot use production data");
  }
  if (plan.migrationTarget !== "STAGING") {
    throw new Error("Synthetic staging migration target must be staging");
  }
  if (plan.rollbackTarget !== "DISPOSABLE") {
    throw new Error("Synthetic staging rollback target must be disposable");
  }

  const missing = requiredEvidence.filter(
    control => plan.isolationEvidence[control] !== true
  );
  if (missing.length > 0) {
    throw new Error(
      `Synthetic staging isolation evidence missing: ${missing.join(", ")}`
    );
  }
}
