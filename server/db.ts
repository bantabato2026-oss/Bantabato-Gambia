import { and, desc, eq, inArray, isNull, ne, or } from "drizzle-orm";
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

export async function requireFreshMemberAuthentication(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [user] = await db.select({ lastSignedIn: users.lastSignedIn }).from(users).where(eq(users.id, userId)).limit(1);
  if (!hasFreshSuccessStoryAuthentication(user?.lastSignedIn)) {
    throw new Error("For your privacy, sign out and sign back in before submitting a story for public editorial review.");
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

function coreProfileIsComplete(profile: Pick<typeof memberProfiles.$inferSelect, "displayName" | "birthDate" | "gender" | "country" | "maritalStatus">) {
  return Boolean(profile.displayName && profile.birthDate && profile.gender && profile.country && profile.maritalStatus);
}

export async function getMemberEligibility(profileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [profile] = await db.select().from(memberProfiles).where(eq(memberProfiles.id, profileId)).limit(1);
  if (!profile) throw new Error("Your profile is unavailable");
  const [photos, verifications] = await Promise.all([
    db.select({ reviewStatus: profilePhotos.reviewStatus }).from(profilePhotos).where(and(eq(profilePhotos.profileId, profileId), eq(profilePhotos.photoPurpose, "profile"), isNull(profilePhotos.deletedAt))),
    db.select({ status: verificationRecords.status }).from(verificationRecords).where(and(eq(verificationRecords.profileId, profileId), eq(verificationRecords.verificationType, "identity_document"))).limit(10),
  ]);
  const approvedPhotoCount = photos.filter(photo => photo.reviewStatus === "approved").length;
  const verificationStatus = verifications.some(record => record.status === "approved") ? "approved" : verifications.some(record => ["submitted", "under_review", "escalated"].includes(record.status)) ? "pending_review" : verifications.some(record => record.status === "requires_resubmission") ? "retry_required" : verifications.some(record => record.status === "rejected") ? "rejected" : "not_started";
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
  const current = await getSuccessDeclaration(profileId);
  const publicStoryConsent = input.editorialAction === "submit_for_review";
  if (publicStoryConsent && !maySubmitSuccessStory({ publicStoryConsent, storySummary: input.storySummary })) throw new Error("Add a short story summary and explicit public consent before submitting for review.");
  if (input.publicPhotoId) {
    const [photo] = await db.select({ id: profilePhotos.id, reviewStatus: profilePhotos.reviewStatus }).from(profilePhotos).where(and(eq(profilePhotos.id, input.publicPhotoId), eq(profilePhotos.profileId, profileId), eq(profilePhotos.photoPurpose, "profile"), isNull(profilePhotos.deletedAt))).limit(1);
    if (!photo || photo.reviewStatus !== "approved" || !input.publicPhotoAuthorized) throw new Error("Only an approved photo that you separately authorize may be considered for a public story.");
  }
  const editorialStatus = publicStoryConsent ? "pending_review" : "private";
  const values = { outcome: input.outcome, sharingConsent: input.sharingConsent, status, editorialStatus, publicStoryConsent, publicConsentAt: publicStoryConsent ? now : null, storySummary: input.storySummary?.trim() || null, publicDisplayNameAuthorized: Boolean(input.publicDisplayNameAuthorized), publicPhotoId: input.publicPhotoId ?? null, publicPhotoAuthorized: Boolean(input.publicPhotoAuthorized && input.publicPhotoId), publicPhotoAuthorizedAt: input.publicPhotoId && input.publicPhotoAuthorized ? now : null, submittedAt: publicStoryConsent ? now : null, declaredAt: now, consentRecordedAt: input.sharingConsent ? now : null, withdrawnAt: null, reviewedByUserId: null, reviewedAt: null, reviewNote: null, publishedByUserId: null, publishedAt: null } as const;
  if (current) await db.update(memberSuccessDeclarations).set(values).where(eq(memberSuccessDeclarations.id, current.id));
  else await db.insert(memberSuccessDeclarations).values({ profileId, ...values });
  const declaration = await getSuccessDeclaration(profileId);
  await db.insert(auditLogs).values({ actorUserId, action: publicStoryConsent ? "member.success_story_submitted" : "member.success_declaration_saved", entityType: "member_success_declaration", entityId: String(declaration?.id ?? profileId), metadata: { outcome: input.outcome, sharingConsent: input.sharingConsent, editorialStatus, publicDisplayNameAuthorized: Boolean(input.publicDisplayNameAuthorized), publicPhotoAuthorized: Boolean(input.publicPhotoAuthorized && input.publicPhotoId) } });
  return declaration;
}

export async function withdrawSuccessDeclaration(profileId: number, actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const current = await getSuccessDeclaration(profileId);
  if (!current || current.status === "withdrawn") throw new Error("No active success declaration exists");
  const now = new Date();
  await db.update(memberSuccessDeclarations).set({ sharingConsent: false, status: "withdrawn", editorialStatus: "withdrawn", publicStoryConsent: false, publicConsentAt: null, publicDisplayNameAuthorized: false, publicPhotoId: null, publicPhotoAuthorized: false, publicPhotoAuthorizedAt: null, withdrawnAt: now, consentRecordedAt: null }).where(eq(memberSuccessDeclarations.id, current.id));
  await db.insert(auditLogs).values({ actorUserId, action: "member.success_declaration_withdrawn", entityType: "member_success_declaration", entityId: String(current.id), metadata: { status: "withdrawn", editorialStatus: "withdrawn" } });
  return getSuccessDeclaration(profileId);
}

export async function listSuccessStoryEditorialQueue() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: memberSuccessDeclarations.id, profileId: memberSuccessDeclarations.profileId, outcome: memberSuccessDeclarations.outcome, editorialStatus: memberSuccessDeclarations.editorialStatus, storySummary: memberSuccessDeclarations.storySummary, editorialCopy: memberSuccessDeclarations.editorialCopy, publicDisplayNameAuthorized: memberSuccessDeclarations.publicDisplayNameAuthorized, publicPhotoId: memberSuccessDeclarations.publicPhotoId, publicPhotoAuthorized: memberSuccessDeclarations.publicPhotoAuthorized, submittedAt: memberSuccessDeclarations.submittedAt, displayName: memberProfiles.displayName }).from(memberSuccessDeclarations).innerJoin(memberProfiles, eq(memberSuccessDeclarations.profileId, memberProfiles.id)).where(inArray(memberSuccessDeclarations.editorialStatus, ["pending_review", "approved"])).orderBy(memberSuccessDeclarations.submittedAt).limit(100);
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
  const [approval] = await db.select({ id: operationalApprovals.id }).from(operationalApprovals).where(and(eq(operationalApprovals.approvalType, "configuration_change"), eq(operationalApprovals.resourceType, "success_declaration_publication"), eq(operationalApprovals.resourceId, String(declarationId)), eq(operationalApprovals.status, "approved"))).limit(1);
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

