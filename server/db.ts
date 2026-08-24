import { and, desc, eq, gt, inArray, isNull, lt, ne, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { randomUUID } from "node:crypto";
import {
  auditLogs,
  blocks,
  conversations,
  conversationEvents,
  familyLinks,
  interestRequests,
  matches,
  memberPreferences,
  memberProfiles,
  memberSecuritySessions,
  memberSuccessDeclarations,
  messages,
  notifications,
  operationalApprovals,
  profileFieldVisibilities,
  profilePhotos,
  reports,
  type InsertUser,
  type User,
  users,
  verificationRecords,
} from "../drizzle/schema";
import { canonicalProfilePair } from "./domain/permissions";
import { safeLocationDisplay } from "./domain/internationalPolicy";
import { emitLegacyNotification } from "./notificationService";
import { storageGetSignedUrl, storagePut } from "./storage";
import { assertExpectedFileSignature } from "./fileValidation";
import { normalizeOptionalUserText, normalizeTextRecord } from "./inputSecurity";
import { resolveAuthorizedReportTarget } from "./domain/reportAccessPolicy";
import { hasFreshSuccessStoryAuthentication, mayPublishSuccessStory, maySubmitSuccessStory, resolveSuccessDeclarationStatus, validateEditorialCopy } from "./domain/successDeclarationPolicy";
import { approvedPhotoProgress, assertProfilePhotoCapacity } from "./domain/profilePhotoPolicy";
import { deriveMemberEligibility, desiredProfileStatusForEligibility } from "./domain/memberEligibilityPolicy";
import { ENV } from "./_core/env";
import { SESSION_MAX_AGE_MS } from "../shared/const";
import { memberSessionIsUsable } from "./domain/memberSessionPolicy";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: new Date() };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function observeMemberSecuritySession(userId: number, sessionReferenceHash: string | undefined, expiresAt?: Date) {
  if (!sessionReferenceHash) return null;
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = new Date();
  const safeExpiresAt = expiresAt && expiresAt > now ? expiresAt : new Date(now.getTime() + SESSION_MAX_AGE_MS);
  await db.insert(memberSecuritySessions).values({ userId, sessionReferenceHash, expiresAt: safeExpiresAt, lastSeenAt: now, reauthenticatedAt: now }).onDuplicateKeyUpdate({ set: { lastSeenAt: now } });
  const [session] = await db.select().from(memberSecuritySessions).where(and(eq(memberSecuritySessions.userId, userId), eq(memberSecuritySessions.sessionReferenceHash, sessionReferenceHash))).limit(1);
  if (!session) throw new Error("This session is unavailable. Please sign in again.");
  if (!memberSessionIsUsable(session.status, session.expiresAt, now)) {
    if (session.status === "revoked") throw new Error("This session is no longer active. Please sign in again.");
    if (session.status === "active") await db.update(memberSecuritySessions).set({ status: "expired", updatedAt: now }).where(eq(memberSecuritySessions.id, session.id));
    throw new Error("This session has expired. Please sign in again.");
  }
  return session;
}

export async function markExpiredMemberSecuritySessions(userId: number) {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  await db.update(memberSecuritySessions).set({ status: "expired", updatedAt: now }).where(and(eq(memberSecuritySessions.userId, userId), eq(memberSecuritySessions.status, "active"), lt(memberSecuritySessions.expiresAt, now)));
}

export async function requireFreshMemberAuthentication(userId: number, sessionReferenceHash?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (sessionReferenceHash) {
    const [session] = await db.select({ status: memberSecuritySessions.status, expiresAt: memberSecuritySessions.expiresAt, reauthenticatedAt: memberSecuritySessions.reauthenticatedAt }).from(memberSecuritySessions).where(and(eq(memberSecuritySessions.userId, userId), eq(memberSecuritySessions.sessionReferenceHash, sessionReferenceHash))).limit(1);
    if (!session || session.status !== "active" || session.expiresAt <= new Date() || !hasFreshSuccessStoryAuthentication(session.reauthenticatedAt)) throw new Error("For your privacy, sign out and sign back in before this sensitive account action.");
    return;
  }
  const [user] = await db.select({ lastSignedIn: users.lastSignedIn }).from(users).where(eq(users.id, userId)).limit(1);
  if (!hasFreshSuccessStoryAuthentication(user?.lastSignedIn)) {
    throw new Error("For your privacy, sign out and sign back in before this sensitive account action.");
  }
}

export async function getProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(memberProfiles)
    .where(and(eq(memberProfiles.userId, userId), isNull(memberProfiles.deletedAt)))
    .limit(1);
  return result[0];
}

export const MIN_MEMBER_AGE = 18;
export const MAX_MEMBER_AGE = 60;

function ageOnCurrentDate(birthDate: Date, today = new Date()) {
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const hasHadBirthday = today.getUTCMonth() > birthDate.getUTCMonth() || (today.getUTCMonth() === birthDate.getUTCMonth() && today.getUTCDate() >= birthDate.getUTCDate());
  if (!hasHadBirthday) age -= 1;
  return age;
}

export function meetsMemberAgeRequirement(birthDate: Date | null | undefined, today = new Date()) {
  if (!birthDate || Number.isNaN(birthDate.getTime())) return false;
  const age = ageOnCurrentDate(birthDate, today);
  return age >= MIN_MEMBER_AGE && age <= MAX_MEMBER_AGE;
}

function assertMemberAgeRequirement(birthDate: Date) {
  if (!meetsMemberAgeRequirement(birthDate)) throw new Error(`Members must be between ${MIN_MEMBER_AGE} and ${MAX_MEMBER_AGE} years old to create a profile.`);
}

function coreProfileIsComplete(profile: Pick<typeof memberProfiles.$inferSelect, "displayName" | "birthDate" | "gender" | "country" | "maritalStatus">) {
  return Boolean(profile.displayName && meetsMemberAgeRequirement(profile.birthDate) && profile.gender && profile.country && profile.maritalStatus);
}

export async function getMemberEligibility(profileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [profile] = await db.select().from(memberProfiles).where(eq(memberProfiles.id, profileId)).limit(1);
  if (!profile) throw new Error("Your profile is unavailable");
  const [photos, verifications] = await Promise.all([
    db.select({ reviewStatus: profilePhotos.reviewStatus }).from(profilePhotos).where(and(eq(profilePhotos.profileId, profileId), eq(profilePhotos.photoPurpose, "profile"), isNull(profilePhotos.deletedAt))),
    db.select({ status: verificationRecords.status }).from(verificationRecords).where(and(eq(verificationRecords.profileId, profileId), eq(verificationRecords.verificationType, "identity_document"))).orderBy(desc(verificationRecords.createdAt)).limit(1),
  ]);
  const approvedPhotoCount = photos.filter(photo => photo.reviewStatus === "approved").length;
  const latestVerificationStatus = verifications[0]?.status;
  const verificationStatus = latestVerificationStatus === "approved" ? "approved" : ["submitted", "under_review", "escalated"].includes(latestVerificationStatus ?? "") ? "pending_review" : ["requires_resubmission", "expired", "restricted"].includes(latestVerificationStatus ?? "") ? "retry_required" : latestVerificationStatus === "rejected" ? "rejected" : "not_started";
  return deriveMemberEligibility({ profileStatus: profile.profileStatus, searchVisible: profile.searchVisible, deletedAt: profile.deletedAt, coreProfileComplete: coreProfileIsComplete(profile), approvedPhotoCount, verificationStatus });
}

export async function synchronizeProfileEligibility(profileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [profile] = await db.select().from(memberProfiles).where(eq(memberProfiles.id, profileId)).limit(1);
  if (!profile) throw new Error("Your profile is unavailable");
  const eligibility = await getMemberEligibility(profileId);
  const desiredStatus = desiredProfileStatusForEligibility({ profileStatus: profile.profileStatus, coreProfileComplete: coreProfileIsComplete(profile), approvedPhotoCount: eligibility.approvedPhotoCount });
  const completedAt = eligibility.profileComplete ? profile.completedAt ?? new Date() : null;
  if (profile.profileStatus !== desiredStatus || profile.completedAt?.getTime() !== completedAt?.getTime()) {
    await db.update(memberProfiles).set({ profileStatus: desiredStatus, completedAt }).where(eq(memberProfiles.id, profileId));
  }
  return getMemberEligibility(profileId);
}

export async function getSuccessDeclaration(profileId: number) {
  const db = await getDb();
  if (!db) return null;
  const records = await db.select().from(memberSuccessDeclarations).where(eq(memberSuccessDeclarations.profileId, profileId)).limit(1);
  return records[0] ?? null;
}

