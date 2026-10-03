import {
  getRuntimeEnvironment,
  type RuntimeEnvironment,
} from "./runtimeEnvironment";

export type DeploymentIdentity = {
  environment: RuntimeEnvironment;
  databaseIdentity: string | null;
  storageIdentity: string | null;
  authTarget: string | null;
  applicationOrigin: string | null;
  allowedOrigins: string[];
  testDatabaseIdentity: string | null;
  ciDatabaseIdentity: string | null;
};

export type DeploymentContractResult = {
  status: "configured" | "blocked";
  identity: DeploymentIdentity;
  reasons: string[];
};

function optional(env: NodeJS.ProcessEnv, key: string) {
  const value = env[key]?.trim();
  return value || null;
}

function list(env: NodeJS.ProcessEnv, key: string) {
  return (env[key] ?? "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
}

function looksLikeTestIdentity(value: string | null) {
  return Boolean(value && /(^|[-_])(test|ci|staging)([-_]|$)/i.test(value));
}

export function getDeploymentIdentity(
  env: NodeJS.ProcessEnv = process.env
): DeploymentIdentity {
  return {
    environment: getRuntimeEnvironment(env),
    databaseIdentity:
      optional(env, "BANTABATO_DATABASE_IDENTITY") ??
      optional(env, "DATABASE_NAME"),
    storageIdentity: optional(env, "BANTABATO_STORAGE_IDENTITY"),
    authTarget:
      optional(env, "BANTABATO_AUTH_TARGET") ??
      optional(env, "OAUTH_SERVER_URL"),
    applicationOrigin:
      optional(env, "BANTABATO_APPLICATION_ORIGIN") ??
      optional(env, "VITE_APP_ORIGIN"),
    allowedOrigins: list(env, "BANTABATO_ALLOWED_ORIGINS"),
    testDatabaseIdentity:
      optional(env, "BANTABATO_TEST_DATABASE_NAME") ??
      optional(env, "BANTABATO_TEST_DATABASE_IDENTITY"),
    ciDatabaseIdentity: optional(env, "BANTABATO_CI_DATABASE_IDENTITY"),
  };
}

/**
 * Evaluates deployment separation without revealing credentials or connection URLs.
 * Missing infrastructure is intentionally BLOCKED rather than inferred or simulated.
 */
export function evaluateDeploymentContract(
  env: NodeJS.ProcessEnv = process.env
): DeploymentContractResult {
  const identity = getDeploymentIdentity(env);
  const reasons: string[] = [];
  const testMode = env.BANTABATO_TEST_MODE === "1";
  const ciMode = env.BANTABATO_PERSISTENCE_CI === "1";

  if (identity.environment === "production") {
    if (!env.APP_ENV?.trim())
      reasons.push("production requires explicit APP_ENV=production");
    for (const [label, value] of [
      ["database identity", identity.databaseIdentity],
      ["storage identity", identity.storageIdentity],
      ["auth target", identity.authTarget],
      ["application origin", identity.applicationOrigin],
    ] as const) {
      if (!value) reasons.push(`production ${label} is not configured`);
    }
    if (
      !identity.applicationOrigin ||
      !identity.allowedOrigins.includes(identity.applicationOrigin)
    ) {
      reasons.push(
        "application origin must be present in the allowed-origin contract"
      );
    }
  }

  if (testMode || ciMode) {
    if (!identity.testDatabaseIdentity && !identity.ciDatabaseIdentity)
      reasons.push("test/CI database identity is not configured");
    const identityToCheck =
      identity.ciDatabaseIdentity ?? identity.testDatabaseIdentity;
    if (identityToCheck && !looksLikeTestIdentity(identityToCheck))
      reasons.push(
        "test/CI database identity must be explicitly non-production"
      );
    if (env.DATABASE_URL && /production|prod\b/i.test(env.DATABASE_URL))
      reasons.push("test/CI mode refuses a production-looking DATABASE_URL");
  }

  return {
    status: reasons.length ? "blocked" : "configured",
    identity,
    reasons,
  };
}

export function assertSafeTestIdentity(env: NodeJS.ProcessEnv = process.env) {
  const result = evaluateDeploymentContract(env);
  if (result.identity.environment === "production")
    throw new Error("Test fixtures are forbidden in production mode.");
  if (result.status === "blocked")
    throw new Error(
      `Test datastore identity is not safe: ${result.reasons.join("; ")}`
    );
  return result.identity;
}
