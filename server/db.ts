import { and, desc, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
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
  messages,
  notifications,
  profileFieldVisibilities,
  profilePhotos,
  reports,
  type InsertUser,
  type User,
  users,
  verificationRecords,
} from "../drizzle/schema";
import { canonicalProfilePair } from "./domain/permissions";
import { routeTransactionalNotification } from "./domain/notificationDelivery";
import { storageGetSignedUrl, storagePut } from "./storage";
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
  const current = await getProfileByUserId(userId);
  const next = { ...(current ?? {}), ...input };
  const completedAt = next.displayName && next.birthDate && next.gender && next.country && next.maritalStatus ? current?.completedAt ?? new Date() : current?.completedAt;
  if (!current) {
    await db.insert(memberProfiles).values({ userId, ...input, completedAt });
  } else {
    await db.update(memberProfiles).set({ ...input, completedAt }).where(eq(memberProfiles.id, current.id));
  }
  return getProfileByUserId(userId);
}

export async function getProfileCompleteness(profileId: number) {
  const db = await getDb();
  if (!db) return { photoCount: 0, hasPreferences: false, completedRecommendedFields: 0, recommendedFieldCount: 8, suggestedNext: [] as string[] };
  const [photos, preferences, profiles] = await Promise.all([
    db
      .select({ id: profilePhotos.id })
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
  return { photoCount: photos.length, hasPreferences: Boolean(preferences[0]), completedRecommendedFields: recommended.filter(([, value]) => Boolean(value)).length, recommendedFieldCount: recommended.length, suggestedNext: recommended.filter(([, value]) => !value).map(([label]) => label) };
}

export async function getDiscoveryProfiles(viewerProfileId: number, filters?: {
  minAge?: number;
  maxAge?: number;
  religion?: "muslim" | "christian";
  residenceType?: "gambia" | "diaspora";
  country?: string;
  city?: string;
  tribe?: string;
  educationLevel?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [
    eq(memberProfiles.profileStatus, "active"),
    eq(memberProfiles.searchVisible, true),
    isNull(memberProfiles.deletedAt),
    ne(memberProfiles.id, viewerProfileId),
  ];
  if (filters?.religion) conditions.push(eq(memberProfiles.religion, filters.religion));
  if (filters?.residenceType) conditions.push(eq(memberProfiles.residenceType, filters.residenceType));
  if (filters?.country) conditions.push(eq(memberProfiles.country, filters.country));
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
  return profiles.filter(profile => {
    if (excludedIds.has(profile.id)) return false;
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
  const viewer = await db.select({ id: memberProfiles.id }).from(memberProfiles).where(and(eq(memberProfiles.id, viewerProfileId), eq(memberProfiles.profileStatus, "active"), isNull(memberProfiles.deletedAt))).limit(1);
  if (!viewer[0]) return undefined;
  const blocked = await db.select({ id: blocks.id }).from(blocks).where(or(and(eq(blocks.blockerProfileId, viewerProfileId), eq(blocks.blockedProfileId, targetProfileId)), and(eq(blocks.blockerProfileId, targetProfileId), eq(blocks.blockedProfileId, viewerProfileId)))).limit(1);
  if (blocked[0]) return undefined;
  const profile = await db.select().from(memberProfiles).where(and(eq(memberProfiles.id, targetProfileId), eq(memberProfiles.profileStatus, "active"), ne(memberProfiles.profileVisibility, "hidden"), isNull(memberProfiles.deletedAt))).limit(1);
  if (!profile[0]) return undefined;
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
    country: maySee("country") ? profile[0].country : null,
    region: maySee("region") ? profile[0].region : null,
    city: maySee("city") ? profile[0].city : null,
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
  return { buffer, mimeType };
}

function safeExtension(mimeType: string) {
  return ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" } as Record<string, string>)[mimeType] ?? "bin";
}

export async function uploadProfilePhoto(profileId: number, dataUrl: string) {
  const { buffer, mimeType } = decodeUpload(dataUrl, ["image/jpeg", "image/png", "image/webp"], 8 * 1024 * 1024);
  const stored = await storagePut(`members/${profileId}/profile-photos/photo.${safeExtension(mimeType)}`, buffer, mimeType);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(profilePhotos).values({ profileId, storageKey: stored.key, mimeType, photoPurpose: "profile", reviewStatus: "pending" });
  return { key: stored.key };
}

export async function listOwnProfilePhotos(profileId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: profilePhotos.id, reviewStatus: profilePhotos.reviewStatus, isPrimary: profilePhotos.isPrimary, displayOrder: profilePhotos.displayOrder, createdAt: profilePhotos.createdAt }).from(profilePhotos).where(and(eq(profilePhotos.profileId, profileId), eq(profilePhotos.photoPurpose, "profile"), isNull(profilePhotos.deletedAt))).orderBy(profilePhotos.displayOrder, profilePhotos.createdAt);
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
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values({ userId, notificationType, title, body, actionPath, eventKey: eventKey ?? null }).onDuplicateKeyUpdate({ set: { title, body, actionPath } });
  await routeTransactionalNotification({ recipientUserId: userId, notificationType, subject: title, body, actionPath });
}

export async function createReport(reporterProfileId: number, input: { reportedProfileId?: number; conversationId?: number; messageId?: number; reason: "fake_profile" | "impersonation" | "scam" | "harassment" | "inappropriate_content" | "financial_solicitation" | "suspicious_behavior" | "safety_concern" | "other"; details?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(reports).values({ reporterProfileId, ...input });
}

export async function blockProfile(blockerProfileId: number, blockedProfileId: number, reason?: string) {
  if (blockerProfileId === blockedProfileId) throw new Error("You cannot block your own profile");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(blocks).values({ blockerProfileId, blockedProfileId, reason: reason || null }).onDuplicateKeyUpdate({ set: { reason: reason || null } });
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