export async function saveSuccessDeclaration(profileId: number, actorUserId: number, input: { outcome: "engaged" | "married"; sharingConsent: boolean; editorialAction?: "save_private" | "submit_for_review"; storySummary?: string; publicDisplayNameAuthorized?: boolean; publicPhotoId?: number | null; publicPhotoAuthorized?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = new Date();
  const status = resolveSuccessDeclarationStatus(input.sharingConsent);
  const publicStoryConsent = input.editorialAction === "submit_for_review";
  if (publicStoryConsent && !maySubmitSuccessStory({ publicStoryConsent, storySummary: input.storySummary })) throw new Error("Add a short story summary and explicit public consent before submitting for review.");
  if (input.publicPhotoId) {
    const [photo] = await db.select({ id: profilePhotos.id, reviewStatus: profilePhotos.reviewStatus }).from(profilePhotos).where(and(eq(profilePhotos.id, input.publicPhotoId), eq(profilePhotos.profileId, profileId), eq(profilePhotos.photoPurpose, "profile"), isNull(profilePhotos.deletedAt))).limit(1);
    if (!photo || photo.reviewStatus !== "approved" || !input.publicPhotoAuthorized) throw new Error("Only an approved photo that you separately authorize may be considered for a public story.");
  }
  const editorialStatus = publicStoryConsent ? "pending_review" : "private";
  const values = { outcome: input.outcome, sharingConsent: input.sharingConsent, status, editorialStatus, publicStoryConsent, publicConsentAt: publicStoryConsent ? now : null, storySummary: input.storySummary?.trim() || null, publicDisplayNameAuthorized: Boolean(input.publicDisplayNameAuthorized), publicPhotoId: input.publicPhotoId ?? null, publicPhotoAuthorized: Boolean(input.publicPhotoAuthorized && input.publicPhotoId), publicPhotoAuthorizedAt: input.publicPhotoId && input.publicPhotoAuthorized ? now : null, submittedAt: publicStoryConsent ? now : null, declaredAt: now, consentRecordedAt: input.sharingConsent ? now : null, withdrawnAt: null, reviewedByUserId: null, reviewedAt: null, reviewNote: null, publishedByUserId: null, publishedAt: null } as const;
  const declaration = await db.transaction(async tx => {
    await tx.select({ id: memberProfiles.id }).from(memberProfiles).where(eq(memberProfiles.id, profileId)).for("update");
    const [current] = await tx.select().from(memberSuccessDeclarations).where(eq(memberSuccessDeclarations.profileId, profileId)).limit(1);
    if (current) await tx.update(memberSuccessDeclarations).set(values).where(eq(memberSuccessDeclarations.id, current.id));
    else await tx.insert(memberSuccessDeclarations).values({ profileId, ...values });
    const [saved] = await tx.select().from(memberSuccessDeclarations).where(eq(memberSuccessDeclarations.profileId, profileId)).limit(1);
    return saved ?? null;
  });
  await db.insert(auditLogs).values({ actorUserId, action: publicStoryConsent ? "member.success_story_submitted" : "member.success_declaration_saved", entityType: "member_success_declaration", entityId: String(declaration?.id ?? profileId), metadata: { outcome: input.outcome, sharingConsent: input.sharingConsent, editorialStatus, publicDisplayNameAuthorized: Boolean(input.publicDisplayNameAuthorized), publicPhotoAuthorized: Boolean(input.publicPhotoAuthorized && input.publicPhotoId) } });
  return declaration;
}

export async function withdrawSuccessDeclaration(profileId: number, actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = new Date();
  const current = await db.transaction(async tx => {
    await tx.select({ id: memberProfiles.id }).from(memberProfiles).where(eq(memberProfiles.id, profileId)).for("update");
    const [active] = await tx.select().from(memberSuccessDeclarations).where(eq(memberSuccessDeclarations.profileId, profileId)).limit(1);
    if (!active || active.status === "withdrawn") throw new Error("No active success declaration exists");
    await tx.update(memberSuccessDeclarations).set({ sharingConsent: false, status: "withdrawn", editorialStatus: "withdrawn", publicStoryConsent: false, publicConsentAt: null, publicDisplayNameAuthorized: false, publicPhotoId: null, publicPhotoAuthorized: false, publicPhotoAuthorizedAt: null, withdrawnAt: now, consentRecordedAt: null }).where(eq(memberSuccessDeclarations.id, active.id));
    return active;
  });
  await db.insert(auditLogs).values({ actorUserId, action: "member.success_declaration_withdrawn", entityType: "member_success_declaration", entityId: String(current.id), metadata: { status: "withdrawn", editorialStatus: "withdrawn" } });
  return getSuccessDeclaration(profileId);
}

export async function listSuccessStoryEditorialQueue() {
  const db = await getDb();
  if (!db) return [];
  const stories = await db.select({ id: memberSuccessDeclarations.id, profileId: memberSuccessDeclarations.profileId, outcome: memberSuccessDeclarations.outcome, editorialStatus: memberSuccessDeclarations.editorialStatus, storySummary: memberSuccessDeclarations.storySummary, editorialCopy: memberSuccessDeclarations.editorialCopy, publicDisplayNameAuthorized: memberSuccessDeclarations.publicDisplayNameAuthorized, publicPhotoId: memberSuccessDeclarations.publicPhotoId, publicPhotoAuthorized: memberSuccessDeclarations.publicPhotoAuthorized, submittedAt: memberSuccessDeclarations.submittedAt, displayName: memberProfiles.displayName }).from(memberSuccessDeclarations).innerJoin(memberProfiles, eq(memberSuccessDeclarations.profileId, memberProfiles.id)).where(inArray(memberSuccessDeclarations.editorialStatus, ["pending_review", "approved"])).orderBy(memberSuccessDeclarations.submittedAt).limit(100);
  if (!stories.length) return [];
  const approvals = await db.select({ resourceId: operationalApprovals.resourceId, status: operationalApprovals.status, expiresAt: operationalApprovals.expiresAt, createdAt: operationalApprovals.createdAt }).from(operationalApprovals).where(and(eq(operationalApprovals.approvalType, "configuration_change"), eq(operationalApprovals.resourceType, "success_declaration_publication"), inArray(operationalApprovals.resourceId, stories.map(story => String(story.id))))).orderBy(desc(operationalApprovals.createdAt));
  const now = new Date();
  const approvalByStory = new Map(approvals.map(approval => [approval.resourceId, approval]));
  return stories.map(story => {
    const approval = approvalByStory.get(String(story.id));
    const publicationApprovalStatus = !approval ? "not_requested" : approval.expiresAt <= now ? "expired" : approval.status;
    return { ...story, publicationApprovalStatus };
  });
}

export async function reviewSuccessStory(actorUserId: number, declarationId: number, decision: "approved" | "rejected", reviewNote?: string, editorialCopy?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [declaration] = await db.select().from(memberSuccessDeclarations).where(and(eq(memberSuccessDeclarations.id, declarationId), eq(memberSuccessDeclarations.editorialStatus, "pending_review"), eq(memberSuccessDeclarations.publicStoryConsent, true))).limit(1);
  if (!declaration) throw new Error("This success-story submission is not awaiting editorial review");
  const approvedCopy = decision === "approved" ? validateEditorialCopy(editorialCopy ?? "") : null;
  await db.update(memberSuccessDeclarations).set({ editorialStatus: decision, editorialCopy: approvedCopy, reviewedByUserId: actorUserId, reviewedAt: new Date(), reviewNote: reviewNote || null }).where(eq(memberSuccessDeclarations.id, declarationId));
  await createAuditLog(actorUserId, `success_story.${decision}`, "member_success_declaration", String(declarationId), { profileId: declaration.profileId, reviewNote: reviewNote || null, editorialCopyLength: approvedCopy?.length ?? 0 });
  return { decision };
}

export async function publishSuccessStory(actorUserId: number, declarationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [declaration] = await db.select().from(memberSuccessDeclarations).where(eq(memberSuccessDeclarations.id, declarationId)).limit(1);
  if (!declaration || !declaration.editorialCopy || !mayPublishSuccessStory({ editorialStatus: declaration.editorialStatus, publicStoryConsent: declaration.publicStoryConsent, publicPhotoAuthorized: declaration.publicPhotoAuthorized, publicPhotoId: declaration.publicPhotoId, independentApprovalGranted: false })) throw new Error("This story is not ready for publication");
  const [approval] = await db.select({ id: operationalApprovals.id }).from(operationalApprovals).where(and(eq(operationalApprovals.approvalType, "configuration_change"), eq(operationalApprovals.resourceType, "success_declaration_publication"), eq(operationalApprovals.resourceId, String(declarationId)), eq(operationalApprovals.status, "approved"), gt(operationalApprovals.expiresAt, new Date()))).limit(1);
  if (!approval || !mayPublishSuccessStory({ editorialStatus: declaration.editorialStatus, publicStoryConsent: declaration.publicStoryConsent, publicPhotoAuthorized: declaration.publicPhotoAuthorized, publicPhotoId: declaration.publicPhotoId, independentApprovalGranted: true })) throw new Error("Independent publication approval is required before this story can be published");
  await db.update(memberSuccessDeclarations).set({ editorialStatus: "published", publishedByUserId: actorUserId, publishedAt: new Date() }).where(eq(memberSuccessDeclarations.id, declarationId));
  await createAuditLog(actorUserId, "success_story.published", "member_success_declaration", String(declarationId), { approvalId: approval.id });
  return { published: true };
}

export async function listPublishedSuccessStories() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ outcome: memberSuccessDeclarations.outcome, editorialCopy: memberSuccessDeclarations.editorialCopy, publicDisplayNameAuthorized: memberSuccessDeclarations.publicDisplayNameAuthorized, displayName: memberProfiles.displayName, publishedAt: memberSuccessDeclarations.publishedAt }).from(memberSuccessDeclarations).innerJoin(memberProfiles, eq(memberSuccessDeclarations.profileId, memberProfiles.id)).where(and(eq(memberSuccessDeclarations.editorialStatus, "published"), eq(memberSuccessDeclarations.publicStoryConsent, true), isNull(memberSuccessDeclarations.withdrawnAt))).orderBy(desc(memberSuccessDeclarations.publishedAt)).limit(24);
  return rows.filter(row => Boolean(row.editorialCopy)).map(row => ({ outcome: row.outcome, story: row.editorialCopy!, displayName: row.publicDisplayNameAuthorized ? row.displayName : null, publishedAt: row.publishedAt }));
}

