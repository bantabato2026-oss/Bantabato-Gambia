import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import {
  familyAcknowledgments,
  familyEvents,
  familyFeedback,
  familyLinks,
  familyPermissions,
  familyShares,
  matches,
  memberProfiles,
  reports,
  users,
} from "../drizzle/schema";
import { createAuditLog, createNotification, getDb } from "./db";
import { createIntegritySignal } from "./integrityService";
import { normalizeOptionalUserText } from "./inputSecurity";

export const FAMILY_PERMISSIONS = ["profile_basics", "profile_photo", "marriage_intentions", "compatibility_summary", "family_context", "potential_match", "acknowledgment_status"] as const;
export type FamilyPermission = (typeof FAMILY_PERMISSIONS)[number];
export type FamilyRole = "parent" | "wali_guardian";

const activeParticipantStatuses = ["accepted", "pending_verification", "verified", "unverified"] as const;
const activeShareStatuses = ["active"] as const;

function invitationHash(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function createInvitationCode() {
  return randomBytes(18).toString("base64url");
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db;
}

async function ownedLink(memberProfileId: number, familyLinkId: number) {
  const db = await requireDb();
  const rows = await db.select().from(familyLinks).where(and(eq(familyLinks.id, familyLinkId), eq(familyLinks.memberProfileId, memberProfileId))).limit(1);
  if (!rows[0]) throw new Error("Family Circle participant not found");
  return rows[0];
}

async function participantLink(userId: number, familyLinkId: number) {
  const db = await requireDb();
  const rows = await db.select().from(familyLinks).where(and(eq(familyLinks.id, familyLinkId), eq(familyLinks.familyParticipantUserId, userId), inArray(familyLinks.status, activeParticipantStatuses))).limit(1);
  if (!rows[0]) throw new Error("Family Circle access is unavailable");
  return rows[0];
}

async function recordEvent(familyLinkId: number, actorUserId: number | null, eventType: "invitation_sent" | "invitation_accepted" | "invitation_declined" | "permission_granted" | "permission_revoked" | "match_shared" | "share_withdrawn" | "acknowledgment_requested" | "acknowledgment_submitted" | "feedback_submitted" | "participant_removed" | "access_restricted" | "report_submitted", details?: Record<string, unknown>) {
  const db = await requireDb();
  await db.insert(familyEvents).values({ familyLinkId, actorUserId, eventType, details: details ?? null });
}

async function memberUserId(profileId: number) {
  const db = await requireDb();
  const row = await db.select({ userId: memberProfiles.userId }).from(memberProfiles).where(eq(memberProfiles.id, profileId)).limit(1);
  return row[0]?.userId;
}

async function revokeLinkAccess(familyLinkId: number, status: "removed" | "suspended" | "revoked", actorUserId: number | null, eventType: "participant_removed" | "access_restricted", details?: Record<string, unknown>) {
  const db = await requireDb();
  const now = new Date();
  await db.update(familyLinks).set({ status, removedAt: status === "removed" ? now : undefined, restrictedAt: status === "suspended" ? now : undefined, revokedAt: status === "revoked" ? now : undefined }).where(eq(familyLinks.id, familyLinkId));
  await db.update(familyPermissions).set({ isGranted: false, revokedAt: now }).where(eq(familyPermissions.familyLinkId, familyLinkId));
  await db.update(familyShares).set({ status: "withdrawn", withdrawnAt: now }).where(and(eq(familyShares.familyLinkId, familyLinkId), eq(familyShares.status, "active")));
  await recordEvent(familyLinkId, actorUserId, eventType, details);
}

export async function createFamilyInvitation(memberProfileId: number, actorUserId: number, input: { relationship: FamilyRole; contactName: string; contactEmail: string; contactPhone?: string; preferredContactMethod: "email" | "phone" }) {
  const db = await requireDb();
  const code = createInvitationCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000);
  const waliVerificationStatus = input.relationship === "wali_guardian" ? "unverified" : "not_required" as const;
  const inserted = await db.insert(familyLinks).values({ memberProfileId, relationship: input.relationship, contactName: input.contactName, contactEmail: input.contactEmail.toLowerCase(), contactPhone: input.contactPhone || null, preferredContactMethod: input.preferredContactMethod, status: "invited", waliVerificationStatus, invitationCodeHash: invitationHash(code), invitationExpiresAt: expiresAt, canReceiveMatchNotifications: false, invitedAt: now });
  const familyLinkId = Number(inserted[0]?.insertId ?? 0);
  await recordEvent(familyLinkId, actorUserId, "invitation_sent", { relationship: input.relationship, preferredContactMethod: input.preferredContactMethod });
  await createAuditLog(actorUserId, "family.invitation_sent", "family_link", String(familyLinkId), { relationship: input.relationship });
  return { familyLinkId, invitationCode: code, expiresAt };
}

