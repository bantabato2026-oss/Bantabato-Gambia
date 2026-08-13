import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import {
  blockProfile,
  createInterest,
  createReport,
  getAdminOverview,
  getConversationsForProfile,
  getDiscoveryProfiles,
  getMatchesForProfile,
  getMessagesForProfile,
  getNotificationsForUser,
  getProfileByUserId,
  getProfileCompleteness,
  getProfileForMember,
  getVerificationSummary,
  listFamilyLinks,
  listIncomingInterests,
  listOwnProfilePhotos,
  markNotificationRead,
  respondToInterest,
  saveMemberProfile,
  sendTextMessage,
  submitIdentityVerification,
  uploadIdentityDocument,
  uploadProfilePhoto,
  upsertFamilyLink,
  getVerificationDocumentForReview,
  reviewIdentityVerification,
} from "./db";
import { claimReportCase, claimVerificationCase, decideReportCase, decideVerificationCase, getActiveAdminScopes, getReportCase, getReportQueue, getScopedAdminOverview, getVerificationCase, getVerificationDocumentForAuthorizedReview, getVerificationQueue, requireOperationalScope } from "./operations";
import { getCompatibilityExplanation, getCompatibilityPreferences, getCuratedDiscovery, listProfileFieldVisibilities, saveCompatibilityPreferences, saveProfileFieldVisibilities } from "./compatibilityService";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const profileInput = z.object({
  firstName: z.string().max(80).optional(),
  displayName: z.string().min(2).max(80).optional(),
  birthDate: z.string().date().optional(),
  gender: z.enum(["woman", "man", "self_described"]).optional(),
  religion: z.enum(["muslim", "christian"]).optional(),
  practiceLevel: z.string().max(80).optional(),
  ethnicity: z.string().max(100).optional(),
  tribe: z.string().max(100).optional(),
  residenceType: z.enum(["gambia", "diaspora"]).optional(),
  country: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  nationality: z.string().max(100).optional(),
  languages: z.array(z.string().trim().min(1).max(60)).max(12).optional(),
  maritalStatus: z.enum(["never_married", "married", "divorced", "widowed"]).optional(),
  educationLevel: z.string().max(100).optional(),
  educationField: z.string().max(120).optional(),
  educationInstitution: z.string().max(160).optional(),
  profession: z.string().max(160).optional(),
  employmentStatus: z.enum(["employed", "self_employed", "student", "seeking_work", "retired", "prefer_not_to_say"]).optional(),
  industry: z.string().max(120).optional(),
  personality: z.string().max(1200).optional(),
  interests: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  hobbies: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  marriageTimeline: z.string().max(100).optional(),
  marriageIntent: z.string().max(255).optional(),
  marriageExpectations: z.string().max(1600).optional(),
  reasonSeekingMarriage: z.string().max(1200).optional(),
  relocationWillingness: z.enum(["open", "within_gambia", "not_open", "discuss"]).optional(),
  polygynyOpenness: z.enum(["open", "not_open", "discuss", "not_applicable"]).optional(),
  hasChildren: z.boolean().optional(),
  desireChildren: z.enum(["yes", "no", "open", "private"]).optional(),
  familyInvolvementPreference: z.enum(["active", "limited", "optional", "private"]).optional(),
  smokingPreference: z.enum(["no", "occasionally", "yes", "private"]).optional(),
  alcoholPreference: z.enum(["no", "occasionally", "yes", "private"]).optional(),
  about: z.string().max(2400).optional(),
  familyBackground: z.string().max(1200).optional(),
  lifestyle: z.string().max(1200).optional(),
  values: z.string().max(1600).optional(),
  importantPrinciples: z.string().max(1600).optional(),
  profileVisibility: z.enum(["public", "members_only", "hidden"]).optional(),
  photoVisibility: z.enum(["public", "mutual_match", "hidden"]).optional(),
  searchVisible: z.boolean().optional(),
  familyVisibility: z.enum(["private", "matches", "visible"]).optional(),
});