export type ProfileUpdate = Partial<{
  firstName: string;
  displayName: string;
  birthDate: Date;
  gender: "woman" | "man" | "self_described";
  religion: "muslim" | "christian";
  practiceLevel: string;
  ethnicity: string;
  tribe: string;
  residenceType: "gambia" | "diaspora";
  country: string;
  region: string;
  city: string;
  nationality: string;
  languages: string[];
  maritalStatus: "never_married" | "married" | "divorced" | "widowed";
  educationLevel: string;
  educationField: string;
  educationInstitution: string;
  profession: string;
  employmentStatus: "employed" | "self_employed" | "student" | "seeking_work" | "retired" | "prefer_not_to_say";
  industry: string;
  personality: string;
  interests: string[];
  hobbies: string[];
  marriageTimeline: string;
  marriageIntent: string;
  marriageExpectations: string;
  reasonSeekingMarriage: string;
  relocationWillingness: "open" | "within_gambia" | "not_open" | "discuss";
  polygynyOpenness: "open" | "not_open" | "discuss" | "not_applicable";
  hasChildren: boolean;
  desireChildren: "yes" | "no" | "open" | "private";
  familyInvolvementPreference: "active" | "limited" | "optional" | "private";
  smokingPreference: "no" | "occasionally" | "yes" | "private";
  alcoholPreference: "no" | "occasionally" | "yes" | "private";
  about: string;
  familyBackground: string;
  lifestyle: string;
  values: string;
  importantPrinciples: string;
  profileVisibility: "public" | "members_only" | "hidden";
  photoVisibility: "public" | "mutual_match" | "hidden";
  searchVisible: boolean;
  familyVisibility: "private" | "matches" | "visible";
}>;

export async function saveMemberProfile(userId: number, input: ProfileUpdate, expectedUpdatedAt?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (input.birthDate) assertMemberAgeRequirement(input.birthDate);
  const normalizedInput = normalizeTextRecord(input);
  const current = await getProfileByUserId(userId);
  if (!current) {
    if (expectedUpdatedAt) throw new Error("Your profile changed before this save. Refresh it and review your current details before trying again.");
    await db.insert(memberProfiles).values({ userId, ...normalizedInput });
  } else {
    if (expectedUpdatedAt && current.updatedAt.getTime() !== expectedUpdatedAt.getTime()) throw new Error("Your profile changed before this save. Refresh it and review your current details before trying again.");
    const values = { ...normalizedInput, updatedAt: new Date() };
    const updated = await db.update(memberProfiles).set(values).where(expectedUpdatedAt ? and(eq(memberProfiles.id, current.id), eq(memberProfiles.updatedAt, expectedUpdatedAt)) : eq(memberProfiles.id, current.id));
    if (expectedUpdatedAt && Number((updated as { affectedRows?: unknown } | undefined)?.affectedRows ?? 1) === 0) throw new Error("Your profile changed before this save. Refresh it and review your current details before trying again.");
  }
  const saved = await getProfileByUserId(userId);
  if (saved) await synchronizeProfileEligibility(saved.id);
  return getProfileByUserId(userId);
}

export async function getProfileCompleteness(profileId: number) {
  const db = await getDb();
  if (!db) return { photoCount: 0, approvedPhotoCount: 0, pendingPhotoCount: 0, rejectedPhotoCount: 0, hasPreferences: false, completedRecommendedFields: 0, recommendedFieldCount: 8, suggestedNext: [] as string[] };
  const [photos, preferences, profiles] = await Promise.all([
    db
      .select({ id: profilePhotos.id, reviewStatus: profilePhotos.reviewStatus })
      .from(profilePhotos)
      .where(and(eq(profilePhotos.profileId, profileId), eq(profilePhotos.photoPurpose, "profile"), isNull(profilePhotos.deletedAt))),
    db.select({ id: memberPreferences.id }).from(memberPreferences).where(eq(memberPreferences.profileId, profileId)).limit(1),
    db.select().from(memberProfiles).where(eq(memberProfiles.id, profileId)).limit(1),
  ]);
  const profile = profiles[0];
  const recommended = [
    ["About you", profile?.about],
    ["Marriage intention", profile?.marriageIntent],
    ["Marriage timeline", profile?.marriageTimeline],
    ["Education or career", profile?.educationLevel || profile?.profession],
    ["Location", profile?.country],
    ["Values", profile?.values],
    ["Lifestyle", profile?.lifestyle],
    ["Compatibility preferences", preferences[0]],
  ];
  const approvedPhotoCount = photos.filter(photo => photo.reviewStatus === "approved").length;
  const pendingPhotoCount = photos.filter(photo => photo.reviewStatus === "pending").length;
  const rejectedPhotoCount = photos.filter(photo => photo.reviewStatus === "rejected").length;
  return { photoCount: photos.length, approvedPhotoCount, pendingPhotoCount, rejectedPhotoCount, photoProgress: approvedPhotoProgress(approvedPhotoCount), hasPreferences: Boolean(preferences[0]), completedRecommendedFields: recommended.filter(([, value]) => Boolean(value)).length, recommendedFieldCount: recommended.length, suggestedNext: recommended.filter(([, value]) => !value).map(([label]) => label) };
}

