import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), createAuditLog: vi.fn(), createNotification: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb, createAuditLog: mocks.createAuditLog, createNotification: mocks.createNotification }));

import { acceptFamilyInvitation, createFamilyInvitation, getFamilyParticipantDashboard, removeFamilyParticipant, reportFamilyParticipant, requestFamilyAcknowledgment, respondToFamilyAcknowledgment, restrictFamilyParticipant, reviewWaliGuardianVerification, setFamilyPermission, sharePotentialMatch, submitFamilyFeedback, withdrawFamilyShare } from "./familyService";

function fakeDb(rows: unknown[][]) {
  const inserts: Array<{ table: unknown; values: Record<string, unknown> }> = [];
  const updates: Array<{ table: unknown; values: Record<string, unknown> }> = [];
  const select = () => {
    const result = rows.shift() ?? [];
    const query = { limit: async () => result, orderBy: async () => result, then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) };
    const joined = { where: () => query, innerJoin: () => joined };
    return { from: () => ({ where: () => query, innerJoin: () => joined }) };
  };
  const insert = (table: unknown) => ({ values: (values: Record<string, unknown>) => { inserts.push({ table, values }); return Object.assign([{ insertId: inserts.length }], { onDuplicateKeyUpdate: async () => undefined }); } });
  const update = (table: unknown) => ({ set: (values: Record<string, unknown>) => ({ where: async () => { updates.push({ table, values }); } }) });
  return { db: { select, insert, update }, inserts, updates };
}

const parentLink = { id: 31, memberProfileId: 3, relationship: "parent" as const, contactName: "Awa", contactEmail: "parent@example.test", status: "accepted" as const, familyParticipantUserId: 44, waliVerificationStatus: "not_required" as const };
const waliLink = { ...parentLink, id: 32, relationship: "wali_guardian" as const, contactName: "Saine", contactEmail: "wali@example.test", status: "invited" as const, familyParticipantUserId: null, invitationExpiresAt: new Date(Date.now() + 60_000), waliVerificationStatus: "unverified" as const };

