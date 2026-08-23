import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const app = readFileSync(join(process.cwd(), "client/src/App.tsx"), "utf8");
const shell = readFileSync(join(process.cwd(), "client/src/components/MemberShell.tsx"), "utf8");
const dashboard = readFileSync(join(process.cwd(), "client/src/pages/MemberDashboardPage.tsx"), "utf8");
const connections = readFileSync(join(process.cwd(), "client/src/pages/ConnectionsPage.tsx"), "utf8");
const discovery = readFileSync(join(process.cwd(), "client/src/pages/CuratedDiscoveryPage.tsx"), "utf8");
const thread = readFileSync(join(process.cwd(), "client/src/pages/MemberDetailPages.tsx"), "utf8");
const router = readFileSync(join(process.cwd(), "server/routers.ts"), "utf8");
const db = readFileSync(join(process.cwd(), "server/db.ts"), "utf8");
const readiness = readFileSync(join(process.cwd(), "server/readinessService.ts"), "utf8");

describe("Sprint 9 member Command Center and daily experience contracts", () => {
  it("adds a protected Connections route and a server-authoritative outgoing-interest projection without introducing member search or private fields", () => {
    expect(app).toContain('path="/app/connections"');
    expect(router).toContain("outgoing: protectedProcedure.query");
    expect(router).toContain("listOutgoingInterests");
    expect(db).toContain("export async function listOutgoingInterests");
    expect(db).toContain("displayName: memberProfiles.displayName");
    expect(db).not.toContain("listOutgoingInterests(profileId: number) {\n  return db.select().from(memberProfiles)");
  });

  it("keeps incoming, outgoing, mutual, communication, readiness, unavailable, and duplicate-safe introduction actions clear and member controlled", () => {
    expect(connections).toContain("Incoming introductions");
    expect(connections).toContain("Outgoing introductions");
    expect(connections).toContain("Mutual connections");
    expect(connections).toContain("respond.mutate({ interestId: request.id, response: \"accepted\" })");
    expect(connections).toContain("withdraw.mutate({ interestId: request.id })");
    expect(connections).toContain("Readiness:");
    expect(connections).toContain("No interest, match, readiness, or message state has changed.");
    expect(connections).toContain("Your mutual connection is ready for private conversation.");
	    expect(connections).toContain("const profileReady = profile.data?.eligibility?.profileComplete === true");
	    expect(connections).toContain("enabled: profileReady");
	    expect(connections).toContain("Complete your profile before reviewing connections.");
  });

  it("makes the command center route only factual profile, verification, photo, interest, connection, notification, family, billing, safety, and member-milestone actions", () => {
    expect(dashboard).toContain("Your private command center.");
    expect(dashboard).toContain("trpc.interests.outgoing.useQuery(undefined, { enabled: profilePresent })");
    expect(dashboard).toContain("const profilePresent = Boolean(profile.data?.id)");
    expect(dashboard).toContain("Review connections");
    expect(dashboard).toContain("unread private message");
    expect(dashboard).toContain("Family Circle invitation or verification item");
    expect(dashboard).toContain("Conveniences never override safety, privacy, consent, matching, verification, or Family Circle rules.");
    expect(dashboard).toContain("It never ranks you, scores your activity, or changes any state automatically.");
  });

  it("fixes authenticated navigation duplication and prioritizes Home, Discover, Connections, Messages, and Profile on mobile while preserving secondary areas", () => {
    expect(shell).toContain('{ label: "Connections", href: "/app/connections", icon: HeartHandshake }');
    expect(shell).toContain("const links = primaryLinks;");
    expect(shell).not.toContain("const links = mobile ? primaryLinks : [...primaryLinks, ...secondaryLinks];");
    expect(shell).toContain('aria-label="Primary member navigation"');
    expect(shell).toContain("You’re offline. We’ll reconnect when your connection returns.");
  });

  it("preserves the authorized conversation, voice-note, retry, pagination, report/block, readiness-revocation, and private-media boundaries", () => {
    expect(thread).toContain("clientRequestId: requestId");
    expect(thread).toContain("Load earlier messages");
    expect(thread).toContain("Voice-note preview");
    expect(thread).toContain("Report message");
    expect(thread).toContain("Block");
    expect(thread).toContain("The waveform is visual feedback only.");
    expect(readiness).toContain("return presentReadiness(evaluation, profileId, access.otherProfileId)");
    expect(readiness).toContain("futureProvider: { configured: false");
  });

  it("keeps discovery eligibility-first, privacy-safe, country-aware, explainable, and free of popularity ranking", () => {
    expect(discovery).toContain("eligibility.discoveryEligible");
    expect(discovery).toContain("Hidden, suspended, deleted, blocked, and hard-incompatible profiles are excluded before results reach your device.");
    expect(discovery).toContain("not a swipe feed or a popularity contest");
    expect(discovery).toContain("Potential alignment");
    expect(discovery).toContain("Photos protected by member privacy");
  });
});