export async function getDiscoveryProfiles(viewerProfileId: number, filters?: {
  minAge?: number;
  maxAge?: number;
  religion?: "muslim" | "christian";
	  residenceType?: "gambia" | "diaspora";
	  country?: string;
	  residenceCountryId?: number;
	  city?: string;
  tribe?: string;
  educationLevel?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  const viewerEligibility = await getMemberEligibility(viewerProfileId);
  if (!viewerEligibility.discoveryEligible) throw new Error(`${viewerEligibility.title} ${viewerEligibility.detail}`);
  const conditions = [
    eq(memberProfiles.profileStatus, "active"),
    eq(memberProfiles.searchVisible, true),
    isNull(memberProfiles.deletedAt),
    ne(memberProfiles.id, viewerProfileId),
  ];
  if (filters?.religion) conditions.push(eq(memberProfiles.religion, filters.religion));
	  if (filters?.residenceType) conditions.push(eq(memberProfiles.residenceType, filters.residenceType));
	  if (filters?.country) conditions.push(eq(memberProfiles.country, filters.country));
	  if (filters?.residenceCountryId) conditions.push(eq(memberProfiles.residenceCountryId, filters.residenceCountryId));
  if (filters?.city) conditions.push(eq(memberProfiles.city, filters.city));
  if (filters?.tribe) conditions.push(eq(memberProfiles.tribe, filters.tribe));
  if (filters?.educationLevel) conditions.push(eq(memberProfiles.educationLevel, filters.educationLevel));

  const blocked = await db
    .select({ blockerProfileId: blocks.blockerProfileId, blockedProfileId: blocks.blockedProfileId })
    .from(blocks)
    .where(or(eq(blocks.blockerProfileId, viewerProfileId), eq(blocks.blockedProfileId, viewerProfileId)));
  const excludedIds = new Set(blocked.map(block => block.blockerProfileId === viewerProfileId ? block.blockedProfileId : block.blockerProfileId));

  const profiles = await db
    .select({
      id: memberProfiles.id,
      displayName: memberProfiles.displayName,
      birthDate: memberProfiles.birthDate,
      religion: memberProfiles.religion,
      practiceLevel: memberProfiles.practiceLevel,
      tribe: memberProfiles.tribe,
	    residenceType: memberProfiles.residenceType,
	    country: memberProfiles.country,
	    residenceCountryId: memberProfiles.residenceCountryId,
      city: memberProfiles.city,
      educationLevel: memberProfiles.educationLevel,
      profession: memberProfiles.profession,
      marriageTimeline: memberProfiles.marriageTimeline,
      relocationWillingness: memberProfiles.relocationWillingness,
      photoVisibility: memberProfiles.photoVisibility,
    })
    .from(memberProfiles)
    .where(and(...conditions))
    .orderBy(desc(memberProfiles.updatedAt))
    .limit(40);

  const calculateAge = (birthDate: Date | string | null) => {
    if (!birthDate) return undefined;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const beforeBirthday = today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
    if (beforeBirthday) age -= 1;
    return age;
  };
  const candidateEligibility = await Promise.all(profiles.map(async profile => ({ id: profile.id, eligibility: await getMemberEligibility(profile.id) })));
  const eligibleIds = new Set(candidateEligibility.filter(candidate => candidate.eligibility.discoveryEligible).map(candidate => candidate.id));
  return profiles.filter(profile => {
    if (excludedIds.has(profile.id)) return false;
    if (!eligibleIds.has(profile.id)) return false;
    const age = calculateAge(profile.birthDate);
    if (filters?.minAge !== undefined && (age === undefined || age < filters.minAge)) return false;
    if (filters?.maxAge !== undefined && (age === undefined || age > filters.maxAge)) return false;
    return true;
  });
}

export async function getProfileForMember(viewerProfileId: number, targetProfileId: number) {
  const db = await getDb();
  if (!db) return undefined;
  if (viewerProfileId === targetProfileId) return undefined;
  const viewerEligibility = await getMemberEligibility(viewerProfileId);
  if (!viewerEligibility.discoveryEligible) return undefined;
  const viewer = await db.select({ id: memberProfiles.id }).from(memberProfiles).where(and(eq(memberProfiles.id, viewerProfileId), eq(memberProfiles.profileStatus, "active"), isNull(memberProfiles.deletedAt))).limit(1);
  if (!viewer[0]) return undefined;
  const blocked = await db.select({ id: blocks.id }).from(blocks).where(or(and(eq(blocks.blockerProfileId, viewerProfileId), eq(blocks.blockedProfileId, targetProfileId)), and(eq(blocks.blockerProfileId, targetProfileId), eq(blocks.blockedProfileId, viewerProfileId)))).limit(1);
  if (blocked[0]) return undefined;
  const profile = await db.select().from(memberProfiles).where(and(eq(memberProfiles.id, targetProfileId), eq(memberProfiles.profileStatus, "active"), ne(memberProfiles.profileVisibility, "hidden"), isNull(memberProfiles.deletedAt))).limit(1);
  if (!profile[0] || !(await getMemberEligibility(targetProfileId)).discoveryEligible) return undefined;
  const pair = canonicalProfilePair(viewerProfileId, targetProfileId);
  const mutualMatch = await db
    .select({ id: matches.id })
    .from(matches)
    .where(and(eq(matches.memberOneProfileId, pair.memberOneProfileId), eq(matches.memberTwoProfileId, pair.memberTwoProfileId), eq(matches.status, "active")))
    .limit(1);
  const hasMutualMatch = Boolean(mutualMatch[0]);
  const [fieldVisibilities, viewerVerification, targetVerification] = await Promise.all([
    db.select({ fieldKey: profileFieldVisibilities.fieldKey, audience: profileFieldVisibilities.audience }).from(profileFieldVisibilities).where(eq(profileFieldVisibilities.profileId, targetProfileId)),
    db.select({ id: verificationRecords.id }).from(verificationRecords).where(and(eq(verificationRecords.profileId, viewerProfileId), eq(verificationRecords.verificationType, "identity_document"), eq(verificationRecords.status, "approved"))).limit(1),
    db.select({ id: verificationRecords.id }).from(verificationRecords).where(and(eq(verificationRecords.profileId, targetProfileId), eq(verificationRecords.verificationType, "identity_document"), eq(verificationRecords.status, "approved"))).limit(1),
  ]);
  const visibility = new Map(fieldVisibilities.map(field => [field.fieldKey, field.audience]));
  const maySee = (field: string, defaultAudience: "potential_matches" | "private" = "potential_matches") => {
    const audience = visibility.get(field) ?? defaultAudience;
    return audience === "public" || audience === "potential_matches" || (audience === "verified_members" && Boolean(viewerVerification[0])) || (audience === "matched_members" && hasMutualMatch);
  };
  const maySeeFamilyBackground = (profile[0].familyVisibility === "visible" || (profile[0].familyVisibility === "matches" && hasMutualMatch)) && maySee("familyBackground", "private");
  const locationRelationship = hasMutualMatch ? "matched" as const : "eligible" as const;
  const hasLocationAudience = maySee("country") && (profile[0].locationVisibility === "eligible_members" || (profile[0].locationVisibility === "matches_only" && hasMutualMatch));
  const locationDisplay = hasLocationAudience ? safeLocationDisplay({ visibility: profile[0].locationVisibility, detail: profile[0].locationDetailLevel, countryName: profile[0].country, region: profile[0].region, city: profile[0].city, relationship: locationRelationship }) : null;
  const maySeeRegion = hasLocationAudience && ["region", "city"].includes(profile[0].locationDetailLevel);
  const maySeeCity = hasLocationAudience && profile[0].locationDetailLevel === "city";
  return {
    id: profile[0].id,
    displayName: profile[0].displayName,
    photoVisibility: profile[0].photoVisibility,
    residenceType: profile[0].residenceType,
    hasMutualMatch,
    identityVerified: Boolean(targetVerification[0]),
    religion: maySee("religion") ? profile[0].religion : null,
    practiceLevel: maySee("practiceLevel") ? profile[0].practiceLevel : null,
    ethnicity: maySee("ethnicity", "private") ? profile[0].ethnicity : null,
    tribe: maySee("tribe", "private") ? profile[0].tribe : null,
    country: hasLocationAudience ? profile[0].country : null,
    region: maySeeRegion && maySee("region") ? profile[0].region : null,
    city: maySeeCity && maySee("city") ? profile[0].city : null,
    locationDisplay,
    languages: maySee("languages") ? profile[0].languages : null,
    maritalStatus: maySee("maritalStatus") ? profile[0].maritalStatus : null,
    educationLevel: maySee("educationLevel") ? profile[0].educationLevel : null,
    educationField: maySee("educationField") ? profile[0].educationField : null,
    profession: maySee("profession") ? profile[0].profession : null,
    employmentStatus: maySee("employmentStatus") ? profile[0].employmentStatus : null,
    industry: maySee("industry") ? profile[0].industry : null,
    about: maySee("about") ? profile[0].about : null,
    personality: maySee("personality") ? profile[0].personality : null,
    interests: maySee("interests") ? profile[0].interests : null,
    hobbies: maySee("hobbies") ? profile[0].hobbies : null,
    marriageTimeline: maySee("marriageTimeline") ? profile[0].marriageTimeline : null,
    marriageIntent: maySee("marriageIntent") ? profile[0].marriageIntent : null,
    marriageExpectations: maySee("marriageExpectations") ? profile[0].marriageExpectations : null,
    relocationWillingness: maySee("relocationWillingness") ? profile[0].relocationWillingness : null,
    polygynyOpenness: maySee("polygynyOpenness") ? profile[0].polygynyOpenness : null,
    hasChildren: maySee("hasChildren") ? profile[0].hasChildren : null,
    desireChildren: maySee("desireChildren") ? profile[0].desireChildren : null,
    familyInvolvementPreference: maySee("familyInvolvementPreference") ? profile[0].familyInvolvementPreference : null,
    lifestyle: maySee("lifestyle") ? profile[0].lifestyle : null,
    values: maySee("values") ? profile[0].values : null,
    importantPrinciples: maySee("importantPrinciples") ? profile[0].importantPrinciples : null,
    familyBackground: maySeeFamilyBackground ? profile[0].familyBackground : null,
  };
}

export async function createInterest(senderProfileId: number, recipientProfileId: number, message?: string) {
  if (senderProfileId === recipientProfileId) throw new Error("You cannot express interest in your own profile");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [senderEligibility, recipientEligibility] = await Promise.all([getMemberEligibility(senderProfileId), getMemberEligibility(recipientProfileId)]);
  if (!senderEligibility.discoveryEligible) throw new Error(`${senderEligibility.title} ${senderEligibility.detail}`);
  if (!recipientEligibility.discoveryEligible) throw new Error("This introduction is unavailable");
  const blocked = await db
    .select({ id: blocks.id })
    .from(blocks)
    .where(
      or(
        and(eq(blocks.blockerProfileId, senderProfileId), eq(blocks.blockedProfileId, recipientProfileId)),
        and(eq(blocks.blockerProfileId, recipientProfileId), eq(blocks.blockedProfileId, senderProfileId)),
      ),
    )
    .limit(1);
  if (blocked[0]) throw new Error("This interaction is unavailable");
  const recipientProfile = await db.select({ id: memberProfiles.id }).from(memberProfiles).where(and(eq(memberProfiles.id, recipientProfileId), eq(memberProfiles.profileStatus, "active"), eq(memberProfiles.searchVisible, true), ne(memberProfiles.profileVisibility, "hidden"), isNull(memberProfiles.deletedAt))).limit(1);
  if (!recipientProfile[0]) throw new Error("This introduction is unavailable");
  const existing = (await db.select().from(interestRequests).where(and(eq(interestRequests.senderProfileId, senderProfileId), eq(interestRequests.recipientProfileId, recipientProfileId))).limit(1))[0];
  if (existing?.status === "pending") return { interestId: existing.id, state: "pending" as const, duplicate: true };
  if (existing?.status === "accepted") return { interestId: existing.id, state: "accepted" as const, duplicate: true };
  if (existing?.status === "declined") throw new Error("This introduction is not available for another request.");
  if (existing?.status === "withdrawn") {
    const update = await db.update(interestRequests).set({ status: "pending", message: message || null, respondedAt: null }).where(and(eq(interestRequests.id, existing.id), eq(interestRequests.status, "withdrawn")));
    const summary = Array.isArray(update) ? update[0] : update;
    if (typeof (summary as { affectedRows?: unknown } | undefined)?.affectedRows === "number" && (summary as { affectedRows: number }).affectedRows === 0) return { interestId: existing.id, state: "pending" as const, duplicate: true };
    const recipient = await db.select({ userId: memberProfiles.userId }).from(memberProfiles).where(eq(memberProfiles.id, recipientProfileId)).limit(1);
    if (recipient[0]) await createNotification(recipient[0].userId, "interest", "A renewed introduction request", "Someone would like to be introduced to you. Review it on your own terms.", "/app/matches", `interest-renewed:${existing.id}`);
    return { interestId: existing.id, state: "pending" as const, duplicate: false };
  }
  let interestId: number | undefined;
  try {
    const result = await db.insert(interestRequests).values({ senderProfileId, recipientProfileId, message: message || null });
    interestId = Number(result[0]?.insertId ?? 0) || undefined;
  } catch (error) {
    const concurrent = (await db.select().from(interestRequests).where(and(eq(interestRequests.senderProfileId, senderProfileId), eq(interestRequests.recipientProfileId, recipientProfileId))).limit(1))[0];
    if (concurrent?.status === "pending" || concurrent?.status === "accepted") return { interestId: concurrent.id, state: concurrent.status, duplicate: true };
    throw error;
  }
  const recipient = await db.select({ userId: memberProfiles.userId }).from(memberProfiles).where(eq(memberProfiles.id, recipientProfileId)).limit(1);
  if (recipient[0]) await createNotification(recipient[0].userId, "interest", "A new introduction request", "Someone would like to be introduced to you.", "/app/matches", `interest:${senderProfileId}:${recipientProfileId}`);
  return { interestId: interestId ?? 0, state: "pending" as const, duplicate: false };
}

export async function respondToInterest(recipientProfileId: number, interestId: number, response: "accepted" | "declined") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const request = await db
    .select()
    .from(interestRequests)
    .where(and(eq(interestRequests.id, interestId), eq(interestRequests.recipientProfileId, recipientProfileId), eq(interestRequests.status, "pending")))
    .limit(1);
  if (!request[0]) throw new Error("Interest request is no longer available");
  const update = await db.update(interestRequests).set({ status: response, respondedAt: new Date() }).where(and(eq(interestRequests.id, interestId), eq(interestRequests.status, "pending")));
  const summary = Array.isArray(update) ? update[0] : update;
  if (typeof (summary as { affectedRows?: unknown } | undefined)?.affectedRows === "number" && (summary as { affectedRows: number }).affectedRows === 0) throw new Error("Interest request is no longer available");
  if (response === "declined") return { matched: false };

  const pair = canonicalProfilePair(request[0].senderProfileId, recipientProfileId);
  const result = await db.insert(matches).values(pair).onDuplicateKeyUpdate({ set: { status: "active", closedAt: null } });
  const matchId = Number(result[0].insertId) || (await db.select({ id: matches.id }).from(matches).where(and(eq(matches.memberOneProfileId, pair.memberOneProfileId), eq(matches.memberTwoProfileId, pair.memberTwoProfileId))).limit(1))[0]?.id;
  if (!matchId) throw new Error("Unable to establish a match");
  const conversationResult = await db.insert(conversations).values({ matchId, status: "active", mutualInterestAt: new Date(), lastActivityAt: new Date() }).onDuplicateKeyUpdate({ set: { status: "active", mutualInterestAt: new Date(), lastActivityAt: new Date() } });
  const conversationId = Number(conversationResult[0].insertId) || (await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.matchId, matchId)).limit(1))[0]?.id;
  if (conversationId) await db.insert(conversationEvents).values({ conversationId, actorProfileId: recipientProfileId, eventType: "mutual_interest" });
  const sender = await db.select({ userId: memberProfiles.userId }).from(memberProfiles).where(eq(memberProfiles.id, request[0].senderProfileId)).limit(1);
  if (sender[0]) await createNotification(sender[0].userId, "match", "Your introduction was accepted", "You can now begin a private conversation together.", "/app/messages", `match:${matchId}:sender`);
  const recipient = await db.select({ userId: memberProfiles.userId }).from(memberProfiles).where(eq(memberProfiles.id, recipientProfileId)).limit(1);
  if (recipient[0]) await createNotification(recipient[0].userId, "match", "You have a new mutual match", "You can now begin a private conversation together.", "/app/messages", `match:${matchId}:recipient`);
  return { matched: true, matchId };
}

