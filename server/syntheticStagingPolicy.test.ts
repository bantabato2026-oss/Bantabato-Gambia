import { describe, expect, it } from "vitest";
import { createControlledWorkflowFixtures } from "./controlledWorkflowFixtures";
import { assertSyntheticStagingPlan } from "./domain/syntheticStagingPolicy";

const completePlan = () => ({
  deploymentTarget: "webdev-staging-s68",
  productionDeploymentTarget: "webdev-production",
  databaseTarget: "tidb-staging-s68",
  productionDatabaseTarget: "tidb-production",
  storageNamespace: "storage/staging/s68",
  productionStorageNamespace: "storage/production",
  oauthCallback: "https://staging.example.test/oauth/callback",
  productionOauthCallback: "https://app.example.test/oauth/callback",
  secretNamespace: "secrets/staging/s68",
  productionSecretNamespace: "secrets/production",
  notificationMode: "SYNTHETIC_SINK" as const,
  dataSource: "SYNTHETIC" as const,
  migrationTarget: "STAGING" as const,
  rollbackTarget: "DISPOSABLE" as const,
  isolationEvidence: {
    deployment: true,
    database: true,
    storage: true,
    oauth: true,
    sessions: true,
    secrets: true,
    communications: true,
    monitoring: true,
    backupRestore: true,
    rollback: true,
  },
});

describe("Sprint 68 synthetic staging preparation", () => {
  it("defines only fictional A–J accounts and protected synthetic scenarios", () => {
    const fixture = createControlledWorkflowFixtures();
    expect(fixture.syntheticDataset.accounts).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
    ]);
    expect(fixture.syntheticDataset.source).toBe("SYNTHETIC_ONLY");
    expect(fixture.syntheticDataset.publicSearchEligible).toBe(false);
    expect(fixture.syntheticDataset.publicStoryEligible).toBe(false);
    expect(fixture.syntheticDataset.realNotificationsEnabled).toBe(false);
    expect(fixture.syntheticDataset.scenarios).toHaveLength(11);
  });

  it("accepts a fully evidenced synthetic-only architecture plan", () => {
    expect(() => assertSyntheticStagingPlan(completePlan())).not.toThrow();
  });

  it("blocks production data, real notifications, production migrations, and production rollback", () => {
    expect(() =>
      assertSyntheticStagingPlan({
        ...completePlan(),
        dataSource: "PRODUCTION",
      })
    ).toThrow("production data");
    expect(() =>
      assertSyntheticStagingPlan({
        ...completePlan(),
        notificationMode: "REAL",
      })
    ).toThrow("real notifications");
    expect(() =>
      assertSyntheticStagingPlan({
        ...completePlan(),
        migrationTarget: "PRODUCTION",
      })
    ).toThrow("migration target");
    expect(() =>
      assertSyntheticStagingPlan({
        ...completePlan(),
        rollbackTarget: "PRODUCTION",
      })
    ).toThrow("rollback target");
  });

  it("blocks missing isolation evidence and shared resource identities", () => {
    expect(() =>
      assertSyntheticStagingPlan({
        ...completePlan(),
        databaseTarget: "tidb-production",
      })
    ).toThrow("database is not isolated");
    expect(() =>
      assertSyntheticStagingPlan({
        ...completePlan(),
        isolationEvidence: {
          ...completePlan().isolationEvidence,
          backupRestore: false,
        },
      })
    ).toThrow("backupRestore");
  });
});