export async function saveMemberProfile(userId: number, input: ProfileUpdate) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const normalizedInput = normalizeTextRecord(input);
  const current = await getProfileByUserId(userId);
  if (!current) {
    await db.insert(memberProfiles).values({ userId, ...normalizedInput });
  } else {
    await db.update(memberProfiles).set(normalizedInput).where(eq(memberProfiles.id, current.id));
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
  await db.insert(interestRequests).values({ senderProfileId, recipientProfileId, message: message || null });
  const recipient = await db.select({ userId: memberProfiles.userId }).from(memberProfiles).where(eq(memberProfiles.id, recipientProfileId)).limit(1);
  if (recipient[0]) await createNotification(recipient[0].userId, "interest", "A new introduction request", "Someone would like to be introduced to you.", "/app/matches", `interest:${senderProfileId}:${recipientProfileId}`);
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
  await db.update(interestRequests).set({ status: response, respondedAt: new Date() }).where(eq(interestRequests.id, interestId));
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

export async function submitIdentityVerification(profileId: number, documentType: "national_id" | "passport") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(verificationRecords).values({ profileId, verificationType: "identity_document", documentType, status: "submitted", submittedAt: new Date() });
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

export async function uploadProfilePhoto(profileId: number, dataUrl: string) {
  const { buffer, mimeType } = decodeUpload(dataUrl, ["image/jpeg", "image/png", "image/webp"], 8 * 1024 * 1024);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.transaction(async tx => {
    const existing = await tx.select({ id: profilePhotos.id }).from(profilePhotos).where(and(eq(profilePhotos.profileId, profileId), eq(profilePhotos.photoPurpose, "profile"), isNull(profilePhotos.deletedAt))).for("update");
    assertProfilePhotoCapacity(existing.length);
    const stored = await storagePut(`members/${profileId}/profile-photos/${randomUUID()}.${safeExtension(mimeType)}`, buffer, mimeType);
    await tx.insert(profilePhotos).values({ profileId, storageKey: stored.key, mimeType, photoPurpose: "profile", isPrimary: existing.length === 0, displayOrder: existing.length, reviewStatus: "pending" });
  });
  await synchronizeProfileEligibility(profileId);
  return { queuedForReview: true };
}

export async function listOwnProfilePhotos(profileId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: profilePhotos.id, reviewStatus: profilePhotos.reviewStatus, reviewNote: profilePhotos.reviewNote, reviewedAt: profilePhotos.reviewedAt, isPrimary: profilePhotos.isPrimary, displayOrder: profilePhotos.displayOrder, createdAt: profilePhotos.createdAt }).from(profilePhotos).where(and(eq(profilePhotos.profileId, profileId), eq(profilePhotos.photoPurpose, "profile"), isNull(profilePhotos.deletedAt))).orderBy(profilePhotos.displayOrder, profilePhotos.createdAt);
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