export async function withdrawInterest(profileId: number, interestId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const request = (await db.select().from(interestRequests).where(and(eq(interestRequests.id, interestId), eq(interestRequests.senderProfileId, profileId), eq(interestRequests.status, "pending"))).limit(1))[0];
  if (!request) throw new Error("This introduction request is no longer available");
  const update = await db.update(interestRequests).set({ status: "withdrawn", respondedAt: new Date() }).where(and(eq(interestRequests.id, interestId), eq(interestRequests.senderProfileId, profileId), eq(interestRequests.status, "pending")));
  const summary = Array.isArray(update) ? update[0] : update;
  if (typeof (summary as { affectedRows?: unknown } | undefined)?.affectedRows === "number" && (summary as { affectedRows: number }).affectedRows === 0) throw new Error("This introduction request is no longer available");
  const recipient = (await db.select({ userId: memberProfiles.userId }).from(memberProfiles).where(eq(memberProfiles.id, request.recipientProfileId)).limit(1))[0];
  if (recipient) await createNotification(recipient.userId, "interest", "An introduction request was withdrawn", "The sender withdrew their pending introduction request.", "/app/matches", `interest-withdrawn:${interestId}`);
  return { withdrawn: true };
}

export async function getInterestConnectionState(profileId: number, targetProfileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const pair = canonicalProfilePair(profileId, targetProfileId);
  const match = (await db.select().from(matches).where(and(eq(matches.memberOneProfileId, pair.memberOneProfileId), eq(matches.memberTwoProfileId, pair.memberTwoProfileId), eq(matches.status, "active"))).limit(1))[0];
  if (match) {
    const conversation = (await db.select({ id: conversations.id, status: conversations.status }).from(conversations).where(eq(conversations.matchId, match.id)).limit(1))[0];
    return { state: conversation?.status === "active" ? "communication_available" as const : "mutual_connection" as const, interestId: null, conversationId: conversation?.id ?? null };
  }
  const outgoing = (await db.select({ id: interestRequests.id, status: interestRequests.status }).from(interestRequests).where(and(eq(interestRequests.senderProfileId, profileId), eq(interestRequests.recipientProfileId, targetProfileId))).limit(1))[0];
  if (outgoing?.status === "pending") return { state: "interest_sent" as const, interestId: outgoing.id, conversationId: null };
  if (outgoing?.status === "declined") return { state: "interest_declined" as const, interestId: outgoing.id, conversationId: null };
  const incoming = (await db.select({ id: interestRequests.id }).from(interestRequests).where(and(eq(interestRequests.senderProfileId, targetProfileId), eq(interestRequests.recipientProfileId, profileId), eq(interestRequests.status, "pending"))).limit(1))[0];
  if (incoming) return { state: "interest_received" as const, interestId: incoming.id, conversationId: null };
  return { state: "not_connected" as const, interestId: null, conversationId: null };
}

