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
import { safeLocationDisplay } from "./domain/internationalPolicy";

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

function isDuplicateKey(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "ER_DUP_ENTRY");
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

async function recordEvent(familyLinkId: number, actorUserId: number | null, eventType: "invitation_sent" | "invitation_accepted" | "invitation_declined" | "invitation_revoked" | "permission_granted" | "permission_revoked" | "match_shared" | "share_withdrawn" | "acknowledgment_requested" | "acknowledgment_submitted" | "feedback_submitted" | "participant_removed" | "access_restricted" | "report_submitted", details?: Record<string, unknown>) {
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
  const contactEmail = input.contactEmail.toLowerCase();
  const outcome = await db.transaction(async tx => {
    await tx.select({ id: memberProfiles.id }).from(memberProfiles).where(eq(memberProfiles.id, memberProfileId)).for("update");
    const existing = await tx.select().from(familyLinks).where(and(eq(familyLinks.memberProfileId, memberProfileId), eq(familyLinks.relationship, input.relationship), eq(familyLinks.contactEmail, contactEmail))).limit(1);
    if (existing[0] && activeParticipantStatuses.includes(existing[0].status as typeof activeParticipantStatuses[number])) throw new Error("This Family Circle participant is already active. Change their permissions or remove access instead of creating another invitation.");
    if (existing[0]) {
      await tx.update(familyLinks).set({ contactName: input.contactName, contactPhone: input.contactPhone || null, preferredContactMethod: input.preferredContactMethod, familyParticipantUserId: null, status: "invited", waliVerificationStatus, invitationCodeHash: invitationHash(code), invitationExpiresAt: expiresAt, canReceiveMatchNotifications: false, consentedAt: null, invitedAt: now, acceptedAt: null, declinedAt: null, restrictedAt: null, removedAt: null, revokedAt: null }).where(eq(familyLinks.id, existing[0].id));
      return { familyLinkId: existing[0].id, reissued: true };
    }
    const inserted = await tx.insert(familyLinks).values({ memberProfileId, relationship: input.relationship, contactName: input.contactName, contactEmail, contactPhone: input.contactPhone || null, preferredContactMethod: input.preferredContactMethod, status: "invited", waliVerificationStatus, invitationCodeHash: invitationHash(code), invitationExpiresAt: expiresAt, canReceiveMatchNotifications: false, invitedAt: now });
    return { familyLinkId: Number(inserted[0]?.insertId ?? 0), reissued: false };
  });
  await recordEvent(outcome.familyLinkId, actorUserId, "invitation_sent", { relationship: input.relationship, preferredContactMethod: input.preferredContactMethod, reissued: outcome.reissued });
  await createAuditLog(actorUserId, "family.invitation_sent", "family_link", String(outcome.familyLinkId), { relationship: input.relationship, reissued: outcome.reissued });
  return { ...outcome, invitationCode: code, expiresAt };
}

export async function reissueFamilyInvitation(memberProfileId: number, actorUserId: number, familyLinkId: number) {
  const db = await requireDb();
  const code = createInvitationCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000);
  const link = await ownedLink(memberProfileId, familyLinkId);
  if (link.status !== "invited") throw new Error("Only a pending Family Circle invitation can be resent.");
  if (!link.invitationCodeHash) throw new Error("This Family Circle invitation is unavailable.");
  const expectedInvitationCodeHash = link.invitationCodeHash;
  const reissued = await db.update(familyLinks).set({ invitationCodeHash: invitationHash(code), invitationExpiresAt: expiresAt, invitedAt: now }).where(and(eq(familyLinks.id, familyLinkId), eq(familyLinks.status, "invited"), eq(familyLinks.invitationCodeHash, expectedInvitationCodeHash)));
  if (!Number((reissued[0] as { affectedRows?: number } | undefined)?.affectedRows ?? 0)) throw new Error("This Family Circle invitation changed before it could be reissued.");
  await recordEvent(familyLinkId, actorUserId, "invitation_sent", { relationship: link.relationship, reissued: true });
  await createAuditLog(actorUserId, "family.invitation_resent", "family_link", String(familyLinkId), { relationship: link.relationship });
  return { familyLinkId, invitationCode: code, expiresAt, reissued: true };
}

