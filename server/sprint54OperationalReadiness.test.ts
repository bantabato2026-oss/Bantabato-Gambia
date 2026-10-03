import { describe, expect, it } from "vitest";
import {
  assertSafeTestIdentity,
  evaluateDeploymentContract,
} from "./deploymentContract";
import {
  containsPrivateOperationalData,
  normalizeOperationalEvent,
  operationalTelemetryReadiness,
} from "./operationalTelemetry";
import {
  backupRestoreReadiness,
  exportReadiness,
  getRetentionPolicy,
  retentionReadiness,
} from "./domain/operationalReadinessPolicy";

describe("Sprint 54 operational readiness contracts", () => {
  it("blocks production without explicit deployment identities", () => {
    const result = evaluateDeploymentContract({ NODE_ENV: "production" });
    expect(result.status).toBe("blocked");
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        "production requires explicit APP_ENV=production",
      ])
    );
  });

  it("accepts an explicitly marked isolated test identity and rejects production-looking test URLs", () => {
    const safe = {
      APP_ENV: "development",
      BANTABATO_TEST_MODE: "1",
      BANTABATO_TEST_DATABASE_NAME: "bantabato_test",
      BANTABATO_TEST_DATABASE_URL:
        "mysql://root:test@localhost:3306/bantabato_test",
    };
    expect(assertSafeTestIdentity(safe).testDatabaseIdentity).toBe(
      "bantabato_test"
    );
    expect(() =>
      assertSafeTestIdentity({
        ...safe,
        DATABASE_URL: "mysql://root:test@localhost:3306/production",
      })
    ).toThrow(/production-looking/);
  });

  it("normalizes operational events without accepting private payloads", () => {
    const event = normalizeOperationalEvent({
      category: "authorization_failure",
      severity: "warning",
      code: "staff denied",
      requestId: "req-123",
      details: { email: "private@example.test" },
    });
    expect(event).toEqual({
      category: "authorization_failure",
      severity: "warning",
      code: "staff_denied",
      occurredAt: expect.any(String),
      requestId: "req-123",
    });
    expect(containsPrivateOperationalData(event)).toBe(false);
    expect(
      containsPrivateOperationalData({ messageContents: "do not log" })
    ).toBe(true);
  });

  it("keeps monitoring provider status pending until explicitly configured", () => {
    expect(operationalTelemetryReadiness().status).toBe("PENDING");
    expect(
      operationalTelemetryReadiness({
        BANTABATO_MONITORING_PROVIDER_CONFIGURED: "1",
      }).status
    ).toBe("CONFIGURED");
  });

  it("does not invent legal retention periods", () => {
    const policy = getRetentionPolicy();
    expect(policy).toHaveLength(7);
    expect(
      policy.every(
        item =>
          item.policyRequiredDays === null && item.legalDecision === "pending"
      )
    ).toBe(true);
    expect(retentionReadiness().state).toBe("LEGAL DECISION REQUIRED");
  });

  it("keeps exports member-scoped and delivery unclaimed until configured", () => {
    const readiness = exportReadiness();
    expect(readiness.memberOnly).toBe(true);
    expect(readiness.staffArbitraryAccess).toBe(false);
    expect(readiness.freshAuthRequired).toBe(true);
    expect(readiness.publicArtifact).toBe(false);
    expect(readiness.deliveryState).toBe("EXTERNAL PROVIDER REQUIRED");
  });

  it("does not confuse persistence tests with backup or restore evidence", () => {
    expect(backupRestoreReadiness()).toMatchObject({
      database: "NOT CONFIGURED",
      storage: "NOT CONFIGURED",
      restoreTest: "PENDING",
      rollback: "PENDING",
    });
    expect(
      backupRestoreReadiness({
        BANTABATO_BACKUP_CONFIGURED: "1",
        BANTABATO_RESTORE_VERIFIED: "1",
      })
    ).toMatchObject({ database: "CONFIGURED", restoreTest: "VERIFIED" });
  });
});