export async function getMatchesForProfile(profileId: number) {
  const db = await getDb();
  if (!db) return [];
  const linkedMatches = await db
    .select()
    .from(matches)
    .where(and(or(eq(matches.memberOneProfileId, profileId), eq(matches.memberTwoProfileId, profileId)), eq(matches.status, "active")))
    .orderBy(desc(matches.matchedAt));
  if (!linkedMatches.length) return [];
  const otherIds = linkedMatches.map(match => match.memberOneProfileId === profileId ? match.memberTwoProfileId : match.memberOneProfileId);
  const profiles = await db.select({ id: memberProfiles.id, displayName: memberProfiles.displayName, religion: memberProfiles.religion, city: memberProfiles.city, country: memberProfiles.country, profession: memberProfiles.profession }).from(memberProfiles).where(inArray(memberProfiles.id, otherIds));
  const profilesById = new Map(profiles.map(profile => [profile.id, profile]));
  return linkedMatches.map(match => ({ ...match, otherProfile: profilesById.get(match.memberOneProfileId === profileId ? match.memberTwoProfileId : match.memberOneProfileId) }));
}

export async function getConversationsForProfile(profileId: number) {
  const db = await getDb();
  if (!db) return [];
  const profileMatches = await getMatchesForProfile(profileId);
  if (!profileMatches.length) return [];
  const matchIds = profileMatches.map(match => match.id);
  const records = await db.select().from(conversations).where(inArray(conversations.matchId, matchIds)).orderBy(desc(conversations.lastMessageAt));
  const matchesById = new Map(profileMatches.map(match => [match.id, match]));
  return records.map(record => ({ ...record, match: matchesById.get(record.matchId) }));
}

export async function getMessagesForProfile(profileId: number, conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  const conversation = await getConversationAccess(profileId, conversationId);
  if (!conversation) throw new Error("Conversation is unavailable");
  return db.select().from(messages).where(and(eq(messages.conversationId, conversationId), isNull(messages.deletedAt))).orderBy(messages.createdAt);
}

export async function sendTextMessage(profileId: number, conversationId: number, body: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const conversation = await getConversationAccess(profileId, conversationId);
  if (!conversation) throw new Error("Conversation is unavailable");
  await db.insert(messages).values({ conversationId, senderProfileId: profileId, messageType: "text", body });
  await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, conversationId));
  const otherProfileId = conversation.match.memberOneProfileId === profileId ? conversation.match.memberTwoProfileId : conversation.match.memberOneProfileId;
  const recipient = await db.select({ userId: memberProfiles.userId }).from(memberProfiles).where(eq(memberProfiles.id, otherProfileId)).limit(1);
  if (recipient[0]) await createNotification(recipient[0].userId, "message", "New message from a match", "You have received a new message in a private conversation.", `/app/messages/${conversationId}`, `message:${conversationId}:${Date.now()}`);
}

async function getConversationAccess(profileId: number, conversationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const record = await db.select().from(conversations).where(and(eq(conversations.id, conversationId), eq(conversations.status, "active"))).limit(1);
  if (!record[0]) return undefined;
  const match = await db.select().from(matches).where(and(eq(matches.id, record[0].matchId), eq(matches.status, "active"))).limit(1);
  if (!match[0] || (match[0].memberOneProfileId !== profileId && match[0].memberTwoProfileId !== profileId)) return undefined;
  const otherProfileId = match[0].memberOneProfileId === profileId ? match[0].memberTwoProfileId : match[0].memberOneProfileId;
  const blocked = await db.select({ id: blocks.id }).from(blocks).where(or(and(eq(blocks.blockerProfileId, profileId), eq(blocks.blockedProfileId, otherProfileId)), and(eq(blocks.blockerProfileId, otherProfileId), eq(blocks.blockedProfileId, profileId)))).limit(1);
  if (blocked[0]) return undefined;
  return { conversation: record[0], match: match[0] };
}

export async function listIncomingInterests(profileId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(interestRequests).where(and(eq(interestRequests.recipientProfileId, profileId), eq(interestRequests.status, "pending"))).orderBy(desc(interestRequests.createdAt));
}

export async function listOutgoingInterests(profileId: number) {
  const db = await getDb();
  if (!db) return [];
  const requests = await db.select().from(interestRequests).where(eq(interestRequests.senderProfileId, profileId)).orderBy(desc(interestRequests.createdAt)).limit(100);
  if (!requests.length) return [];
  const recipients = await db.select({ id: memberProfiles.id, displayName: memberProfiles.displayName }).from(memberProfiles).where(inArray(memberProfiles.id, requests.map(request => request.recipientProfileId)));
  const byId = new Map(recipients.map(recipient => [recipient.id, recipient]));
  return requests.map(request => ({ ...request, recipient: byId.get(request.recipientProfileId) ?? null }));
}

export async function upsertFamilyLink(profileId: number, input: { relationship: "parent" | "wali_guardian"; contactName: string; contactEmail?: string; contactPhone?: string; canReceiveMatchNotifications: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(familyLinks).values({ memberProfileId: profileId, ...input, status: "invited", invitedAt: new Date() });
  const profile = await db.select({ userId: memberProfiles.userId }).from(memberProfiles).where(eq(memberProfiles.id, profileId)).limit(1);
  if (profile[0]) await createAuditLog(profile[0].userId, "family_link.invited", "family_link", undefined, { relationship: input.relationship, canReceiveMatchNotifications: input.canReceiveMatchNotifications });
}

export async function listFamilyLinks(profileId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(familyLinks).where(eq(familyLinks.memberProfileId, profileId)).orderBy(desc(familyLinks.createdAt));
}

function decodeUpload(dataUrl: string, allowedMimeTypes: string[], maxBytes: number) {
  const matches = /^data:([^;]+);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!matches) throw new Error("The upload format is invalid");
  const [, mimeType, encoded] = matches;
  if (!allowedMimeTypes.includes(mimeType)) throw new Error("This file type is not allowed");
  const buffer = Buffer.from(encoded, "base64");
  if (!buffer.length || buffer.length > maxBytes) throw new Error("This file is empty or exceeds the permitted size");
  assertExpectedFileSignature(buffer, mimeType);
  return { buffer, mimeType };
}

function safeExtension(mimeType: string) {
  return ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" } as Record<string, string>)[mimeType] ?? "bin";
}

export async function uploadProfilePhoto(profileId: number, dataUrl: string, expectedPhotoCount?: number) {
  const { buffer, mimeType } = decodeUpload(dataUrl, ["image/jpeg", "image/png", "image/webp"], 8 * 1024 * 1024);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.transaction(async tx => {
    const existing = await tx.select({ id: profilePhotos.id }).from(profilePhotos).where(and(eq(profilePhotos.profileId, profileId), eq(profilePhotos.photoPurpose, "profile"), isNull(profilePhotos.deletedAt))).for("update");
    if (expectedPhotoCount !== undefined && existing.length !== expectedPhotoCount) throw new Error("Your photo list changed before this upload. Refresh the page and review your current private photo status before trying again.");
    assertProfilePhotoCapacity(existing.length);
    const stored = await storagePut(`members/${profileId}/profile-photos/${randomUUID()}.${safeExtension(mimeType)}`, buffer, mimeType);
    await tx.insert(profilePhotos).values({ profileId, storageKey: stored.key, mimeType, photoPurpose: "profile", isPrimary: existing.length === 0, displayOrder: existing.length, reviewStatus: "pending" });
  });
  await synchronizeProfileEligibility(profileId);
  return { queuedForReview: true };
}

