import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const family = readFileSync(resolve(root, "server/familyService.ts"), "utf8");
const readiness = readFileSync(resolve(root, "server/readinessService.ts"), "utf8");
const familyPage = readFileSync(resolve(root, "client/src/pages/FamilyCirclePages.tsx"), "utf8");
const memberPages = readFileSync(resolve(root, "client/src/pages/MemberPages.tsx"), "utf8");
const profileDetails = readFileSync(resolve(root, "client/src/pages/ProfileDetailsPage.tsx"), "utf8");

describe("Sprint 17 Family Circle and marriage journey contracts", () => {
  it("keeps invitation acceptance recipient-bound, expiring, one-time, and stale-safe", () => {
    expect(family).toContain('eq(familyLinks.status, "invited")');
    expect(family).toContain("gt(familyLinks.invitationExpiresAt, new Date())");
    expect(family).toContain("link.contactEmail?.toLowerCase() !== email.toLowerCase()");
    expect(family).toContain("eq(familyLinks.invitationCodeHash, invitationHash(code))");
    expect(family).toContain("This Family Circle invitation is unavailable");
  });

  it("projects bounded member-owned acknowledgement state without exposing feedback or participant private data", () => {
    expect(family).toContain("const acknowledgments = shares.length");
    expect(family).toContain("acknowledgment: acknowledgment ?");
    expect(family).toContain("visibleEventTypes");
    expect(familyPage).toContain("Acknowledgments awaiting");
    expect(familyPage).toContain("does not reveal private messages, documents, safety records");
  });

  it("withdraws active Family Circle shared-match access when the authoritative connection is revoked", () => {
    expect(family).toContain("export async function withdrawFamilySharesForProfilePair");
    expect(family).toContain('eq(familyShares.status, "active")');
    expect(family).toContain('status: "withdrawn", withdrawnAt: now');
    expect(family).toContain('eq(familyAcknowledgments.status, "requested")');
    expect(readiness).toContain('import { withdrawFamilySharesForProfilePair } from "./familyService"');
    expect(readiness).toContain("await withdrawFamilySharesForProfilePair(match.firstProfileId, match.secondProfileId");
  });

  it("keeps Family Circle advisory and separate from mutual connection, private communication, safety, verification, and membership authority", () => {
    expect(family).toContain("Only an existing mutual match can be shared with Family Circle");
    expect(familyPage).toContain("never creates a match, changes compatibility, or unlocks messaging");
    expect(familyPage).toContain("cannot sign in as you, send messages as you, accept or decline a match");
    expect(familyPage).toContain("inspect verification documents");
    expect(familyPage).toContain("voice/video consent");
  });

  it("keeps another-marriage context married-only and private declarations profile-row locked, private, and withdrawable", () => {
    expect(profileDetails).toContain('form.maritalStatus === "married"');
    expect(profileDetails).toContain("Why are you seeking another marriage?");
    expect(memberPages).toContain("This declaration is private by default");
    expect(memberPages).toContain("never shown to matches or Family Circle participants");
    expect(family).not.toContain("memberSuccessDeclarations");
  });

  it("offers factual offline recovery and retains no premium shortcut", () => {
    expect(familyPage).toContain('const offline = network === "offline"');
    expect(familyPage).toContain("not queued. Reconnect and retry");
    expect(familyPage).toContain('disabled={offline || invite.isPending}');
    expect(memberPages).toContain("does not alter discovery or recommendations");
  });
});
