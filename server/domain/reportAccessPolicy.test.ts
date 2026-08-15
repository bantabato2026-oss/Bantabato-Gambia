import { describe, expect, it } from "vitest";
import { resolveAuthorizedReportTarget } from "./reportAccessPolicy";

describe("report object-access policy", () => {
  it("derives the counterparty from an authorized conversation instead of trusting a client-supplied target", () => {
    expect(resolveAuthorizedReportTarget({ reporterProfileId: 12, requestedReportedProfileId: 28, conversation: { memberOneProfileId: 12, memberTwoProfileId: 28 } })).toBe(28);
  });

  it("rejects cross-conversation and target-substitution IDOR attempts", () => {
    expect(() => resolveAuthorizedReportTarget({ reporterProfileId: 77, conversation: { memberOneProfileId: 12, memberTwoProfileId: 28 } })).toThrow(/conversation is unavailable/i);
    expect(() => resolveAuthorizedReportTarget({ reporterProfileId: 12, requestedReportedProfileId: 99, conversation: { memberOneProfileId: 12, memberTwoProfileId: 28 } })).toThrow(/does not match/i);
  });

  it("rejects self-reports and targetless standalone reports", () => {
    expect(() => resolveAuthorizedReportTarget({ reporterProfileId: 12, requestedReportedProfileId: 12 })).toThrow(/another member/i);
    expect(() => resolveAuthorizedReportTarget({ reporterProfileId: 12 })).toThrow(/another member/i);
  });
});