/** Removes a member-owned profile photo from normal access and frees a private upload slot; it never alters review history or invents approval. */
export async function removeOwnProfilePhoto(profileId: number, photoId: number, expectedUpdatedAt?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [photo] = await db.select({ id: profilePhotos.id, reviewStatus: profilePhotos.reviewStatus, updatedAt: profilePhotos.updatedAt }).from(profilePhotos).where(and(eq(profilePhotos.id, photoId), eq(profilePhotos.profileId, profileId), eq(profilePhotos.photoPurpose, "profile"), isNull(profilePhotos.deletedAt))).limit(1);
  if (!photo) throw new Error("This profile photo is unavailable.");
  if (expectedUpdatedAt && photo.updatedAt.getTime() !== expectedUpdatedAt.getTime()) throw new Error("This photo changed before removal. Refresh the page and review its current private status before trying again.");
  const updated = await db.update(profilePhotos).set({ deletedAt: new Date() }).where(expectedUpdatedAt ? and(eq(profilePhotos.id, photo.id), eq(profilePhotos.updatedAt, expectedUpdatedAt), isNull(profilePhotos.deletedAt)) : and(eq(profilePhotos.id, photo.id), isNull(profilePhotos.deletedAt)));
  if (expectedUpdatedAt && Number((updated as { affectedRows?: unknown } | undefined)?.affectedRows ?? 1) === 0) throw new Error("This photo changed before removal. Refresh the page and review its current private status before trying again.");
  const eligibility = await synchronizeProfileEligibility(profileId);
  await createAuditLog(null, "profile_photo.withdrawn", "profile_photo", String(photo.id), { profileId, previousReviewStatus: photo.reviewStatus, approvedPhotoCount: eligibility.approvedPhotoCount });
  return { photoId: photo.id, eligibility };
}

export async function listOwnProfilePhotos(profileId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: profilePhotos.id, reviewStatus: profilePhotos.reviewStatus, reviewNote: profilePhotos.reviewNote, reviewedAt: profilePhotos.reviewedAt, isPrimary: profilePhotos.isPrimary, displayOrder: profilePhotos.displayOrder, createdAt: profilePhotos.createdAt, updatedAt: profilePhotos.updatedAt }).from(profilePhotos).where(and(eq(profilePhotos.profileId, profileId), eq(profilePhotos.photoPurpose, "profile"), isNull(profilePhotos.deletedAt))).orderBy(profilePhotos.displayOrder, profilePhotos.createdAt);
}

export async function listProfilePhotoReviewQueue() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ photoId: profilePhotos.id, profileId: profilePhotos.profileId, displayName: memberProfiles.displayName, reviewStatus: profilePhotos.reviewStatus, createdAt: profilePhotos.createdAt }).from(profilePhotos).innerJoin(memberProfiles, eq(profilePhotos.profileId, memberProfiles.id)).where(and(eq(profilePhotos.photoPurpose, "profile"), eq(profilePhotos.reviewStatus, "pending"), isNull(profilePhotos.deletedAt))).orderBy(profilePhotos.createdAt).limit(100);
}

export async function getProfilePhotoForReview(actorUserId: number, photoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [photo] = await db.select({ id: profilePhotos.id, profileId: profilePhotos.profileId, storageKey: profilePhotos.storageKey, reviewStatus: profilePhotos.reviewStatus }).from(profilePhotos).where(and(eq(profilePhotos.id, photoId), eq(profilePhotos.photoPurpose, "profile"), isNull(profilePhotos.deletedAt))).limit(1);
  if (!photo) throw new Error("This profile photo is unavailable for review");
  await createAuditLog(actorUserId, "profile_photo.review_accessed", "profile_photo", String(photo.id), { profileId: photo.profileId });
  return { photoId: photo.id, profileId: photo.profileId, reviewStatus: photo.reviewStatus, reviewUrl: await storageGetSignedUrl(photo.storageKey) };
}

export async function reviewProfilePhoto(actorUserId: number, photoId: number, decision: "approved" | "rejected", reviewNote?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [photo] = await db.select({ id: profilePhotos.id, profileId: profilePhotos.profileId }).from(profilePhotos).where(and(eq(profilePhotos.id, photoId), eq(profilePhotos.photoPurpose, "profile"), eq(profilePhotos.reviewStatus, "pending"), isNull(profilePhotos.deletedAt))).limit(1);
  if (!photo) throw new Error("This profile photo is not awaiting review");
  const now = new Date();
  await db.update(profilePhotos).set({ reviewStatus: decision, reviewNote: reviewNote || null, reviewedByUserId: actorUserId, reviewedAt: now }).where(eq(profilePhotos.id, photoId));
  const eligibility = await synchronizeProfileEligibility(photo.profileId);
  const [member] = await db.select({ userId: memberProfiles.userId }).from(memberProfiles).where(eq(memberProfiles.id, photo.profileId)).limit(1);
  if (member) await createNotification(member.userId, "verification", decision === "approved" ? "A profile photo was approved" : "A profile photo needs attention", decision === "approved" ? eligibility.photosComplete ? "Your five approved-photo requirement is complete." : `You have ${eligibility.approvedPhotoCount} of 5 approved profile photos.` : "Review the feedback and upload a different photo when you are ready.", "/app/photos", `profile-photo:${photoId}:${decision}`);
  await createAuditLog(actorUserId, `profile_photo.${decision}`, "profile_photo", String(photoId), { profileId: photo.profileId, reviewNote: reviewNote || null, approvedPhotoCount: eligibility.approvedPhotoCount });
  return { decision, eligibility };
}

export async function uploadIdentityDocument(profileId: number, documentType: "national_id" | "passport", dataUrl: string, expectedLatestVerificationId?: number | null) {
  const { buffer, mimeType } = decodeUpload(dataUrl, ["image/jpeg", "image/png", "application/pdf"], 10 * 1024 * 1024);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.transaction(async tx => {
    const member = (await tx.select({ id: memberProfiles.id, userId: memberProfiles.userId }).from(memberProfiles).where(eq(memberProfiles.id, profileId)).for("update"))[0];
    if (!member) throw new Error("Your profile is unavailable");
    const latest = (await tx.select({ id: verificationRecords.id, status: verificationRecords.status }).from(verificationRecords).where(and(eq(verificationRecords.profileId, profileId), eq(verificationRecords.verificationType, "identity_document"))).orderBy(desc(verificationRecords.createdAt), desc(verificationRecords.id)).limit(1))[0];
    if (expectedLatestVerificationId !== undefined && (latest?.id ?? null) !== expectedLatestVerificationId) throw new Error("Your verification status changed before this submission. Refresh the page and review your current private status before trying again.");
    const open = await tx.select({ id: verificationRecords.id, status: verificationRecords.status }).from(verificationRecords).where(and(eq(verificationRecords.profileId, profileId), eq(verificationRecords.verificationType, "identity_document"), inArray(verificationRecords.status, ["submitted", "under_review", "escalated"]))).limit(1);
    if (open[0]) return { submitted: true, duplicate: true, status: open[0].status, verificationId: open[0].id, userId: member.userId };
    const stored = await storagePut(`members/${profileId}/verification/identity-${randomUUID()}.${safeExtension(mimeType)}`, buffer, mimeType);
    const inserted = await tx.insert(verificationRecords).values({ profileId, verificationType: "identity_document", documentType, documentStorageKey: stored.key, status: "submitted", submittedAt: new Date() }).$returningId();
    return { submitted: true, duplicate: false, status: "submitted" as const, verificationId: Number(inserted[0]?.id ?? 0), userId: member.userId };
  });
  if (!result.duplicate) {
    await createNotification(result.userId, "verification", "Verification submitted", "Your private identity document is ready for manual review.", "/app/verification", `verification:${result.verificationId}:submitted`, "verification_submission_received");
    await createAuditLog(result.userId, "verification.submitted", "verification_record", String(result.verificationId), { profileId, documentType, mimeType });
  }
  return { submitted: result.submitted, duplicate: result.duplicate, status: result.status, verificationId: result.verificationId };
}