const preferenceInput = z.object({
  minAge: z.number().int().min(18).max(80).optional(), maxAge: z.number().int().min(18).max(80).optional(),
  preferredGenders: z.array(z.enum(["woman", "man", "self_described"])).max(3).optional(), preferredReligions: z.array(z.enum(["muslim", "christian"])).max(2).optional(), preferredLocations: z.array(z.string().trim().min(1).max(100)).max(12).optional(), preferredMaritalStatuses: z.array(z.enum(["never_married", "married", "divorced", "widowed"])).max(4).optional(),
  childrenPreference: z.enum(["open", "prefer_no_children", "open_to_children", "not_important"]).optional(), desiredChildrenPreference: z.enum(["yes", "no", "open", "not_important"]).optional(), preferredRelocation: z.array(z.enum(["open", "within_gambia", "not_open", "discuss"])).max(4).optional(), preferredEducationLevels: z.array(z.string().trim().min(1).max(100)).max(10).optional(), preferredMarriageTimelines: z.array(z.string().trim().min(1).max(100)).max(10).optional(), preferredPolygynyOpenness: z.array(z.enum(["open", "not_open", "discuss", "not_applicable"])).max(4).optional(), preferredFamilyInvolvement: z.array(z.enum(["active", "limited", "optional", "private"])).max(4).optional(), lifestylePreferences: z.array(z.enum(["no", "occasionally", "yes", "private"])).max(4).optional(), preferenceImportance: z.record(z.string(), z.enum(["required", "preferred", "neutral", "not_important"])).optional(), marriageIntent: z.string().max(1200).optional(), mustHaves: z.string().max(1200).optional(),
}).refine(input => input.minAge === undefined || input.maxAge === undefined || input.minAge <= input.maxAge, { message: "Minimum age cannot exceed maximum age." });

const fieldVisibilityInput = z.object({ fields: z.array(z.object({ fieldKey: z.enum(["religion", "practiceLevel", "ethnicity", "tribe", "country", "region", "city", "languages", "maritalStatus", "educationLevel", "educationField", "profession", "employmentStatus", "industry", "about", "personality", "interests", "hobbies", "marriageTimeline", "marriageIntent", "marriageExpectations", "relocationWillingness", "polygynyOpenness", "hasChildren", "desireChildren", "familyInvolvementPreference", "lifestyle", "values", "importantPrinciples", "familyBackground"]), audience: z.enum(["public", "verified_members", "potential_matches", "matched_members", "family_circle", "private", "admin_restricted"]) })).max(30) });

async function requireProfile(userId: number) {
  const profile = await getProfileByUserId(userId);
  if (!profile) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Please complete your profile before continuing." });
  return profile;
}

