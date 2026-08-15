import { describe, expect, it } from "vitest";
import { normalizeTextRecord, normalizeUserText } from "./inputSecurity";

describe("member text input hardening", () => {
  it("preserves valid Unicode and normalizes it consistently without interpreting HTML", () => {
    expect(normalizeUserText("Aïssatou — salaam <script>alert(1)</script>")).toBe("Aïssatou — salaam <script>alert(1)</script>");
    expect(normalizeUserText("e\u0301")).toBe("é");
  });

  it("rejects invisible control characters across profile text and text-array fields", () => {
    expect(() => normalizeUserText("hello\u0000world")).toThrow(/control characters/i);
    expect(() => normalizeTextRecord({ about: "safe", interests: ["family", "trust\u0007"] })).toThrow(/control characters/i);
  });
});