export async function acceptFamilyInvitation(userId: number, email: string | null | undefined, code: string) {
  if (!email) throw new Error("A verified account email is required to accept a Family Circle invitation");
  const db = await requireDb();
  const rows = await db.select().from(familyLinks).where(and(eq(familyLinks.invitationCodeHash, invitationHash(code)), eq(familyLinks.status, "invited"), gt(familyLinks.invitationExpiresAt, new Date()))).limit(1);
  const link = rows[0];
  if (!link || link.contactEmail?.toLowerCase() !== email.toLowerCase()) throw new Error("This Family Circle invitation is unavailable");
  const owner = await memberUserId(link.memberProfileId);
  if (owner === userId) throw new Error("A member cannot become their own Family Circle participant");
  const now = new Date();
  const status = link.relationship === "wali_guardian" ? "pending_verification" : "accepted" as const;
  await db.update(familyLinks).set({ familyParticipantUserId: userId, status, acceptedAt: now, consentedAt: now, invitationCodeHash: null }).where(eq(familyLinks.id, link.id));
  await recordEvent(link.id, userId, "invitation_accepted", { relationship: link.relationship, status });
  await createAuditLog(userId, "family.invitation_accepted", "family_link", String(link.id), { relationship: link.relationship });
  if (owner) await createNotification(owner, "family", "Family Circle invitation accepted", `${link.contactName} accepted your ${link.relationship === "wali_guardian" ? "Wali/Guardian" : "Parent"} invitation.`, "/app/family", `family-accepted:${link.id}`);
  return { accepted: true, role: link.relationship, status };
}

export async function declineFamilyInvitation(userId: number, email: string | null | undefined, code: string) {
  if (!email) throw new Error("A verified account email is required to decline a Family Circle invitation");
  const db = await requireDb();
  const rows = await db.select().from(familyLinks).where(and(eq(familyLinks.invitationCodeHash, invitationHash(code)), eq(familyLinks.status, "invited"), gt(familyLinks.invitationExpiresAt, new Date()))).limit(1);
  const link = rows[0];
  if (!link || link.contactEmail?.toLowerCase() !== email.toLowerCase()) throw new Error("This Family Circle invitation is unavailable");
  await db.update(familyLinks).set({ status: "declined", declinedAt: new Date(), invitationCodeHash: null }).where(eq(familyLinks.id, link.id));
  await recordEvent(link.id, userId, "invitation_declined", { relationship: link.relationship });
  const owner = await memberUserId(link.memberProfileId);
  if (owner) await createNotification(owner, "family", "Family Circle invitation declined", `${link.contactName} declined your Family Circle invitation.`, "/app/family", `family-declined:${link.id}`);
  return { declined: true };
}