async function requireOperationalAccess(user: { id: number; role: string }, allowedScopes: Array<"verification_reviewer" | "trust_safety" | "support_agent" | "subscription_manager" | "platform_admin">) {
  if (user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Administrator access is required." });
  try {
    return await requireOperationalScope(user.id, allowedScopes);
  } catch {
    throw new TRPCError({ code: "FORBIDDEN", message: "Your operational role does not permit this action." });
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  profile: router({
    mine: protectedProcedure.query(async ({ ctx }) => {
      const profile = await getProfileByUserId(ctx.user.id);
      if (!profile) return null;
      const [completeness, verification] = await Promise.all([getProfileCompleteness(profile.id), getVerificationSummary(profile.id)]);
      return { ...profile, completeness, verification };
    }),
    save: protectedProcedure.input(profileInput).mutation(async ({ ctx, input }) =>
      saveMemberProfile(ctx.user.id, { ...input, birthDate: input.birthDate ? new Date(input.birthDate) : undefined }),
    ),
    view: protectedProcedure.input(z.object({ profileId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const viewer = await requireProfile(ctx.user.id);
      return getProfileForMember(viewer.id, input.profileId);
    }),
    fieldVisibilities: protectedProcedure.query(async ({ ctx }) => listProfileFieldVisibilities((await requireProfile(ctx.user.id)).id)),
    saveFieldVisibilities: protectedProcedure.input(fieldVisibilityInput).mutation(async ({ ctx, input }) => saveProfileFieldVisibilities((await requireProfile(ctx.user.id)).id, input.fields)),
  }),
  uploads: router({
    profilePhotos: protectedProcedure.query(async ({ ctx }) => listOwnProfilePhotos((await requireProfile(ctx.user.id)).id)),
    uploadProfilePhoto: protectedProcedure.input(z.object({ dataUrl: z.string().max(12_000_000) })).mutation(async ({ ctx, input }) => uploadProfilePhoto((await requireProfile(ctx.user.id)).id, input.dataUrl)),
    uploadIdentityDocument: protectedProcedure.input(z.object({ documentType: z.enum(["national_id", "passport"]), dataUrl: z.string().max(15_000_000) })).mutation(async ({ ctx, input }) => uploadIdentityDocument((await requireProfile(ctx.user.id)).id, input.documentType, input.dataUrl)),
  }),
  discovery: router({
    list: protectedProcedure.input(z.object({ minAge: z.number().int().min(18).max(60).optional(), maxAge: z.number().int().min(18).max(60).optional(), religion: z.enum(["muslim", "christian"]).optional(), residenceType: z.enum(["gambia", "diaspora"]).optional(), country: z.string().max(100).optional(), city: z.string().max(100).optional(), tribe: z.string().max(100).optional(), educationLevel: z.string().max(100).optional() }).optional()).query(async ({ ctx, input }) => {
      const profile = await requireProfile(ctx.user.id);
      return getDiscoveryProfiles(profile.id, input);
    }),
    curated: protectedProcedure.input(z.object({ cursor: z.number().int().positive().optional(), limit: z.number().int().min(1).max(24).optional(), collection: z.enum(["recommended", "new", "recently_updated", "verified", "potentially_compatible"]).optional(), minAge: z.number().int().min(18).max(80).optional(), maxAge: z.number().int().min(18).max(80).optional(), gender: z.enum(["woman", "man", "self_described"]).optional(), religion: z.enum(["muslim", "christian"]).optional(), country: z.string().max(100).optional(), city: z.string().max(100).optional(), maritalStatus: z.enum(["never_married", "married", "divorced", "widowed"]).optional(), hasChildren: z.boolean().optional(), relocationWillingness: z.enum(["open", "within_gambia", "not_open", "discuss"]).optional(), polygynyOpenness: z.enum(["open", "not_open", "discuss", "not_applicable"]).optional(), verifiedOnly: z.boolean().optional() }).optional()).query(async ({ ctx, input }) => getCuratedDiscovery((await requireProfile(ctx.user.id)).id, input)),
  }),
  compatibility: router({
    preferences: protectedProcedure.query(async ({ ctx }) => getCompatibilityPreferences((await requireProfile(ctx.user.id)).id)),
    savePreferences: protectedProcedure.input(preferenceInput).mutation(async ({ ctx, input }) => saveCompatibilityPreferences((await requireProfile(ctx.user.id)).id, input)),
    explain: protectedProcedure.input(z.object({ profileId: z.number().int().positive() })).query(async ({ ctx, input }) => getCompatibilityExplanation((await requireProfile(ctx.user.id)).id, input.profileId)),
  }),
  interests: router({
    incoming: protectedProcedure.query(async ({ ctx }) => listIncomingInterests((await requireProfile(ctx.user.id)).id)),
    send: protectedProcedure.input(z.object({ recipientProfileId: z.number().int().positive(), message: z.string().max(500).optional() })).mutation(async ({ ctx, input }) => createInterest((await requireProfile(ctx.user.id)).id, input.recipientProfileId, input.message)),
    respond: protectedProcedure.input(z.object({ interestId: z.number().int().positive(), response: z.enum(["accepted", "declined"]) })).mutation(async ({ ctx, input }) => respondToInterest((await requireProfile(ctx.user.id)).id, input.interestId, input.response)),
  }),
  matches: router({
    list: protectedProcedure.query(async ({ ctx }) => getMatchesForProfile((await requireProfile(ctx.user.id)).id)),
  }),
  messaging: router({
    conversations: protectedProcedure.query(async ({ ctx }) => getConversationsForProfile((await requireProfile(ctx.user.id)).id)),
    messages: protectedProcedure.input(z.object({ conversationId: z.number().int().positive() })).query(async ({ ctx, input }) => getMessagesForProfile((await requireProfile(ctx.user.id)).id, input.conversationId)),
    sendText: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), body: z.string().trim().min(1).max(2000) })).mutation(async ({ ctx, input }) => sendTextMessage((await requireProfile(ctx.user.id)).id, input.conversationId, input.body)),
  }),
  family: router({
    list: protectedProcedure.query(async ({ ctx }) => listFamilyLinks((await requireProfile(ctx.user.id)).id)),
    invite: protectedProcedure.input(z.object({ relationship: z.enum(["parent", "wali_guardian"]), contactName: z.string().min(2).max(160), contactEmail: z.string().email().optional(), contactPhone: z.string().max(40).optional(), canReceiveMatchNotifications: z.boolean() }).refine(value => Boolean(value.contactEmail || value.contactPhone), { message: "Provide an email address or phone number." })).mutation(async ({ ctx, input }) => upsertFamilyLink((await requireProfile(ctx.user.id)).id, input)),
  }),
  verification: router({
    summary: protectedProcedure.query(async ({ ctx }) => getVerificationSummary((await requireProfile(ctx.user.id)).id)),
    submitIdentity: protectedProcedure.input(z.object({ documentType: z.enum(["national_id", "passport"]) })).mutation(async ({ ctx, input }) => submitIdentityVerification((await requireProfile(ctx.user.id)).id, input.documentType)),
  }),
  safety: router({
    report: protectedProcedure.input(z.object({ reportedProfileId: z.number().int().positive().optional(), conversationId: z.number().int().positive().optional(), reason: z.enum(["fake_profile", "impersonation", "scam", "harassment", "inappropriate_content", "financial_solicitation", "suspicious_behavior", "safety_concern", "other"]), details: z.string().max(2000).optional() }).refine(value => Boolean(value.reportedProfileId || value.conversationId), { message: "Choose a profile or conversation to report." })).mutation(async ({ ctx, input }) => createReport((await requireProfile(ctx.user.id)).id, input)),
    block: protectedProcedure.input(z.object({ blockedProfileId: z.number().int().positive(), reason: z.string().max(255).optional() })).mutation(async ({ ctx, input }) => blockProfile((await requireProfile(ctx.user.id)).id, input.blockedProfileId, input.reason)),
  }),
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => getNotificationsForUser(ctx.user.id)),
    read: protectedProcedure.input(z.object({ notificationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => markNotificationRead(ctx.user.id, input.notificationId)),
  }),
  admin: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      const scopes = await requireOperationalAccess(ctx.user, ["verification_reviewer", "trust_safety", "support_agent", "subscription_manager", "platform_admin"]);
      return getScopedAdminOverview(scopes);
    }),
    verificationDocument: protectedProcedure.input(z.object({ verificationId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await requireOperationalAccess(ctx.user, ["verification_reviewer", "platform_admin"]);
      return getVerificationDocumentForAuthorizedReview(ctx.user.id, input.verificationId);
    }),
    reviewIdentity: protectedProcedure.input(z.object({ verificationId: z.number().int().positive(), decision: z.enum(["approved", "rejected"]), reviewNotes: z.string().max(2000).optional() })).mutation(async ({ ctx, input }) => {
      await requireOperationalAccess(ctx.user, ["verification_reviewer", "platform_admin"]);
      await reviewIdentityVerification(ctx.user.id, input.verificationId, input.decision, input.reviewNotes);
      return { success: true };
    }),
    operationalScopes: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Administrator access is required." });
      return getActiveAdminScopes(ctx.user.id);
    }),
    verificationQueue: protectedProcedure.query(async ({ ctx }) => {
      await requireOperationalAccess(ctx.user, ["verification_reviewer", "platform_admin"]);
      return getVerificationQueue();
    }),
    verificationCase: protectedProcedure.input(z.object({ verificationId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await requireOperationalAccess(ctx.user, ["verification_reviewer", "platform_admin"]);
      return getVerificationCase(input.verificationId);
    }),
    claimVerification: protectedProcedure.input(z.object({ verificationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await requireOperationalAccess(ctx.user, ["verification_reviewer", "platform_admin"]);
      await claimVerificationCase(ctx.user.id, input.verificationId);
      return { success: true };
    }),
    decideVerification: protectedProcedure.input(z.object({ verificationId: z.number().int().positive(), decision: z.enum(["approved", "rejected", "requires_resubmission", "escalated"]), reason: z.enum(["document_unclear", "document_expired", "document_unsupported", "information_mismatch", "image_quality_insufficient", "verification_image_insufficient", "suspected_duplicate", "suspected_fraud", "requires_additional_review", "other"]).optional(), internalNote: z.string().max(2000).optional(), memberMessage: z.string().max(500).optional(), priority: z.enum(["standard", "attention", "high"]).optional() })).mutation(async ({ ctx, input }) => {
      await requireOperationalAccess(ctx.user, ["verification_reviewer", "platform_admin"]);
      await decideVerificationCase({ actorUserId: ctx.user.id, ...input });
      return { success: true };
    }),
    reportQueue: protectedProcedure.query(async ({ ctx }) => {
      await requireOperationalAccess(ctx.user, ["trust_safety", "platform_admin"]);
      return getReportQueue();
    }),
    reportCase: protectedProcedure.input(z.object({ reportId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await requireOperationalAccess(ctx.user, ["trust_safety", "platform_admin"]);
      return getReportCase(input.reportId);
    }),
    claimReport: protectedProcedure.input(z.object({ reportId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await requireOperationalAccess(ctx.user, ["trust_safety", "platform_admin"]);
      await claimReportCase(ctx.user.id, input.reportId);
      return { success: true };
    }),
    decideReport: protectedProcedure.input(z.object({ reportId: z.number().int().positive(), status: z.enum(["in_review", "action_required", "resolved", "dismissed", "escalated"]), priority: z.enum(["low", "normal", "high", "critical"]).optional(), memberAction: z.enum(["none", "warn", "restrict", "temporary_suspend"]).optional(), internalNote: z.string().max(2000).optional(), memberMessage: z.string().max(500).optional(), resolution: z.string().max(500).optional() })).mutation(async ({ ctx, input }) => {
      await requireOperationalAccess(ctx.user, ["trust_safety", "platform_admin"]);
      await decideReportCase({ actorUserId: ctx.user.id, ...input });
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
