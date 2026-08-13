import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReadinessPanel } from "./MemberDetailPages";

describe("eligible member readiness panel", () => {
  it("renders explicit mutual consent controls, a future-provider boundary, and call-safety guidance without relying on live member data", () => {
    const markup = renderToStaticMarkup(
      <ReadinessPanel
        loading={false}
        unavailable={false}
        pending={false}
        onGrant={vi.fn()}
        onWithdraw={vi.fn()}
        readiness={{
          stage: "ready_for_review",
          status: "ready_for_review",
          readyForReview: true,
          reviewRequired: true,
          explanation: "Your connection is ready for the next step, subject to shared choice.",
          criteria: [
            { label: "Both members are participating in the conversation", met: true },
            { label: "Current safety and account checks are clear", met: true },
            { label: "No current hard compatibility requirement is unmet", met: true },
          ],
          yourConsents: [{ capability: "voice", status: "granted" }],
          partnerConsentReceived: [{ capability: "voice", granted: false }],
          permissions: [
            { capability: "voice", status: "unavailable", providerConfigured: false },
            { capability: "video", status: "unavailable", providerConfigured: false },
          ],
          safetyGuidance: ["Never send money or financial information.", "End any communication if you feel uncomfortable."],
          futureProvider: { configured: false, message: "Voice and video calling technology is not connected yet. No call is started or simulated here." },
        }}
      />,
    );

    expect(markup).toContain("Connection readiness");
    expect(markup).toContain("Voice communication");
    expect(markup).toContain("Video communication");
    expect(markup).toContain("Withdraw consent");
    expect(markup).toContain("Enable Video communication");
    expect(markup).toContain("No call is started or simulated here.");
    expect(markup).toContain("Never send money or financial information.");
  });
});