export async function listMemberFamilyCircle(memberProfileId: number) {
  const db = await requireDb();
  const links = await db.select().from(familyLinks).where(eq(familyLinks.memberProfileId, memberProfileId)).orderBy(desc(familyLinks.createdAt));
  const permissions = links.length ? await db.select().from(familyPermissions).where(inArray(familyPermissions.familyLinkId, links.map(link => link.id))) : [];
  const shares = links.length ? await db.select().from(familyShares).where(and(inArray(familyShares.familyLinkId, links.map(link => link.id)), eq(familyShares.status, "active"))) : [];
  const events = links.length ? await db.select().from(familyEvents).where(inArray(familyEvents.familyLinkId, links.map(link => link.id))).orderBy(desc(familyEvents.createdAt)).limit(120) : [];
  const visibleEventTypes = new Set(["invitation_sent", "invitation_accepted", "invitation_declined", "permission_granted", "permission_revoked", "match_shared", "share_withdrawn", "acknowledgment_requested", "acknowledgment_submitted", "feedback_submitted", "participant_removed", "access_restricted"]);
  return links.map(link => ({
    id: link.id,
    relationship: link.relationship,
    contactName: link.contactName,
    status: link.status,
    canReceiveMatchNotifications: link.canReceiveMatchNotifications,
    waliVerificationStatus: link.waliVerificationStatus,
    invitationExpiresAt: link.invitationExpiresAt,
    createdAt: link.createdAt,
    permissions: permissions.filter(permission => permission.familyLinkId === link.id).map(permission => ({ permission: permission.permission, isGranted: permission.isGranted, grantedAt: permission.grantedAt, revokedAt: permission.revokedAt })),
    activeShares: shares.filter(share => share.familyLinkId === link.id).map(share => ({ id: share.id, sharedProfileId: share.sharedProfileId, createdAt: share.createdAt })),
    history: events.filter(event => event.familyLinkId === link.id && visibleEventTypes.has(event.eventType)).slice(0, 12).map(event => {
      const details = event.details && typeof event.details === "object" ? event.details as Record<string, unknown> : {};
      const permission = typeof details.permission === "string" && (FAMILY_PERMISSIONS as readonly string[]).includes(details.permission) ? details.permission : null;
      return { id: event.id, eventType: event.eventType, permission, createdAt: event.createdAt };
    }),
  }));
}

export async function setFamilyPermission(memberProfileId: number, actorUserId: number, familyLinkId: number, permission: FamilyPermission, isGranted: boolean) {
  const db = await requireDb();
  const link = await ownedLink(memberProfileId, familyLinkId);
  if (!activeParticipantStatuses.includes(link.status as typeof activeParticipantStatuses[number])) throw new Error("Permissions can only be changed for an active Family Circle participant");
  const now = new Date();
  await db.insert(familyPermissions).values({ familyLinkId, permission, isGranted, grantedAt: isGranted ? now : null, revokedAt: isGranted ? null : now }).onDuplicateKeyUpdate({ set: { isGranted, grantedAt: isGranted ? now : null, revokedAt: isGranted ? null : now } });
  await recordEvent(familyLinkId, actorUserId, isGranted ? "permission_granted" : "permission_revoked", { permission });
  await createAuditLog(actorUserId, isGranted ? "family.permission_granted" : "family.permission_revoked", "family_link", String(familyLinkId), { permission });
  return { success: true };
}

async function requireGrantedPermission(familyLinkId: number, permission: FamilyPermission) {
  const db = await requireDb();
  const rows = await db.select({ id: familyPermissions.id }).from(familyPermissions).where(and(eq(familyPermissions.familyLinkId, familyLinkId), eq(familyPermissions.permission, permission), eq(familyPermissions.isGranted, true))).limit(1);
  if (!rows[0]) throw new Error("The member has not granted this Family Circle permission");
}

export async function sharePotentialMatch(memberProfileId: number, actorUserId: number, familyLinkId: number, potentialMatchProfileId: number) {
  const db = await requireDb();
  await ownedLink(memberProfileId, familyLinkId);
  await requireGrantedPermission(familyLinkId, "potential_match");
  const match = await db.select({ id: matches.id }).from(matches).where(and(eq(matches.status, "active"), or(and(eq(matches.memberOneProfileId, memberProfileId), eq(matches.memberTwoProfileId, potentialMatchProfileId)), and(eq(matches.memberTwoProfileId, memberProfileId), eq(matches.memberOneProfileId, potentialMatchProfileId))))).limit(1);
  if (!match[0]) throw new Error("Only an existing mutual match can be shared with Family Circle");
  const existing = await db.select().from(familyShares).where(and(eq(familyShares.familyLinkId, familyLinkId), eq(familyShares.sharedProfileId, potentialMatchProfileId), eq(familyShares.status, "active"))).limit(1);
  const shareId = existing[0]?.id ?? Number((await db.insert(familyShares).values({ familyLinkId, sharedProfileId: potentialMatchProfileId, status: "active" }))[0]?.insertId ?? 0);
  await recordEvent(familyLinkId, actorUserId, "match_shared", { shareId, potentialMatchProfileId });
  await createAuditLog(actorUserId, "family.match_shared", "family_share", String(shareId), { familyLinkId });
  const link = await ownedLink(memberProfileId, familyLinkId);
  if (link.familyParticipantUserId) await createNotification(link.familyParticipantUserId, "family", "A potential match was shared with you", "A member has shared a selected potential match for your private Family Circle view.", "/family", `family-share:${shareId}`);
  return { shareId };
}

