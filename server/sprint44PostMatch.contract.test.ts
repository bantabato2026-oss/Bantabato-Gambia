import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("Sprint 44 post-match journey contracts", () => {
  it("hides blocked pair state before checking an active match", () => {
    const db = source("server/db.ts");
    const stateStart = db.indexOf("export async function getInterestConnectionState");
    const state = db.slice(stateStart, db.indexOf("export async function getMatchesForProfile", stateStart));
    expect(state).toContain("const blocked =");
    expect(state).toContain('if (blocked) return { state: "blocked"');
    expect(state.indexOf("if (blocked)")).toBeLessThan(state.indexOf("const match ="));
  });

  it("routes interest and mutual-connection notifications to the active Connections surface", () => {
    const db = source("server/db.ts");
    const interestSection = db.slice(db.indexOf("export async function createInterest"), db.indexOf("export async function getInterestConnectionState"));
    expect(interestSection).toContain('"/app/connections"');
    expect(interestSection).not.toContain('"/app/matches"');
  });

  it("routes Family Circle participant notifications to the protected page", () => {
    const family = source("server/familyService.ts");
    expect(family).toContain('"/app/family"');
    expect(family).toContain('"/family"');
    expect(family).toContain("familyParticipantUserId");
  });

  it("prevents protected relationship states from falling through to send-introduction UI", () => {
    const detail = source("client/src/pages/MemberDetailPages.tsx");
    expect(detail).toContain('["blocked", "restricted", "suspended", "expired", "unavailable"].includes(state)');
    expect(detail).toContain('href="/app/connections"');
    expect(detail).not.toContain('href="/app/matches"');
  });

  it("repairs the protected readiness notification destination", () => {
    const app = source("client/src/App.tsx");
    expect(app).toContain('path="/app/readiness/:conversationId"');
    expect(app).toContain("<MessageThreadPage conversationId={Number(params.conversationId)} />");
  });

  it("keeps conversation and Family Circle privacy boundaries explicit", () => {
    const messaging = source("server/messagingService.ts");
    const family = source("server/familyService.ts");
    expect(messaging).toContain("async function requireConversationAccess");
    expect(messaging).toContain("if (blocked[0]) throw new Error(\"Conversation is unavailable\")");
    expect(family).toContain("Only an existing mutual match can be shared with Family Circle");
  });
});
