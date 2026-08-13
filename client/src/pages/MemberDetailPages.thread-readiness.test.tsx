import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({ invalidate: vi.fn(), mutate: vi.fn() }));

vi.mock("@/components/MemberShell", () => ({ MemberShell: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ messaging: { messages: { invalidate: mocks.invalidate }, conversations: { invalidate: mocks.invalidate } }, readiness: { status: { invalidate: mocks.invalidate } } }),
    messaging: {
      messages: { useQuery: () => ({ data: { conversation: { otherProfileId: 4 }, items: [] }, isLoading: false }) },
      conversations: { useQuery: () => ({ data: { items: [{ id: 10, otherProfile: { displayName: "A mutual match" } }] } }) },
      prompts: { useQuery: () => ({ data: { introduction: "A respectful beginning.", prompts: [] } }) },
      sendText: { useMutation: () => ({ mutate: mocks.mutate, isPending: false }) }, uploadVoice: { useMutation: () => ({ mutate: mocks.mutate, isPending: false }) }, preferences: { useMutation: () => ({ mutate: mocks.mutate, isPending: false }) }, setState: { useMutation: () => ({ mutate: mocks.mutate, isPending: false }) }, block: { useMutation: () => ({ mutate: mocks.mutate, isPending: false }) }, reportMessage: { useMutation: () => ({ mutate: mocks.mutate, isPending: false }) }, deleteVoice: { useMutation: () => ({ mutate: mocks.mutate, isPending: false }) }, voiceUrl: { useQuery: () => ({ data: undefined }) },
    },
    readiness: { status: { useQuery: () => ({ data: { stage: "ready_for_review", status: "ready_for_review", readyForReview: true, reviewRequired: true, explanation: "Your connection is ready for the next step, subject to shared choice.", criteria: [{ label: "Both members are participating in the conversation", met: true }, { label: "Current safety and account checks are clear", met: true }], yourConsents: [], partnerConsentReceived: [], permissions: [{ capability: "voice", status: "unavailable", providerConfigured: false }, { capability: "video", status: "unavailable", providerConfigured: false }], safetyGuidance: ["Never send money or financial information."], futureProvider: { configured: false, message: "Voice and video calling technology is not connected yet. No call is started or simulated here." } }, isLoading: false, isError: false }) }, grantConsent: { useMutation: () => ({ mutate: mocks.mutate, isPending: false }) }, withdrawConsent: { useMutation: () => ({ mutate: mocks.mutate, isPending: false }) } },
    safety: { report: { useMutation: () => ({ mutate: mocks.mutate, isPending: false }) } },
    profile: { mine: { useQuery: () => ({ data: { id: 3 } }) } },
  },
}));

import { MessageThreadPage } from "./MemberDetailPages";

describe("message-thread readiness integration", () => {
  it("mounts the eligible readiness panel in the real conversation route without live or seeded member data", () => {
    const markup = renderToStaticMarkup(<MessageThreadPage conversationId={10} />);

	    expect(markup).toContain("A respectful beginning.");
    expect(markup).toContain("Connection readiness");
    expect(markup).toContain("Enable Voice communication");
    expect(markup).toContain("Enable Video communication");
    expect(markup).toContain("No call is started or simulated here.");
  });
});
