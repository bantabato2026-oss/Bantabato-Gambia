import { describe, expect, it } from "vitest";
import { assertSafeTestDatabaseEnvironment } from "./testDatabaseAdapter";

describe("Sprint 46 isolated database-backed test adapter guard", () => {
  it("fails closed when the explicit test marker is absent", () => {
    expect(() => assertSafeTestDatabaseEnvironment({ NODE_ENV: "test", BANTABATO_TEST_DATABASE_URL: "mysql://user:pass@localhost/bantabato_test", BANTABATO_TEST_DATABASE_NAME: "bantabato_test" })).toThrow("BANTABATO_TEST_MODE=1");
  });

  it("fails closed for production or when the test URL is the application URL", () => {
    const base = { BANTABATO_TEST_MODE: "1", BANTABATO_TEST_DATABASE_URL: "mysql://user:pass@localhost/bantabato_test", BANTABATO_TEST_DATABASE_NAME: "bantabato_test" };
    expect(() => assertSafeTestDatabaseEnvironment({ ...base, NODE_ENV: "production" })).toThrow("disabled in production");
    expect(() => assertSafeTestDatabaseEnvironment({ ...base, NODE_ENV: "test", DATABASE_URL: base.BANTABATO_TEST_DATABASE_URL })).toThrow("application DATABASE_URL");
  });

  it("requires a test-marked database whose URL name matches the declared identity", () => {
    const base = { BANTABATO_TEST_MODE: "1", NODE_ENV: "test", BANTABATO_TEST_DATABASE_URL: "mysql://user:pass@localhost/bantabato_test", BANTABATO_TEST_DATABASE_NAME: "bantabato_test" };
    expect(assertSafeTestDatabaseEnvironment(base)).toMatchObject({ databaseName: "bantabato_test", marker: "1" });
    expect(() => assertSafeTestDatabaseEnvironment({ ...base, BANTABATO_TEST_DATABASE_NAME: "other_test" })).toThrow("cannot confirm test database identity");
    expect(() => assertSafeTestDatabaseEnvironment({ ...base, BANTABATO_TEST_DATABASE_URL: "mysql://user:pass@localhost/bantabato", BANTABATO_TEST_DATABASE_NAME: "bantabato" })).toThrow("explicitly marked test");
  });

  it("rejects malformed or missing test database identity before any connection can be opened", () => {
    expect(() => assertSafeTestDatabaseEnvironment({ BANTABATO_TEST_MODE: "1", NODE_ENV: "test", BANTABATO_TEST_DATABASE_URL: "not-a-url", BANTABATO_TEST_DATABASE_NAME: "bantabato_test" })).toThrow("valid test database URL");
    expect(() => assertSafeTestDatabaseEnvironment({ BANTABATO_TEST_MODE: "1", NODE_ENV: "test", BANTABATO_TEST_DATABASE_URL: "mysql://user:pass@localhost/bantabato_test" })).toThrow("cannot confirm test database identity");
  });
});
