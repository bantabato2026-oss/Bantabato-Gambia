import { describe, expect, it } from "vitest";
import { getServiceHealth } from "./health";

describe("service health response", () => {
  it("returns process liveness without leaking infrastructure or member data", () => {
    expect(getServiceHealth(new Date("2026-08-15T00:00:00.000Z"))).toEqual({
      status: "ok",
      service: "bantabato",
      timestamp: "2026-08-15T00:00:00.000Z",
    });
  });
});
