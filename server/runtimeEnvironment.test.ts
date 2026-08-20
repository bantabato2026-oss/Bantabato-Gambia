import { describe, expect, it } from "vitest";
import { getRuntimeEnvironment } from "./runtimeEnvironment";

describe("runtime environment separation", () => {
  it("uses only server-injected APP_ENV values for the explicit staging and production boundaries", () => {
    expect(getRuntimeEnvironment({ APP_ENV: "staging", NODE_ENV: "production" })).toBe("staging");
    expect(getRuntimeEnvironment({ APP_ENV: "production", NODE_ENV: "development" })).toBe("production");
    expect(getRuntimeEnvironment({ APP_ENV: "development", NODE_ENV: "production" })).toBe("development");
  });

  it("falls back to NODE_ENV only when APP_ENV is absent or unsupported", () => {
    expect(getRuntimeEnvironment({ NODE_ENV: "production" })).toBe("production");
    expect(getRuntimeEnvironment({ APP_ENV: "preview", NODE_ENV: "development" })).toBe("development");
  });
});