export async function getVerificationSummary(profileId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: verificationRecords.id, verificationType: verificationRecords.verificationType, status: verificationRecords.status, documentType: verificationRecords.documentType, memberMessage: verificationRecords.memberMessage, submittedAt: verificationRecords.submittedAt, reviewedAt: verificationRecords.reviewedAt, createdAt: verificationRecords.createdAt, updatedAt: verificationRecords.updatedAt }).from(verificationRecords).where(eq(verificationRecords.profileId, profileId)).orderBy(desc(verificationRecords.createdAt));
}

export async function getNotificationsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50);
}

export async function markNotificationRead(userId: number, notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function createNotification(userId: number, notificationType: "interest" | "match" | "message" | "verification" | "safety" | "family" | "connection" | "recommendation" | "billing", title: string, body: string, actionPath?: string, eventKey?: string, eventTypeOverride?: string) {
  await emitLegacyNotification(userId, notificationType, title, body, actionPath, eventKey, eventTypeOverride);
}

export async function createReport(reporterProfileId: number, input: { reportedProfileId?: number; conversationId?: number; messageId?: number; reason: "fake_profile" | "impersonation" | "scam" | "harassment" | "inappropriate_content" | "financial_solicitation" | "suspicious_behavior" | "safety_concern" | "other"; details?: string; clientRequestId?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  let reportedProfileId = input.reportedProfileId;
  if (input.conversationId) {
    const conversation = (await db.select({ id: conversations.id, memberOneProfileId: matches.memberOneProfileId, memberTwoProfileId: matches.memberTwoProfileId })
      .from(conversations)
      .innerJoin(matches, eq(conversations.matchId, matches.id))
      .where(and(eq(conversations.id, input.conversationId), or(eq(matches.memberOneProfileId, reporterProfileId), eq(matches.memberTwoProfileId, reporterProfileId))))
      .limit(1))[0];
    reportedProfileId = resolveAuthorizedReportTarget({ reporterProfileId, requestedReportedProfileId: reportedProfileId, conversation });
  }
  reportedProfileId = resolveAuthorizedReportTarget({ reporterProfileId, requestedReportedProfileId: reportedProfileId });
  const target = (await db.select({ id: memberProfiles.id }).from(memberProfiles).where(and(eq(memberProfiles.id, reportedProfileId), isNull(memberProfiles.deletedAt))).limit(1))[0];
  if (!target) throw new Error("The selected member is unavailable for reporting");
  const clientRequestId = input.clientRequestId?.trim() || null;
  if (clientRequestId) {
    const existing = (await db.select({ id: reports.id, reportedProfileId: reports.reportedProfileId, conversationId: reports.conversationId, messageId: reports.messageId, reason: reports.reason }).from(reports).where(and(eq(reports.reporterProfileId, reporterProfileId), eq(reports.clientRequestId, clientRequestId))).limit(1))[0];
    if (existing) {
      if (existing.reportedProfileId !== reportedProfileId || existing.conversationId !== (input.conversationId ?? null) || existing.messageId !== (input.messageId ?? null) || existing.reason !== input.reason) throw new Error("This report retry key is already linked to a different concern. Please start a new report.");
      return { reportId: existing.id, duplicate: true };
    }
  }
  try {
    const result = await db.insert(reports).values({ reporterProfileId, reportedProfileId, conversationId: input.conversationId ?? null, messageId: input.messageId ?? null, reason: input.reason, details: normalizeOptionalUserText(input.details), clientRequestId }).$returningId();
    return { reportId: Number(result[0]?.id ?? 0), duplicate: false };
  } catch (error) {
    if (!clientRequestId) throw error;
    const recovered = (await db.select({ id: reports.id, reportedProfileId: reports.reportedProfileId, conversationId: reports.conversationId, messageId: reports.messageId, reason: reports.reason }).from(reports).where(and(eq(reports.reporterProfileId, reporterProfileId), eq(reports.clientRequestId, clientRequestId))).limit(1))[0];
    if (recovered && recovered.reportedProfileId === reportedProfileId && recovered.conversationId === (input.conversationId ?? null) && recovered.messageId === (input.messageId ?? null) && recovered.reason === input.reason) return { reportId: recovered.id, duplicate: true };
    throw error;
  }
}

export async function blockProfile(blockerProfileId: number, blockedProfileId: number, reason?: string) {
  if (blockerProfileId === blockedProfileId) throw new Error("You cannot block your own profile");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const normalizedReason = normalizeOptionalUserText(reason);
  await db.insert(blocks).values({ blockerProfileId, blockedProfileId, reason: normalizedReason || null }).onDuplicateKeyUpdate({ set: { reason: normalizedReason || null } });
}

export async function listBlockedProfiles(blockerProfileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select({ blockId: blocks.id, profileId: memberProfiles.id, displayName: memberProfiles.displayName, country: memberProfiles.country, createdAt: blocks.createdAt }).from(blocks).innerJoin(memberProfiles, eq(blocks.blockedProfileId, memberProfiles.id)).where(eq(blocks.blockerProfileId, blockerProfileId)).orderBy(desc(blocks.createdAt));
}

export async function unblockProfile(blockerProfileId: number, blockedProfileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.delete(blocks).where(and(eq(blocks.blockerProfileId, blockerProfileId), eq(blocks.blockedProfileId, blockedProfileId)));
  const summary = Array.isArray(result) ? result[0] : result;
  if (typeof (summary as { affectedRows?: unknown } | undefined)?.affectedRows === "number" && (summary as { affectedRows: number }).affectedRows === 0) throw new Error("This block is no longer active.");
  return { removed: true };
}

export async function createAuditLog(actorUserId: number | null, action: string, entityType: string, entityId?: string, metadata?: unknown) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values({ actorUserId, action, entityType, entityId: entityId ?? null, metadata: metadata ?? null });
}

export async function getAdminOverview() {
  const db = await getDb();
  if (!db) return { verificationQueue: [], reportsQueue: [] };
  const [verificationQueue, reportsQueue] = await Promise.all([
    db.select().from(verificationRecords).where(inArray(verificationRecords.status, ["submitted", "under_review"])).orderBy(verificationRecords.submittedAt).limit(20),
    db.select().from(reports).where(inArray(reports.status, ["open", "in_review"])).orderBy(reports.createdAt).limit(20),
  ]);
  return { verificationQueue, reportsQueue };
}

export async function getVerificationDocumentForReview(verificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const record = await db.select().from(verificationRecords).where(and(eq(verificationRecords.id, verificationId), eq(verificationRecords.verificationType, "identity_document"))).limit(1);
  if (!record[0]?.documentStorageKey) throw new Error("No verification document is available for this record");
  return { verificationId: record[0].id, documentType: record[0].documentType, status: record[0].status, reviewNotes: record[0].reviewNotes, documentUrl: await storageGetSignedUrl(record[0].documentStorageKey) };
}

export async function reviewIdentityVerification(reviewerUserId: number, verificationId: number, decision: "approved" | "rejected", reviewNotes?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const record = await db.select({ id: verificationRecords.id, profileId: verificationRecords.profileId, status: verificationRecords.status, updatedAt: verificationRecords.updatedAt }).from(verificationRecords).where(and(eq(verificationRecords.id, verificationId), eq(verificationRecords.verificationType, "identity_document"), inArray(verificationRecords.status, ["submitted", "under_review"]))).limit(1);
  if (!record[0]) throw new Error("This verification record is not awaiting review");
  const outcome = await db.update(verificationRecords).set({ status: decision, reviewNotes: reviewNotes || null, reviewedByUserId: reviewerUserId, reviewedAt: new Date() }).where(and(eq(verificationRecords.id, verificationId), eq(verificationRecords.status, record[0].status), eq(verificationRecords.updatedAt, record[0].updatedAt)));
  if (Number((outcome as { affectedRows?: unknown } | undefined)?.affectedRows ?? 1) === 0) throw new Error("This verification case changed before the decision was recorded. Refresh the case and try again.");
  await synchronizeProfileEligibility(record[0].profileId);
  const profile = await db.select({ userId: memberProfiles.userId }).from(memberProfiles).where(eq(memberProfiles.id, record[0].profileId)).limit(1);
  if (profile[0]) await createNotification(profile[0].userId, "verification", decision === "approved" ? "Identity verification approved" : "Identity verification needs attention", decision === "approved" ? "Your identity-document review has been approved and your verified badge is now available." : "Your identity-document review was not approved. Review the feedback and submit an updated document when available.", "/app/verification", `verification:${verificationId}:${decision}`, decision === "approved" ? "verification_completed" : "verification_changes_required");
  await createAuditLog(reviewerUserId, `verification.${decision}`, "verification_record", String(verificationId), { reviewNotes: reviewNotes || null });
}

export type CurrentUser = User;