export async function withdrawFamilyShare(memberProfileId: number, actorUserId: number, familyShareId: number) {
  const db = await requireDb();
  const rows = await db.select({ share: familyShares, link: familyLinks }).from(familyShares).innerJoin(familyLinks, eq(familyShares.familyLinkId, familyLinks.id)).where(and(eq(familyShares.id, familyShareId), eq(familyLinks.memberProfileId, memberProfileId))).limit(1);
  const row = rows[0];
  if (!row) throw new Error("Shared potential match not found");
  await db.update(familyShares).set({ status: "withdrawn", withdrawnAt: new Date() }).where(eq(familyShares.id, familyShareId));
  await db.update(familyAcknowledgments).set({ status: "withdrawn", withdrawnAt: new Date() }).where(and(eq(familyAcknowledgments.familyShareId, familyShareId), eq(familyAcknowledgments.status, "requested")));
  await recordEvent(row.link.id, actorUserId, "share_withdrawn", { familyShareId });
  await createAuditLog(actorUserId, "family.share_withdrawn", "family_share", String(familyShareId));
  return { success: true };
}

export async function requestFamilyAcknowledgment(memberProfileId: number, actorUserId: number, familyShareId: number) {
  const db = await requireDb();
  const rows = await db.select({ share: familyShares, link: familyLinks }).from(familyShares).innerJoin(familyLinks, eq(familyShares.familyLinkId, familyLinks.id)).where(and(eq(familyShares.id, familyShareId), eq(familyShares.status, "active"), eq(familyLinks.memberProfileId, memberProfileId))).limit(1);
  const row = rows[0];
  if (!row) throw new Error("Shared potential match not found");
  await requireGrantedPermission(row.link.id, "acknowledgment_status");
  const inserted = await db.insert(familyAcknowledgments).values({ familyShareId, status: "requested" });
  const acknowledgmentId = Number(inserted[0]?.insertId ?? 0);
  await recordEvent(row.link.id, actorUserId, "acknowledgment_requested", { familyShareId, acknowledgmentId });
  if (row.link.familyParticipantUserId) await createNotification(row.link.familyParticipantUserId, "family", "Family acknowledgment requested", "A member has asked you to acknowledge that you are aware of a shared potential match. This does not approve or change any member decision.", "/family", `family-acknowledgment:${acknowledgmentId}`);
  return { acknowledgmentId };
}

export async function respondToFamilyAcknowledgment(userId: number, acknowledgmentId: number, response: "acknowledged" | "declined") {
  const db = await requireDb();
  const rows = await db.select({ acknowledgment: familyAcknowledgments, share: familyShares, link: familyLinks }).from(familyAcknowledgments).innerJoin(familyShares, eq(familyAcknowledgments.familyShareId, familyShares.id)).innerJoin(familyLinks, eq(familyShares.familyLinkId, familyLinks.id)).where(and(eq(familyAcknowledgments.id, acknowledgmentId), eq(familyAcknowledgments.status, "requested"), eq(familyLinks.familyParticipantUserId, userId), inArray(familyLinks.status, activeParticipantStatuses))).limit(1);
  const row = rows[0];
  if (!row) throw new Error("Acknowledgment request is unavailable");
  await db.update(familyAcknowledgments).set({ status: response, respondedAt: new Date() }).where(eq(familyAcknowledgments.id, acknowledgmentId));
  await recordEvent(row.link.id, userId, "acknowledgment_submitted", { acknowledgmentId, response });
  const owner = await memberUserId(row.link.memberProfileId);
  if (owner) await createNotification(owner, "family", "Family acknowledgment received", `${row.link.contactName} responded to a Family Circle acknowledgment request. Your matrimonial decision remains your own.`, "/app/family", `family-ack-response:${acknowledgmentId}`);
  return { success: true };
}

