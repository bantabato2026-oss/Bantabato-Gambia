import { describe, expect, it } from "vitest";
import { getServiceHealth } from "./health";

describe("service health response", () => {
  it("returns process liveness without leaking infrastructure or member data", () => {
    const response = getServiceHealth(new Date("2026-08-15T00:00:00.000Z"));
    expect(response).toEqual({
      status: "ok",
      service: "bantabato",
      timestamp: "2026-08-15T00:00:00.000Z",
    });
    expect(Object.keys(response).sort()).toEqual(["service", "status", "timestamp"]);
    expect(JSON.stringify(response)).not.toMatch(/token|secret|password|database|storage|member|user|email|queue|provider/i);
  });
});
