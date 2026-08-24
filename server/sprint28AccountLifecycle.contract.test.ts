import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

describe("Sprint 28 account lifecycle, privacy controls, and data rights", () => {
  const schema = read("drizzle/schema.ts");
  const account = read("server/accountService.ts");
  const router = read("server/routers.ts");
  const page = read("client/src/pages/AccountCenterPage.tsx");
  const settings = read("client/src/pages/MemberPages.tsx");

  it("creates only member-owned additive lifecycle and request records with factual statuses", () => {
    expect(schema).toContain("memberAccountStates");
    expect(schema).toContain("memberDataRightsRequests");
    expect(schema).toContain("memberAccountEvents");
    ["requested", "processing", "ready", "expired", "cancelled", "unavailable", "failed"].forEach(status => expect(schema).toContain(`"${status}"`));
    expect(schema).toContain("Pending deletion is a request, never an automatic record purge");
  });

  it("keeps lifecycle changes protected, owned, observed-version guarded, serialized, and audited", () => {
    expect(router).toContain("account: router");
    expect(router).toContain("betaMemberProcedure");
    expect(account).toContain("expectedUpdatedAt");
    expect(account).toContain('for("update")');
    expect(account).toContain("assertObservedVersion");
    expect(account).toContain("createAuditLog");
    expect(account).toContain("memberAccountEvents");
  });

  it("removes a pending deletion request from discovery and communication without pretending records were erased", () => {
    expect(account).toContain('lifecycleStatus: "deletion_requested"');
    expect(account).toContain('profileStatus: "paused", searchVisible: false');
    expect(account).toContain('withdrawRecommendationsForProfile');
    expect(account).toContain('revokeConnectionsForProfile');
    expect(page).toContain("does not claim your records are deleted");
    expect(page).toContain("A deletion review request is not the same as completed deletion");
  });

  it("uses observed current-session facts and a fresh sign-in boundary without fabricating recovery channels or device details", () => {
    expect(account).toContain("memberSecuritySessions");
    expect(page).toContain("Observed sessions, not guesses.");
    expect(account).toContain("requireFreshMemberAuthentication(userId, sessionReferenceHash)");
    expect(page).toContain("If your sign-in is no longer recent, Bantabato asks you to sign out and sign in again");
    expect(page).not.toContain("recovery email sent");
  });

  it("keeps Privacy Center effects plain, profile-account separated, and unable to bypass safety, consent, eligibility, or premium boundaries", () => {
    expect(settings).toContain("Profile settings shape your matrimonial introduction. Account settings manage privacy");
    expect(page).toContain("What it does:");
    expect(page).toContain("What others can see:");
    expect(page).toContain("What changes now:");
    expect(page).toContain("Privacy never overrides safety, eligibility, blocks, consent, restrictions, verification, or another member’s control.");
    expect(page).toContain("give Premium control over your choice");
  });

  it("excludes documents, credentials, staff records, other members, safety detail, media URLs, and internal policy data from member data requests", () => {
    expect(page).toContain("other members’ private information, staff notes, private safety decisions, identity documents, credentials");
    expect(page).toContain("Bantabato does not pretend a downloadable file exists");
    expect(account).not.toContain("storageGetSignedUrl");
    expect(account).not.toContain("documentStorageKey");
  });

  it("keeps sensitive account actions text-first, explicitly confirmed, offline-safe, and keyboard-native", () => {
	    expect(page).toContain('role="dialog"');
	    expect(page).toContain('aria-modal="true"');
    expect(page).toContain('type="checkbox"');
    expect(page).toContain("I understand what will happen and want to continue.");
    expect(page).toContain("actions are not queued");
    expect(page).toContain("Reconnect before you try again");
  });
});