export async function submitFamilyFeedback(userId: number, familyShareId: number, response: "acknowledged" | "interested_to_learn_more" | "has_concerns" | "decline_to_comment", note?: string) {
  const db = await requireDb();
  const rows = await db.select({ share: familyShares, link: familyLinks }).from(familyShares).innerJoin(familyLinks, eq(familyShares.familyLinkId, familyLinks.id)).where(and(eq(familyShares.id, familyShareId), eq(familyShares.status, "active"), eq(familyLinks.familyParticipantUserId, userId), inArray(familyLinks.status, activeParticipantStatuses))).limit(1);
  const row = rows[0];
  if (!row) throw new Error("Shared potential match is unavailable");
  await requireGrantedPermission(row.link.id, "potential_match");
  const inserted = await db.insert(familyFeedback).values({ familyShareId, familyLinkId: row.link.id, response, note: normalizeOptionalUserText(note) || null });
  const feedbackId = Number(inserted[0]?.insertId ?? 0);
  await recordEvent(row.link.id, userId, "feedback_submitted", { familyShareId, feedbackId, response });
  const owner = await memberUserId(row.link.memberProfileId);
  if (owner) await createNotification(owner, "family", "Family feedback received", `${row.link.contactName} shared Family Circle feedback. It is advisory and does not change your match or communication access.`, "/app/family", `family-feedback:${feedbackId}`);
  return { feedbackId };
}

export async function removeFamilyParticipant(memberProfileId: number, actorUserId: number, familyLinkId: number) {
  await ownedLink(memberProfileId, familyLinkId);
  await revokeLinkAccess(familyLinkId, "removed", actorUserId, "participant_removed");
  await createAuditLog(actorUserId, "family.participant_removed", "family_link", String(familyLinkId));
  return { success: true };
}

export async function reportFamilyParticipant(memberProfileId: number, actorUserId: number, familyLinkId: number, reason: "harassment" | "scam" | "safety_concern" | "other", details?: string) {
  const db = await requireDb();
  await ownedLink(memberProfileId, familyLinkId);
  const inserted = await db.insert(reports).values({ reporterProfileId: memberProfileId, reportedFamilyLinkId: familyLinkId, reason, details: normalizeOptionalUserText(details) || null });
  const reportId = Number(inserted[0]?.insertId ?? 0);
  await createIntegritySignal({ actorUserId, reportId, source: "family_circle", category: "family_circle_behavior", severity: ["scam", "safety_concern"].includes(reason) ? "medium" : "low", evidenceConfidence: "unverified", idempotencyKey: `family-report:${reportId}` });
  await recordEvent(familyLinkId, actorUserId, "report_submitted", { reportId, reason });
  await createAuditLog(actorUserId, "family.participant_reported", "report", String(reportId), { familyLinkId, reason });
  return { reportId };
}

