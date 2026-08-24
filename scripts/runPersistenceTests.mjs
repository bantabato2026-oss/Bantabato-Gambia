import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { assertSafeTestDatabaseEnvironment } from "../server/testSupport/testDatabaseAdapter.ts";

const outputFile = process.env.BANTABATO_PERSISTENCE_RESULT_FILE ?? "artifacts/persistence-results.json";
const requested = process.env.BANTABATO_PERSISTENCE_CI === "1" || process.env.BANTABATO_PERSISTENCE_CI === "true";

function safeDatastoreIdentifier() {
  try { return assertSafeTestDatabaseEnvironment(process.env).databaseName; } catch { return "unavailable"; }
}

async function writeFailure(reason) {
  await mkdir(outputFile.substring(0, outputFile.lastIndexOf("/")) || ".", { recursive: true });
  await writeFile(outputFile, JSON.stringify({
    suite: "bantabato-persistence",
    status: "not_executed",
    testDatastoreIdentifier: safeDatastoreIdentifier(),
    scenarios: [],
    failureReason: reason,
  }, null, 2) + "\n");
}

if (!requested) {
  await writeFailure("Persistence suite requires BANTABATO_PERSISTENCE_CI=1; refusing implicit execution.");
  console.error("PERSISTENCE SUITE NOT EXECUTED — EXPLICIT CI REQUEST REQUIRED");
  process.exit(2);
}

try {
  assertSafeTestDatabaseEnvironment(process.env);
} catch (error) {
  const reason = error instanceof Error ? error.message : "Unsafe or unavailable test datastore configuration";
  await writeFailure(reason);
  console.error(`PERSISTENCE SUITE NOT EXECUTED — ${reason}`);
  process.exit(2);
}

await mkdir(outputFile.substring(0, outputFile.lastIndexOf("/")) || ".", { recursive: true });
const child = spawn("pnpm", ["exec", "vitest", "run", "server/testSupport/testDatabasePersistence.test.ts", "--reporter=json", `--outputFile=${outputFile}`], { stdio: "inherit", env: process.env });
child.on("exit", async code => {
  try {
    const raw = JSON.parse(await readFile(outputFile, "utf8"));
    const files = Array.isArray(raw.testResults) ? raw.testResults : [];
    const scenarios = files.flatMap(file => (Array.isArray(file.assertionResults) ? file.assertionResults : []).map(assertion => ({
      scenarioId: assertion.fullName ?? assertion.title ?? "persistence-scenario",
      category: "persistence",
      fixture: "A–J",
      expected: assertion.status === "passed" ? "authoritative persistence result" : "test assertion succeeds",
      actual: assertion.status,
      pass: assertion.status === "passed",
      duration: assertion.duration ?? null,
      failureReason: assertion.failureMessages?.[0] ?? null,
    })));
    await writeFile(outputFile, JSON.stringify({
      suite: "bantabato-persistence",
      status: code === 0 ? "passed" : "failed",
      testDatastoreIdentifier: safeDatastoreIdentifier(),
      duration: raw.success ? null : null,
      scenarios,
      failureReason: code === 0 ? null : "Persistence test process failed; inspect CI logs without exposing datastore credentials.",
    }, null, 2) + "\n");
  } catch (error) {
    await writeFailure(error instanceof Error ? error.message : "Persistence result normalization failed");
  }
  process.exit(code ?? 1);
});