export async function uploadIdentityDocument(profileId: number, documentType: "national_id" | "passport", dataUrl: string) {
  const { buffer, mimeType } = decodeUpload(dataUrl, ["image/jpeg", "image/png", "application/pdf"], 10 * 1024 * 1024);
  const stored = await storagePut(`members/${profileId}/verification/identity.${safeExtension(mimeType)}`, buffer, mimeType);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(verificationRecords).values({ profileId, verificationType: "identity_document", documentType, documentStorageKey: stored.key, status: "submitted", submittedAt: new Date() });
  return { submitted: true };
}

export async function getVerificationSummary(profileId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: verificationRecords.id, verificationType: verificationRecords.verificationType, status: verificationRecords.status, documentType: verificationRecords.documentType, memberMessage: verificationRecords.memberMessage, submittedAt: verificationRecords.submittedAt, reviewedAt: verificationRecords.reviewedAt, createdAt: verificationRecords.createdAt }).from(verificationRecords).where(eq(verificationRecords.profileId, profileId)).orderBy(desc(verificationRecords.createdAt));
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

export async function createNotification(userId: number, notificationType: "interest" | "match" | "message" | "verification" | "safety" | "family" | "connection" | "recommendation" | "billing", title: string, body: string, actionPath?: string, eventKey?: string) {
  await emitLegacyNotification(userId, notificationType, title, body, actionPath, eventKey);
}

export async function createReport(reporterProfileId: number, input: { reportedProfileId?: number; conversationId?: number; messageId?: number; reason: "fake_profile" | "impersonation" | "scam" | "harassment" | "inappropriate_content" | "financial_solicitation" | "suspicious_behavior" | "safety_concern" | "other"; details?: string }) {
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
  const result = await db.insert(reports).values({ reporterProfileId, ...input, details: normalizeOptionalUserText(input.details), reportedProfileId }).$returningId();
  return { reportId: Number(result[0]?.id ?? 0) };
}

export async function blockProfile(blockerProfileId: number, blockedProfileId: number, reason?: string) {
  if (blockerProfileId === blockedProfileId) throw new Error("You cannot block your own profile");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const normalizedReason = normalizeOptionalUserText(reason);
  await db.insert(blocks).values({ blockerProfileId, blockedProfileId, reason: normalizedReason || null }).onDuplicateKeyUpdate({ set: { reason: normalizedReason || null } });
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
  const record = await db.select().from(verificationRecords).where(and(eq(verificationRecords.id, verificationId), eq(verificationRecords.verificationType, "identity_document"), inArray(verificationRecords.status, ["submitted", "under_review"]))).limit(1);
  if (!record[0]) throw new Error("This verification record is not awaiting review");
  await db.update(verificationRecords).set({ status: decision, reviewNotes: reviewNotes || null, reviewedByUserId: reviewerUserId, reviewedAt: new Date() }).where(eq(verificationRecords.id, verificationId));
  const profile = await db.select({ userId: memberProfiles.userId }).from(memberProfiles).where(eq(memberProfiles.id, record[0].profileId)).limit(1);
  if (profile[0]) await createNotification(profile[0].userId, "verification", decision === "approved" ? "Identity verification approved" : "Identity verification needs attention", decision === "approved" ? "Your identity-document review has been approved and your verified badge is now available." : "Your identity-document review was not approved. Review the feedback and submit an updated document when available.", "/app/verification", `verification:${verificationId}:${decision}`);
  await createAuditLog(reviewerUserId, `verification.${decision}`, "verification_record", String(verificationId), { reviewNotes: reviewNotes || null });
}

export type CurrentUser = User;