export async function getFamilyParticipantDashboard(userId: number) {
  const db = await requireDb();
  const links = await db.select().from(familyLinks).where(and(eq(familyLinks.familyParticipantUserId, userId), inArray(familyLinks.status, activeParticipantStatuses))).orderBy(desc(familyLinks.createdAt));
	const linkIds = links.map(link => link.id);
	if (!linkIds.length) return { links: [], shares: [], acknowledgments: [] };
	const [permissions, ownerProfiles, shares, acknowledgments] = await Promise.all([
	  db.select().from(familyPermissions).where(and(inArray(familyPermissions.familyLinkId, linkIds), eq(familyPermissions.isGranted, true))),
	  db.select().from(memberProfiles).where(inArray(memberProfiles.id, links.map(link => link.memberProfileId))),
	  db.select({ share: familyShares, link: familyLinks, profile: memberProfiles }).from(familyShares).innerJoin(familyLinks, eq(familyShares.familyLinkId, familyLinks.id)).innerJoin(memberProfiles, eq(familyShares.sharedProfileId, memberProfiles.id)).where(and(inArray(familyShares.familyLinkId, linkIds), inArray(familyShares.status, activeShareStatuses), or(isNull(familyShares.expiresAt), gt(familyShares.expiresAt, new Date())))),
    db.select({ acknowledgment: familyAcknowledgments, share: familyShares }).from(familyAcknowledgments).innerJoin(familyShares, eq(familyAcknowledgments.familyShareId, familyShares.id)).where(and(inArray(familyShares.familyLinkId, linkIds), eq(familyAcknowledgments.status, "requested"))),
	]);
	const permissionsFor = (familyLinkId: number) => new Set(permissions.filter(permission => permission.familyLinkId === familyLinkId).map(permission => permission.permission));
	const visibleShareIds = new Set(shares.filter(({ link }) => permissionsFor(link.id).has("potential_match")).map(({ share }) => share.id));
	return {
	links: links.map(link => {
	  const granted = permissionsFor(link.id);
	  const ownerProfile = ownerProfiles.find(profile => profile.id === link.memberProfileId);
	  return {
        id: link.id,
        relationship: link.relationship,
        status: link.status,
        waliVerificationStatus: link.waliVerificationStatus,
	    member: {
	      displayName: granted.has("profile_basics") ? ownerProfile?.displayName ?? null : null,
	      city: granted.has("profile_basics") ? ownerProfile?.city ?? null : null,
	      country: granted.has("profile_basics") ? ownerProfile?.country ?? null : null,
	      introduction: granted.has("profile_basics") ? ownerProfile?.about ?? null : null,
	      marriageTimeline: granted.has("marriage_intentions") ? ownerProfile?.marriageTimeline ?? null : null,
	      marriageIntent: granted.has("marriage_intentions") ? ownerProfile?.marriageIntent ?? null : null,
	      familyContext: granted.has("family_context") ? ownerProfile?.familyBackground ?? null : null,
	      profilePhotoShared: granted.has("profile_photo"),
	    },
        permissions: Array.from(granted),
      };
    }),
	  shares: shares.filter(({ share }) => visibleShareIds.has(share.id)).map(({ share, link, profile }) => {
      const granted = permissionsFor(link.id);
      return {
        id: share.id,
        familyLinkId: link.id,
        profile: {
          displayName: profile.displayName,
          city: granted.has("potential_match") ? profile.city : null,
          country: granted.has("potential_match") ? profile.country : null,
          religion: granted.has("potential_match") ? profile.religion : null,
          marriageTimeline: granted.has("marriage_intentions") ? profile.marriageTimeline : null,
        },
      };
    }),
	  acknowledgments: acknowledgments.filter(({ share }) => visibleShareIds.has(share.id)).map(({ acknowledgment, share }) => ({ id: acknowledgment.id, familyShareId: share.id, requestedAt: acknowledgment.requestedAt })),
  };
}

export async function listFamilyMetadataForOperations() {
  const db = await requireDb();
  return db.select({ id: familyLinks.id, memberProfileId: familyLinks.memberProfileId, relationship: familyLinks.relationship, status: familyLinks.status, waliVerificationStatus: familyLinks.waliVerificationStatus, invitedAt: familyLinks.invitedAt, acceptedAt: familyLinks.acceptedAt, restrictedAt: familyLinks.restrictedAt, createdAt: familyLinks.createdAt }).from(familyLinks).orderBy(desc(familyLinks.createdAt)).limit(100);
}

export async function restrictFamilyParticipant(actorUserId: number, familyLinkId: number, reason?: string) {
  const db = await requireDb();
  const link = await db.select().from(familyLinks).where(eq(familyLinks.id, familyLinkId)).limit(1);
  if (!link[0]) throw new Error("Family Circle participant not found");
  await revokeLinkAccess(familyLinkId, "suspended", actorUserId, "access_restricted", { reason: reason || null });
  await createAuditLog(actorUserId, "family.participant_restricted", "family_link", String(familyLinkId), { reason: reason || null });
  return { success: true };
}

export async function reviewWaliGuardianVerification(actorUserId: number, familyLinkId: number, decision: "verified" | "unverified") {
  const db = await requireDb();
  const link = await db.select().from(familyLinks).where(and(eq(familyLinks.id, familyLinkId), eq(familyLinks.relationship, "wali_guardian"))).limit(1);
  if (!link[0]) throw new Error("Wali/Guardian Family Circle participant not found");
  await db.update(familyLinks).set({ waliVerificationStatus: decision, status: decision }).where(eq(familyLinks.id, familyLinkId));
  await createAuditLog(actorUserId, "family.wali_verification_reviewed", "family_link", String(familyLinkId), { decision });
  return { success: true };
}