describe("Phase 6 Family Circle service flows", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a Parent invitation with a private code, expiry, audit event, and no member-account delegation", async () => {
    const fake = fakeDb([]);
    mocks.getDb.mockResolvedValue(fake.db);
    const invitation = await createFamilyInvitation(3, 9, { relationship: "parent", contactName: "Awa", contactEmail: "parent@example.test", preferredContactMethod: "email" });

    expect(invitation.invitationCode).toHaveLength(24);
	    expect(fake.inserts[0]?.values).toMatchObject({ memberProfileId: 3, relationship: "parent", status: "invited", contactEmail: "parent@example.test" });
    expect(fake.inserts[0]?.values.invitationCodeHash).not.toBe(invitation.invitationCode);
    expect(mocks.createAuditLog).toHaveBeenCalledWith(9, "family.invitation_sent", "family_link", expect.any(String), { relationship: "parent" });
  });

  it("binds a Wali/Guardian invitation only to the invited participant account and keeps verification pending", async () => {
    const code = "wali-guardian-invitation-code";
    const fake = fakeDb([[{ ...waliLink, invitationCodeHash: createHash("sha256").update(code).digest("hex") }], [{ userId: 9 }]]);
    mocks.getDb.mockResolvedValue(fake.db);

    await expect(acceptFamilyInvitation(44, "wali@example.test", code)).resolves.toEqual({ accepted: true, role: "wali_guardian", status: "pending_verification" });

    expect(fake.updates.some(update => update.values.familyParticipantUserId === 44 && update.values.status === "pending_verification" && update.values.invitationCodeHash === null)).toBe(true);
    expect(mocks.createNotification).toHaveBeenCalledWith(9, "family", "Family Circle invitation accepted", expect.stringContaining("Wali/Guardian"), "/app/family", "family-accepted:32");
  });

	  it("records separate Parent permissions and makes them individually revocable", async () => {
	    const fake = fakeDb([[parentLink], [parentLink]]);
    mocks.getDb.mockResolvedValue(fake.db);
    await setFamilyPermission(3, 9, 31, "profile_basics", true);
    await setFamilyPermission(3, 9, 31, "profile_basics", false);

    expect(fake.inserts.some(insert => insert.values.permission === "profile_basics" && insert.values.isGranted === true)).toBe(true);
    expect(fake.inserts.some(insert => insert.values.eventType === "permission_revoked")).toBe(true);
  });

  it("shares only an existing mutual match after explicit potential-match permission, then notifies the purpose-specific participant", async () => {
    const fake = fakeDb([[parentLink], [{ id: 1 }], [{ id: 7 }], [], [parentLink]]);
    mocks.getDb.mockResolvedValue(fake.db);
    await expect(sharePotentialMatch(3, 9, 31, 4)).resolves.toEqual({ shareId: 1 });

    expect(fake.inserts.some(insert => insert.values.sharedProfileId === 4 && insert.values.status === "active")).toBe(true);
    expect(mocks.createNotification).toHaveBeenCalledWith(44, "family", "A potential match was shared with you", expect.any(String), "/family", "family-share:1");
  });

  it("promptly withdraws a shared potential match and its pending acknowledgment without touching the underlying member match", async () => {
    const fake = fakeDb([[{ share: { id: 71 }, link: parentLink }]]);
    mocks.getDb.mockResolvedValue(fake.db);
    await withdrawFamilyShare(3, 9, 71);

    expect(fake.updates.some(update => update.values.status === "withdrawn" && update.values.withdrawnAt instanceof Date)).toBe(true);
    expect(mocks.createAuditLog).toHaveBeenCalledWith(9, "family.share_withdrawn", "family_share", "71");
  });

	  it("returns no shared potential match or acknowledgment data after the potential-match permission is revoked", async () => {
    const share = { id: 71, familyLinkId: 31, status: "active" as const };
    const fake = fakeDb([[parentLink], [], [{ id: 3, displayName: "Member", city: "Banjul", country: "The Gambia", about: "Private", marriageTimeline: "Soon", marriageIntent: "Marriage", familyBackground: "Private" }], [{ share, link: parentLink, profile: { id: 4, displayName: "Potential match", city: "Banjul", country: "The Gambia", religion: "muslim", marriageTimeline: "Soon" } }], [{ acknowledgment: { id: 81, requestedAt: new Date() }, share }]]);
    mocks.getDb.mockResolvedValue(fake.db);

    const dashboard = await getFamilyParticipantDashboard(44);

    expect(dashboard.shares).toEqual([]);
    expect(dashboard.acknowledgments).toEqual([]);
	    expect(dashboard).not.toHaveProperty("messages");
	    expect(dashboard).not.toHaveProperty("voiceNotes");
	    expect(dashboard).not.toHaveProperty("verificationDocuments");
	    expect(dashboard).not.toHaveProperty("readiness");
	  });

	  it("isolates Parent and Wali/Guardian visibility independently when a member has multiple active Family Circle participants", async () => {
	    const activeWali = { ...waliLink, status: "verified" as const, familyParticipantUserId: 44 };
	    const parentShare = { id: 71, familyLinkId: parentLink.id, status: "active" as const };
	    const waliShare = { id: 72, familyLinkId: activeWali.id, status: "active" as const };
	    const owner = { id: 3, displayName: "Member", city: "Banjul", country: "The Gambia", about: "Private", marriageTimeline: "Soon", marriageIntent: "Marriage", familyBackground: "Private" };
	    const parentOnly = fakeDb([[parentLink, activeWali], [{ familyLinkId: parentLink.id, permission: "potential_match" }, { familyLinkId: parentLink.id, permission: "profile_basics" }, { familyLinkId: activeWali.id, permission: "profile_basics" }], [owner], [{ share: parentShare, link: parentLink, profile: { id: 4, displayName: "Parent view", city: "Banjul", country: "The Gambia", religion: "muslim", marriageTimeline: "Soon" } }, { share: waliShare, link: activeWali, profile: { id: 5, displayName: "Wali hidden view", city: "Banjul", country: "The Gambia", religion: "muslim", marriageTimeline: "Soon" } }], []]);
	    mocks.getDb.mockResolvedValue(parentOnly.db);
	    expect((await getFamilyParticipantDashboard(44)).shares.map(share => share.id)).toEqual([71]);

	    const waliOnly = fakeDb([[parentLink, activeWali], [{ familyLinkId: activeWali.id, permission: "potential_match" }, { familyLinkId: parentLink.id, permission: "profile_basics" }, { familyLinkId: activeWali.id, permission: "profile_basics" }], [owner], [{ share: parentShare, link: parentLink, profile: { id: 4, displayName: "Parent hidden view", city: "Banjul", country: "The Gambia", religion: "muslim", marriageTimeline: "Soon" } }, { share: waliShare, link: activeWali, profile: { id: 5, displayName: "Wali view", city: "Banjul", country: "The Gambia", religion: "muslim", marriageTimeline: "Soon" } }], []]);
	    mocks.getDb.mockResolvedValue(waliOnly.db);
	    expect((await getFamilyParticipantDashboard(44)).shares.map(share => share.id)).toEqual([72]);
	  });

	  it("records an acknowledgment request separately from the match and allows only the linked Family Circle participant to respond", async () => {
	    const fake = fakeDb([[{ share: { id: 71, status: "active" }, link: parentLink }], [{ id: 1 }], [{ acknowledgment: { id: 81, status: "requested" }, share: { id: 71 }, link: parentLink }], [{ userId: 9 }]]);
	    mocks.getDb.mockResolvedValue(fake.db);

	    await expect(requestFamilyAcknowledgment(3, 9, 71)).resolves.toEqual({ acknowledgmentId: 1 });
	    await expect(respondToFamilyAcknowledgment(44, 81, "acknowledged")).resolves.toEqual({ success: true });

	    expect(fake.inserts.some(insert => insert.values.familyShareId === 71 && insert.values.status === "requested")).toBe(true);
	    expect(fake.updates.some(update => update.values.status === "acknowledged" && update.values.respondedAt instanceof Date)).toBe(true);
	    expect(mocks.createNotification).toHaveBeenCalledWith(9, "family", "Family acknowledgment received", expect.stringContaining("decision remains your own"), "/app/family", "family-ack-response:81");
	  });

  it("records advisory family feedback without altering any member-to-member match or consent state", async () => {
    const fake = fakeDb([[{ share: { id: 71, status: "active" }, link: parentLink }], [{ id: 1 }], [{ userId: 9 }]]);
    mocks.getDb.mockResolvedValue(fake.db);
    await expect(submitFamilyFeedback(44, 71, "has_concerns", "Please consider timing.")).resolves.toEqual({ feedbackId: 1 });

    expect(fake.inserts.some(insert => insert.values.response === "has_concerns" && insert.values.note === "Please consider timing.")).toBe(true);
    expect(fake.updates).toHaveLength(0);
    expect(mocks.createNotification).toHaveBeenCalledWith(9, "family", "Family feedback received", expect.stringContaining("advisory"), "/app/family", "family-feedback:1");
  });

  it("removes a family participant by revoking every permission and active share, while preserving member ownership", async () => {
    const fake = fakeDb([[parentLink]]);
    mocks.getDb.mockResolvedValue(fake.db);
    await removeFamilyParticipant(3, 9, 31);

    expect(fake.updates.some(update => update.values.status === "removed" && update.values.removedAt instanceof Date)).toBe(true);
    expect(fake.updates.some(update => update.values.isGranted === false)).toBe(true);
    expect(fake.updates.some(update => update.values.status === "withdrawn")).toBe(true);
  });

	  it("routes a Family Circle concern into the existing Trust & Safety report record and audits it", async () => {
    const fake = fakeDb([[parentLink]]);
    mocks.getDb.mockResolvedValue(fake.db);
    await expect(reportFamilyParticipant(3, 9, 31, "harassment", "Boundary concern")).resolves.toEqual({ reportId: 1 });

    expect(fake.inserts.some(insert => insert.values.reportedFamilyLinkId === 31 && insert.values.reason === "harassment")).toBe(true);
	    expect(mocks.createAuditLog).toHaveBeenCalledWith(9, "family.participant_reported", "report", "1", { familyLinkId: 31, reason: "harassment" });
	  });

	  it("restricts Family Circle access through a scoped safety action that revokes grants and shared views without touching the member match", async () => {
	    const fake = fakeDb([[parentLink]]);
	    mocks.getDb.mockResolvedValue(fake.db);
    await expect(restrictFamilyParticipant(99, 31, "Safety concern")).resolves.toEqual({ success: true });

	    expect(fake.updates.some(update => update.values.status === "suspended" && update.values.restrictedAt instanceof Date)).toBe(true);
	    expect(fake.updates.some(update => update.values.isGranted === false)).toBe(true);
	    expect(mocks.createAuditLog).toHaveBeenCalledWith(99, "family.participant_restricted", "family_link", "31", { reason: "Safety concern" });
	  });

	  it("keeps Wali/Guardian verification separate from Parent access and records a controlled manual decision", async () => {
	    const fake = fakeDb([[waliLink]]);
	    mocks.getDb.mockResolvedValue(fake.db);
	    await expect(reviewWaliGuardianVerification(77, 32, "verified")).resolves.toEqual({ success: true });

	    expect(fake.updates.some(update => update.values.waliVerificationStatus === "verified" && update.values.status === "verified")).toBe(true);
	    expect(mocks.createAuditLog).toHaveBeenCalledWith(77, "family.wali_verification_reviewed", "family_link", "32", { decision: "verified" });
	  });
});
