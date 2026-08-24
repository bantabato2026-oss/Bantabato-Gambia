import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { safeLocationDisplay } from "./domain/internationalPolicy";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Sprint 34 — Family Circle, Wali & marriage-intent journey", () => {
  it("keeps coarse location presentation privacy-safe for Family Circle and never needs raw location or religion in the participant projection", () => {
    expect(safeLocationDisplay({ visibility: "family_circle", detail: "city", countryName: "The Gambia", city: "Banjul", relationship: "family" })).toBe("The Gambia • Banjul");
    expect(safeLocationDisplay({ visibility: "matches_only", detail: "city", countryName: "The Gambia", city: "Banjul", relationship: "family" })).toBeNull();
    const service = read("server/familyService.ts");
    expect(service).toContain("safeLocationDisplay");
    expect(service).toContain("relationship: \"family\"");
    expect(service).toContain("city: null");
    expect(service).toContain("country: null");
    const participantProjection = service.slice(service.indexOf("export async function getFamilyParticipantDashboard"));
    expect(participantProjection).not.toContain("religion: granted.has");
    expect(participantProjection).not.toContain("voiceNotes");
    expect(participantProjection).not.toContain("verificationDocuments");
  });

  it("uses server-authoritative status and code comparisons to reject stale invitation, acknowledgement, and share actions", () => {
    const service = read("server/familyService.ts");
    expect(service).toContain("const expectedInvitationCodeHash = link.invitationCodeHash");
    expect(service).toContain("eq(familyLinks.invitationCodeHash, expectedInvitationCodeHash)");
    expect(service).toContain("eq(familyShares.status, \"active\")");
    expect(service).toContain("eq(familyAcknowledgments.status, \"requested\")");
    expect(service).toContain("inArray(familyLinks.status, activeParticipantStatuses)");
    expect(service).toContain("This shared potential match is no longer available.");
    expect(service).toContain("Acknowledgment request is unavailable");
  });

  it("preserves role-bound invitation, acknowledgement, consent, participant-removal, connection-withdrawal, and notification boundaries", () => {
    const service = read("server/familyService.ts");
    const router = read("server/routers.ts");
    expect(service).toContain("contactEmail?.toLowerCase() !== email.toLowerCase()");
    expect(service).toContain("A member cannot become their own Family Circle participant");
    expect(service).toContain("pending_verification");
    expect(service).toContain("requireGrantedPermission(row.link.id, \"acknowledgment_status\")");
    expect(service).toContain("revokeLinkAccess");
    expect(service).toContain("withdrawFamilySharesForProfilePair");
    expect(service).toContain("family-accepted:");
    expect(service).toContain("family-ack-response:");
    expect(router).toContain("familyParticipant: router");
    expect(router).toContain("family: router");
    expect(router).toContain("z.enum(FAMILY_PERMISSIONS)");
  });

  it("keeps marriage-intent declarations private, serialized, voluntary, and separate from discovery or Family Circle authority", () => {
    const db = read("server/db.ts");
    const declarations = db.slice(db.indexOf("export async function saveSuccessDeclaration"), db.indexOf("export async function listSuccessStoryEditorialQueue"));
    expect(declarations).toContain("for(\"update\")");
    expect(declarations).toContain("sharingConsent: false");
    expect(declarations).toContain("status: \"withdrawn\"");
    expect(declarations).toContain("publicStoryConsent: false");
    expect(declarations).not.toContain("familyLinks");
    expect(declarations).not.toContain("recommendation");
  });

  it("retains member control, plain-language privacy, offline safety, bounded history, Family Circle isolation, and Premium-neutral policies in the current member experience", () => {
    const page = read("client/src/pages/FamilyCirclePages.tsx");
    const account = read("client/src/pages/AccountCenterPage.tsx");
    const connection = read("server/readinessService.ts");
    expect(page).toContain("Your Family Circle is optional.");
    expect(page).toContain("Your account, conversations, match decisions, and call consent remain yours alone.");
    expect(page).toContain("not queued. Reconnect and retry so the server can confirm the change.");
    expect(page).toContain("Recent Family Circle history");
    expect(page).toContain("private messages, documents, safety records");
    expect(page).toContain("disabled={offline || invite.isPending}");
    expect(account).toContain("Family Circle never gets access to messages");
    expect(connection).toContain("withdrawFamilySharesForProfilePair");
  });
});
