import { describe, expect, it } from "vitest";
import { canPublishSuccessDeclaration, resolveSuccessDeclarationStatus } from "./successDeclarationPolicy";

describe("success declaration policy", () => {
  it("records optional sharing consent without making a declaration public", () => {
    expect(resolveSuccessDeclarationStatus(false)).toBe("private");
    expect(resolveSuccessDeclarationStatus(true)).toBe("consent_recorded");
    expect(canPublishSuccessDeclaration()).toBe(false);
  });
});