export async function revokeFamilyInvitation(memberProfileId: number, actorUserId: number, familyLinkId: number) {
  const db = await requireDb();
  const link = await ownedLink(memberProfileId, familyLinkId);
  if (link.status !== "invited") throw new Error("Only a pending Family Circle invitation can be revoked.");
  if (!link.invitationCodeHash) throw new Error("This Family Circle invitation is unavailable.");
  const expectedInvitationCodeHash = link.invitationCodeHash;
  const revokedAt = new Date();
  const revoked = await db.update(familyLinks).set({ status: "revoked", invitationCodeHash: null, revokedAt }).where(and(eq(familyLinks.id, familyLinkId), eq(familyLinks.status, "invited"), eq(familyLinks.invitationCodeHash, expectedInvitationCodeHash)));
  if (!Number((revoked[0] as { affectedRows?: number } | undefined)?.affectedRows ?? 0)) throw new Error("This Family Circle invitation changed before it could be revoked.");
  await recordEvent(familyLinkId, actorUserId, "invitation_revoked", { relationship: link.relationship, pendingInvitation: true });
  await createAuditLog(actorUserId, "family.invitation_revoked", "family_link", String(familyLinkId), { relationship: link.relationship });
  return { success: true, status: "revoked" as const };
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
  const accepted = await db.update(familyLinks).set({ familyParticipantUserId: userId, status, acceptedAt: now, consentedAt: now, invitationCodeHash: null }).where(and(eq(familyLinks.id, link.id), eq(familyLinks.status, "invited"), eq(familyLinks.invitationCodeHash, invitationHash(code))));
  if (!Number((accepted[0] as { affectedRows?: number } | undefined)?.affectedRows ?? 0)) throw new Error("This Family Circle invitation is unavailable");
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
  const declined = await db.update(familyLinks).set({ status: "declined", declinedAt: new Date(), invitationCodeHash: null }).where(and(eq(familyLinks.id, link.id), eq(familyLinks.status, "invited"), eq(familyLinks.invitationCodeHash, invitationHash(code))));
  if (!Number((declined[0] as { affectedRows?: number } | undefined)?.affectedRows ?? 0)) throw new Error("This Family Circle invitation is unavailable");
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
  const acknowledgments = shares.length ? await db.select().from(familyAcknowledgments).where(inArray(familyAcknowledgments.familyShareId, shares.map(share => share.id))) : [];
  const events = links.length ? await db.select().from(familyEvents).where(inArray(familyEvents.familyLinkId, links.map(link => link.id))).orderBy(desc(familyEvents.createdAt)).limit(120) : [];
  const visibleEventTypes = new Set(["invitation_sent", "invitation_accepted", "invitation_declined", "invitation_revoked", "permission_granted", "permission_revoked", "match_shared", "share_withdrawn", "acknowledgment_requested", "acknowledgment_submitted", "feedback_submitted", "participant_removed", "access_restricted"]);
  const now = new Date();
  return links.map(link => ({
    id: link.id,
    relationship: link.relationship,
    contactName: link.contactName,
    status: link.status === "invited" && link.invitationExpiresAt && link.invitationExpiresAt <= now ? "expired" : link.status,
    canReceiveMatchNotifications: link.canReceiveMatchNotifications,
    waliVerificationStatus: link.waliVerificationStatus,
    invitationExpiresAt: link.invitationExpiresAt,
    createdAt: link.createdAt,
    permissions: permissions.filter(permission => permission.familyLinkId === link.id).map(permission => ({ permission: permission.permission, isGranted: permission.isGranted, grantedAt: permission.grantedAt, revokedAt: permission.revokedAt })),
    activeShares: shares.filter(share => share.familyLinkId === link.id).map(share => {
      const acknowledgment = acknowledgments.find(item => item.familyShareId === share.id);
      return { id: share.id, sharedProfileId: share.sharedProfileId, createdAt: share.createdAt, acknowledgment: acknowledgment ? { status: acknowledgment.status, requestedAt: acknowledgment.requestedAt, respondedAt: acknowledgment.respondedAt, withdrawnAt: acknowledgment.withdrawnAt } : null };
    }),
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
  const withdrawn = await db.update(familyShares).set({ status: "withdrawn", withdrawnAt: new Date() }).where(and(eq(familyShares.id, familyShareId), eq(familyShares.status, "active")));
  if (!Number((withdrawn[0] as { affectedRows?: number } | undefined)?.affectedRows ?? 0)) throw new Error("This shared potential match is no longer available.");
  await db.update(familyAcknowledgments).set({ status: "withdrawn", withdrawnAt: new Date() }).where(and(eq(familyAcknowledgments.familyShareId, familyShareId), eq(familyAcknowledgments.status, "requested")));
  await recordEvent(row.link.id, actorUserId, "share_withdrawn", { familyShareId });
  await createAuditLog(actorUserId, "family.share_withdrawn", "family_share", String(familyShareId));
  return { success: true };
}

/** A Family Circle share is advisory and remains available only while its underlying mutual connection remains available. */
export async function withdrawFamilySharesForProfilePair(firstProfileId: number, secondProfileId: number, reason: "connection_unavailable" | "safety_restriction" | "profile_unavailable") {
  const db = await requireDb();
  const now = new Date();
  const withdrawn = await db.transaction(async tx => {
    const rows = await tx.select({ share: familyShares, link: familyLinks }).from(familyShares).innerJoin(familyLinks, eq(familyShares.familyLinkId, familyLinks.id)).where(and(eq(familyShares.status, "active"), or(and(eq(familyLinks.memberProfileId, firstProfileId), eq(familyShares.sharedProfileId, secondProfileId)), and(eq(familyLinks.memberProfileId, secondProfileId), eq(familyShares.sharedProfileId, firstProfileId))))).for("update");
    for (const row of rows) {
      await tx.update(familyShares).set({ status: "withdrawn", withdrawnAt: now }).where(and(eq(familyShares.id, row.share.id), eq(familyShares.status, "active")));
      await tx.update(familyAcknowledgments).set({ status: "withdrawn", withdrawnAt: now }).where(and(eq(familyAcknowledgments.familyShareId, row.share.id), eq(familyAcknowledgments.status, "requested")));
    }
    return rows;
  });
  for (const row of withdrawn) {
    await recordEvent(row.link.id, null, "share_withdrawn", { reason });
    await createAuditLog(null, "family.share_withdrawn_connection", "family_share", String(row.share.id), { familyLinkId: row.link.id, reason });
  }
  return { withdrawn: withdrawn.length };
}

export async function requestFamilyAcknowledgment(memberProfileId: number, actorUserId: number, familyShareId: number) {
  const db = await requireDb();
  const rows = await db.select({ share: familyShares, link: familyLinks }).from(familyShares).innerJoin(familyLinks, eq(familyShares.familyLinkId, familyLinks.id)).where(and(eq(familyShares.id, familyShareId), eq(familyShares.status, "active"), eq(familyLinks.memberProfileId, memberProfileId), inArray(familyLinks.status, activeParticipantStatuses))).limit(1);
  const row = rows[0];
  if (!row) throw new Error("Shared potential match not found");
  await requireGrantedPermission(row.link.id, "acknowledgment_status");
  const existing = await db.select({ id: familyAcknowledgments.id }).from(familyAcknowledgments).where(and(eq(familyAcknowledgments.familyShareId, familyShareId), eq(familyAcknowledgments.status, "requested"))).limit(1);
  if (existing[0]) return { acknowledgmentId: existing[0].id, duplicate: true };
  let inserted;
  try { inserted = await db.insert(familyAcknowledgments).values({ familyShareId, status: "requested" }); } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    const concurrent = await db.select({ id: familyAcknowledgments.id }).from(familyAcknowledgments).where(and(eq(familyAcknowledgments.familyShareId, familyShareId), eq(familyAcknowledgments.status, "requested"))).limit(1);
    if (concurrent[0]) return { acknowledgmentId: concurrent[0].id, duplicate: true };
    throw error;
  }
  const acknowledgmentId = Number(inserted[0]?.insertId ?? 0);
  await recordEvent(row.link.id, actorUserId, "acknowledgment_requested", { familyShareId, acknowledgmentId });
  if (row.link.familyParticipantUserId) await createNotification(row.link.familyParticipantUserId, "family", "Family acknowledgment requested", "A member has asked you to acknowledge that you are aware of a shared potential match. This does not approve or change any member decision.", "/family", `family-acknowledgment:${acknowledgmentId}`);
  return { acknowledgmentId, duplicate: false };
}

export async function respondToFamilyAcknowledgment(userId: number, acknowledgmentId: number, response: "acknowledged" | "declined") {
  const db = await requireDb();
  const rows = await db.select({ acknowledgment: familyAcknowledgments, share: familyShares, link: familyLinks }).from(familyAcknowledgments).innerJoin(familyShares, eq(familyAcknowledgments.familyShareId, familyShares.id)).innerJoin(familyLinks, eq(familyShares.familyLinkId, familyLinks.id)).where(and(eq(familyAcknowledgments.id, acknowledgmentId), eq(familyAcknowledgments.status, "requested"), eq(familyShares.status, "active"), eq(familyLinks.familyParticipantUserId, userId), inArray(familyLinks.status, activeParticipantStatuses))).limit(1);
  const row = rows[0];
  if (!row) throw new Error("Acknowledgment request is unavailable");
  const responded = await db.update(familyAcknowledgments).set({ status: response, respondedAt: new Date() }).where(and(eq(familyAcknowledgments.id, acknowledgmentId), eq(familyAcknowledgments.status, "requested")));
  if (!Number((responded[0] as { affectedRows?: number } | undefined)?.affectedRows ?? 0)) throw new Error("Acknowledgment request is unavailable");
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
  await db.select({ id: familyLinks.id }).from(familyLinks).where(eq(familyLinks.id, row.link.id)).for("update");
  const existing = await db.select({ id: familyFeedback.id }).from(familyFeedback).where(and(eq(familyFeedback.familyShareId, familyShareId), eq(familyFeedback.familyLinkId, row.link.id))).limit(1);
  if (existing[0]) return { feedbackId: existing[0].id, duplicate: true };
  let inserted;
  try { inserted = await db.insert(familyFeedback).values({ familyShareId, familyLinkId: row.link.id, response, note: normalizeOptionalUserText(note) || null }); } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    const concurrent = await db.select({ id: familyFeedback.id }).from(familyFeedback).where(and(eq(familyFeedback.familyShareId, familyShareId), eq(familyFeedback.familyLinkId, row.link.id))).limit(1);
    if (concurrent[0]) return { feedbackId: concurrent[0].id, duplicate: true };
    throw error;
  }
  const feedbackId = Number(inserted[0]?.insertId ?? 0);
  await recordEvent(row.link.id, userId, "feedback_submitted", { familyShareId, feedbackId, response });
  const owner = await memberUserId(row.link.memberProfileId);
  if (owner) await createNotification(owner, "family", "Family feedback received", `${row.link.contactName} shared Family Circle feedback. It is advisory and does not change your match or communication access.`, "/app/family", `family-feedback:${feedbackId}`);
  return { feedbackId, duplicate: false };
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
	      city: null,
	      country: null,
	      locationDisplay: granted.has("profile_basics") && ownerProfile ? safeLocationDisplay({ visibility: ownerProfile.locationVisibility, detail: ownerProfile.locationDetailLevel, countryName: ownerProfile.country, region: ownerProfile.region, city: ownerProfile.city, relationship: "family" }) : null,
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
	      city: null,
	      country: null,
	      locationDisplay: granted.has("potential_match") ? safeLocationDisplay({ visibility: profile.locationVisibility, detail: profile.locationDetailLevel, countryName: profile.country, region: profile.region, city: profile.city, relationship: "family" }) : null,
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
