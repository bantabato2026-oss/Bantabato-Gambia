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
import { FAMILY_PERMISSIONS, acceptFamilyInvitation, createFamilyInvitation, declineFamilyInvitation, getFamilyParticipantDashboard, listFamilyMetadataForOperations, listMemberFamilyCircle, removeFamilyParticipant, reportFamilyParticipant, requestFamilyAcknowledgment, respondToFamilyAcknowledgment, restrictFamilyParticipant, reviewWaliGuardianVerification, setFamilyPermission, sharePotentialMatch, submitFamilyFeedback, withdrawFamilyShare } from "./familyService";
import { blockConversationMember, deleteOwnVoiceNote, getConversationPrompts, getVoiceNoteUrl, listConversations, listMessages, reportMessage, sendText, setConversationModerationState, setConversationPreference, setConversationState, uploadVoiceNote } from "./messagingService";
import { addConnectionReviewNote, claimConnectionReviewCase, decideConnectionReview, escalateConnectionReviewCase, flagConnectionIntegrityConcern, getConnectionReviewCase, getReadinessForMember, grantConnectionConsent, listConnectionReviewQueue, revokeConnectionForConversation, revokeConnectionForProfilePair, revokeConnectionsForProfile, revokeHardIncompatibleConnectionsForProfile, withdrawConnectionConsent } from "./readinessService";
import { getRecommendationExplanation, getRecommendationSettings, getRecommendationsForMember, listRecommendationPolicies, recordRecommendationInterest, saveRecommendationPolicy, saveRecommendationSettings, submitRecommendationFeedback, withdrawRecommendationsForProfile, withdrawRecommendationsForProfilePair } from "./recommendationService";
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
	    save: protectedProcedure.input(profileInput).mutation(async ({ ctx, input }) => {
	      const profile = await saveMemberProfile(ctx.user.id, { ...input, birthDate: input.birthDate ? new Date(input.birthDate) : undefined });
	      if (profile) {
	        await revokeHardIncompatibleConnectionsForProfile(profile.id);
	        await withdrawRecommendationsForProfile(profile.id, profile.profileVisibility === "hidden" || !profile.searchVisible || profile.profileStatus !== "active" ? "profile_hidden" : "profile_changed");
	      }
	      return profile;
	    }),
    view: protectedProcedure.input(z.object({ profileId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const viewer = await requireProfile(ctx.user.id);
      return getProfileForMember(viewer.id, input.profileId);
    }),
    fieldVisibilities: protectedProcedure.query(async ({ ctx }) => listProfileFieldVisibilities((await requireProfile(ctx.user.id)).id)),
	    saveFieldVisibilities: protectedProcedure.input(fieldVisibilityInput).mutation(async ({ ctx, input }) => { const profile = await requireProfile(ctx.user.id); const saved = await saveProfileFieldVisibilities(profile.id, input.fields); await withdrawRecommendationsForProfile(profile.id, "profile_changed"); return saved; }),
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
	    savePreferences: protectedProcedure.input(preferenceInput).mutation(async ({ ctx, input }) => { const profile = await requireProfile(ctx.user.id); const saved = await saveCompatibilityPreferences(profile.id, input); await revokeHardIncompatibleConnectionsForProfile(profile.id); await withdrawRecommendationsForProfile(profile.id, "profile_changed"); return saved; }),
    explain: protectedProcedure.input(z.object({ profileId: z.number().int().positive() })).query(async ({ ctx, input }) => getCompatibilityExplanation((await requireProfile(ctx.user.id)).id, input.profileId)),
  }),
	  interests: router({
	    incoming: protectedProcedure.query(async ({ ctx }) => listIncomingInterests((await requireProfile(ctx.user.id)).id)),
	    send: protectedProcedure.input(z.object({ recipientProfileId: z.number().int().positive(), message: z.string().max(500).optional() })).mutation(async ({ ctx, input }) => createInterest((await requireProfile(ctx.user.id)).id, input.recipientProfileId, input.message)),
	    respond: protectedProcedure.input(z.object({ interestId: z.number().int().positive(), response: z.enum(["accepted", "declined"]) })).mutation(async ({ ctx, input }) => respondToInterest((await requireProfile(ctx.user.id)).id, input.interestId, input.response)),
	  }),
	  recommendations: router({
	    list: protectedProcedure.input(z.object({ cursor: z.number().int().positive().optional(), limit: z.number().int().min(1).max(18).optional(), category: z.enum(["recommended_for_you", "strong_compatibility", "nearby_potential_matches", "similar_marriage_goals", "recently_joined", "verified_members", "worth_exploring"]).optional() }).optional()).query(async ({ ctx, input }) => getRecommendationsForMember((await requireProfile(ctx.user.id)).id, input)),
	    explain: protectedProcedure.input(z.object({ recommendationId: z.number().int().positive() })).query(async ({ ctx, input }) => getRecommendationExplanation((await requireProfile(ctx.user.id)).id, input.recommendationId)),
	    feedback: protectedProcedure.input(z.object({ recommendationId: z.number().int().positive(), response: z.enum(["not_interested", "not_relevant", "already_considered", "hide_profile"]) })).mutation(async ({ ctx, input }) => { const profile = await requireProfile(ctx.user.id); return submitRecommendationFeedback(profile.id, ctx.user.id, input.recommendationId, input.response); }),
	    settings: protectedProcedure.query(async ({ ctx }) => getRecommendationSettings((await requireProfile(ctx.user.id)).id)),
	    saveSettings: protectedProcedure.input(z.object({ recommendationsEnabled: z.boolean(), showVerifiedCategory: z.boolean(), showNearbyCategory: z.boolean(), showRecentCategory: z.boolean() })).mutation(async ({ ctx, input }) => { const profile = await requireProfile(ctx.user.id); return saveRecommendationSettings(profile.id, ctx.user.id, input); }),
	    startInterest: protectedProcedure.input(z.object({ recommendationId: z.number().int().positive(), message: z.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => { const profile = await requireProfile(ctx.user.id); const recommendation = await recordRecommendationInterest(profile.id, ctx.user.id, input.recommendationId); await createInterest(profile.id, recommendation.candidateProfileId, input.message); return { success: true }; }),
	  }),
  matches: router({
    list: protectedProcedure.query(async ({ ctx }) => getMatchesForProfile((await requireProfile(ctx.user.id)).id)),
  }),
  messaging: router({
    conversations: protectedProcedure.input(z.object({ cursor: z.number().int().positive().optional(), limit: z.number().int().min(1).max(30).optional() }).optional()).query(async ({ ctx, input }) => listConversations((await requireProfile(ctx.user.id)).id, input)),
    messages: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), cursor: z.number().int().positive().optional(), limit: z.number().int().min(1).max(50).optional() })).query(async ({ ctx, input }) => listMessages((await requireProfile(ctx.user.id)).id, input.conversationId, input)),
    sendText: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), body: z.string().trim().min(1).max(2000), retryOfMessageId: z.number().int().positive().optional() })).mutation(async ({ ctx, input }) => sendText((await requireProfile(ctx.user.id)).id, input.conversationId, input.body, input.retryOfMessageId)),
    prompts: protectedProcedure.input(z.object({ conversationId: z.number().int().positive() })).query(async ({ ctx, input }) => getConversationPrompts((await requireProfile(ctx.user.id)).id, input.conversationId)),
    uploadVoice: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), dataUrl: z.string().max(9_000_000), durationSeconds: z.number().int().min(1).max(180) })).mutation(async ({ ctx, input }) => uploadVoiceNote((await requireProfile(ctx.user.id)).id, input.conversationId, input.dataUrl, input.durationSeconds)),
    voiceUrl: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), messageId: z.number().int().positive() })).query(async ({ ctx, input }) => getVoiceNoteUrl((await requireProfile(ctx.user.id)).id, input.conversationId, input.messageId)),
    deleteVoice: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), messageId: z.number().int().positive() })).mutation(async ({ ctx, input }) => deleteOwnVoiceNote((await requireProfile(ctx.user.id)).id, input.conversationId, input.messageId)),
    preferences: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), isMuted: z.boolean().optional(), readReceiptsEnabled: z.boolean().optional() })).mutation(async ({ ctx, input }) => setConversationPreference((await requireProfile(ctx.user.id)).id, input.conversationId, input)),
    setState: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), state: z.enum(["paused", "closed"]) })).mutation(async ({ ctx, input }) => setConversationState((await requireProfile(ctx.user.id)).id, input.conversationId, input.state)),
    block: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), reason: z.string().max(255).optional() })).mutation(async ({ ctx, input }) => blockConversationMember((await requireProfile(ctx.user.id)).id, input.conversationId, input.reason)),
    reportMessage: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), messageId: z.number().int().positive(), reason: z.enum(["fake_profile", "impersonation", "scam", "harassment", "inappropriate_content", "financial_solicitation", "suspicious_behavior", "safety_concern", "other"]), details: z.string().max(2000).optional() })).mutation(async ({ ctx, input }) => reportMessage((await requireProfile(ctx.user.id)).id, input.conversationId, input.messageId, input.reason, input.details)),
  }),
  readiness: router({
    status: protectedProcedure.input(z.object({ conversationId: z.number().int().positive() })).query(async ({ ctx, input }) => getReadinessForMember((await requireProfile(ctx.user.id)).id, input.conversationId)),
    grantConsent: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), capability: z.enum(["voice", "video"]) })).mutation(async ({ ctx, input }) => grantConnectionConsent((await requireProfile(ctx.user.id)).id, input.conversationId, input.capability)),
    withdrawConsent: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), capability: z.enum(["voice", "video"]) })).mutation(async ({ ctx, input }) => withdrawConnectionConsent((await requireProfile(ctx.user.id)).id, input.conversationId, input.capability)),
  }),
	family: router({
	  list: protectedProcedure.query(async ({ ctx }) => listMemberFamilyCircle((await requireProfile(ctx.user.id)).id)),
	  invite: protectedProcedure.input(z.object({ relationship: z.enum(["parent", "wali_guardian"]), contactName: z.string().trim().min(2).max(160), contactEmail: z.string().email(), contactPhone: z.string().trim().max(40).optional(), preferredContactMethod: z.enum(["email", "phone"]) })).mutation(async ({ ctx, input }) => createFamilyInvitation((await requireProfile(ctx.user.id)).id, ctx.user.id, input)),
	  setPermission: protectedProcedure.input(z.object({ familyLinkId: z.number().int().positive(), permission: z.enum(FAMILY_PERMISSIONS), isGranted: z.boolean() })).mutation(async ({ ctx, input }) => setFamilyPermission((await requireProfile(ctx.user.id)).id, ctx.user.id, input.familyLinkId, input.permission, input.isGranted)),
	  sharePotentialMatch: protectedProcedure.input(z.object({ familyLinkId: z.number().int().positive(), potentialMatchProfileId: z.number().int().positive() })).mutation(async ({ ctx, input }) => sharePotentialMatch((await requireProfile(ctx.user.id)).id, ctx.user.id, input.familyLinkId, input.potentialMatchProfileId)),
	  withdrawShare: protectedProcedure.input(z.object({ familyShareId: z.number().int().positive() })).mutation(async ({ ctx, input }) => withdrawFamilyShare((await requireProfile(ctx.user.id)).id, ctx.user.id, input.familyShareId)),
	  requestAcknowledgment: protectedProcedure.input(z.object({ familyShareId: z.number().int().positive() })).mutation(async ({ ctx, input }) => requestFamilyAcknowledgment((await requireProfile(ctx.user.id)).id, ctx.user.id, input.familyShareId)),
	  remove: protectedProcedure.input(z.object({ familyLinkId: z.number().int().positive() })).mutation(async ({ ctx, input }) => removeFamilyParticipant((await requireProfile(ctx.user.id)).id, ctx.user.id, input.familyLinkId)),
	  report: protectedProcedure.input(z.object({ familyLinkId: z.number().int().positive(), reason: z.enum(["harassment", "scam", "safety_concern", "other"]), details: z.string().trim().max(2000).optional() })).mutation(async ({ ctx, input }) => reportFamilyParticipant((await requireProfile(ctx.user.id)).id, ctx.user.id, input.familyLinkId, input.reason, input.details)),
	}),
	familyParticipant: router({
	  acceptInvitation: protectedProcedure.input(z.object({ invitationCode: z.string().min(20).max(128) })).mutation(async ({ ctx, input }) => acceptFamilyInvitation(ctx.user.id, ctx.user.email, input.invitationCode)),
	  declineInvitation: protectedProcedure.input(z.object({ invitationCode: z.string().min(20).max(128) })).mutation(async ({ ctx, input }) => declineFamilyInvitation(ctx.user.id, ctx.user.email, input.invitationCode)),
	  dashboard: protectedProcedure.query(async ({ ctx }) => getFamilyParticipantDashboard(ctx.user.id)),
	  respondAcknowledgment: protectedProcedure.input(z.object({ acknowledgmentId: z.number().int().positive(), response: z.enum(["acknowledged", "declined"]) })).mutation(async ({ ctx, input }) => respondToFamilyAcknowledgment(ctx.user.id, input.acknowledgmentId, input.response)),
	  submitFeedback: protectedProcedure.input(z.object({ familyShareId: z.number().int().positive(), response: z.enum(["acknowledged", "interested_to_learn_more", "has_concerns", "decline_to_comment"]), note: z.string().trim().max(1200).optional() })).mutation(async ({ ctx, input }) => submitFamilyFeedback(ctx.user.id, input.familyShareId, input.response, input.note)),
	}),
  verification: router({
    summary: protectedProcedure.query(async ({ ctx }) => getVerificationSummary((await requireProfile(ctx.user.id)).id)),
    submitIdentity: protectedProcedure.input(z.object({ documentType: z.enum(["national_id", "passport"]) })).mutation(async ({ ctx, input }) => submitIdentityVerification((await requireProfile(ctx.user.id)).id, input.documentType)),
  }),
  safety: router({
	    report: protectedProcedure.input(z.object({ reportedProfileId: z.number().int().positive().optional(), conversationId: z.number().int().positive().optional(), reason: z.enum(["fake_profile", "impersonation", "scam", "harassment", "inappropriate_content", "financial_solicitation", "suspicious_behavior", "safety_concern", "other"]), details: z.string().max(2000).optional() }).refine(value => Boolean(value.reportedProfileId || value.conversationId), { message: "Choose a profile or conversation to report." })).mutation(async ({ ctx, input }) => { const profile = await requireProfile(ctx.user.id); await createReport(profile.id, input); if (["scam", "harassment", "financial_solicitation", "safety_concern"].includes(input.reason)) { if (input.conversationId) await revokeConnectionForConversation(input.conversationId, "open_report", { profileId: profile.id }); if (input.reportedProfileId) { await revokeConnectionForProfilePair(profile.id, input.reportedProfileId, "open_report", { profileId: profile.id }); await withdrawRecommendationsForProfilePair(profile.id, input.reportedProfileId, "report"); } } return { success: true }; }),
	    block: protectedProcedure.input(z.object({ blockedProfileId: z.number().int().positive(), reason: z.string().max(255).optional() })).mutation(async ({ ctx, input }) => { const profile = await requireProfile(ctx.user.id); await blockProfile(profile.id, input.blockedProfileId, input.reason); await revokeConnectionForProfilePair(profile.id, input.blockedProfileId, "block", { profileId: profile.id }); await withdrawRecommendationsForProfilePair(profile.id, input.blockedProfileId, "block"); return { success: true }; }),
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
	      const outcome = await decideReportCase({ actorUserId: ctx.user.id, ...input });
	      if (outcome.reportedProfileId && ["restrict", "temporary_suspend"].includes(outcome.memberAction)) { await revokeConnectionsForProfile(outcome.reportedProfileId, outcome.memberAction === "temporary_suspend" ? "account_suspended" : "safety_restriction", { userId: ctx.user.id }); await withdrawRecommendationsForProfile(outcome.reportedProfileId, "safety_restriction"); }
	      return { success: true };
    }),
    setConversationModeration: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), state: z.enum(["restricted", "active"]), reason: z.string().max(500).optional() })).mutation(async ({ ctx, input }) => {
	      await requireOperationalAccess(ctx.user, ["trust_safety", "platform_admin"]);
	      await setConversationModerationState(ctx.user.id, input.conversationId, input.state, input.reason);
	      if (input.state === "restricted") await revokeConnectionForConversation(input.conversationId, "safety_restriction", { userId: ctx.user.id });
      return { success: true };
    }),
	    connectionReviewQueue: protectedProcedure.query(async ({ ctx }) => {
      await requireOperationalAccess(ctx.user, ["trust_safety", "platform_admin"]);
	      return listConnectionReviewQueue();
	    }),
	    connectionReviewCase: protectedProcedure.input(z.object({ reviewId: z.number().int().positive() })).query(async ({ ctx, input }) => { await requireOperationalAccess(ctx.user, ["trust_safety", "platform_admin"]); return getConnectionReviewCase(input.reviewId); }),
	    claimConnectionReview: protectedProcedure.input(z.object({ reviewId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await requireOperationalAccess(ctx.user, ["trust_safety", "platform_admin"]); await claimConnectionReviewCase(ctx.user.id, input.reviewId); return { success: true }; }),
	    addConnectionReviewNote: protectedProcedure.input(z.object({ reviewId: z.number().int().positive(), body: z.string().trim().min(1).max(2000) })).mutation(async ({ ctx, input }) => { await requireOperationalAccess(ctx.user, ["trust_safety", "platform_admin"]); await addConnectionReviewNote(ctx.user.id, input.reviewId, input.body); return { success: true }; }),
	    escalateConnectionReview: protectedProcedure.input(z.object({ reviewId: z.number().int().positive(), internalNote: z.string().max(2000).optional() })).mutation(async ({ ctx, input }) => { await requireOperationalAccess(ctx.user, ["trust_safety", "platform_admin"]); await escalateConnectionReviewCase(ctx.user.id, input.reviewId, input.internalNote); return { success: true }; }),
	    flagConnectionIntegrity: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), internalNote: z.string().max(2000).optional() })).mutation(async ({ ctx, input }) => { await requireOperationalAccess(ctx.user, ["trust_safety", "platform_admin"]); return flagConnectionIntegrityConcern(ctx.user.id, input.conversationId, input.internalNote); }),
	    decideConnectionReview: protectedProcedure.input(z.object({ reviewId: z.number().int().positive(), decision: z.enum(["approved_voice", "approved_video", "declined", "restricted", "revoked"]), memberMessage: z.string().max(500).optional(), internalNote: z.string().max(2000).optional() })).mutation(async ({ ctx, input }) => {
	      await requireOperationalAccess(ctx.user, ["trust_safety", "platform_admin"]);
	      await decideConnectionReview(ctx.user.id, input.reviewId, input.decision, input.memberMessage, input.internalNote);
	      return { success: true };
	    }),
	    familyMetadata: protectedProcedure.query(async ({ ctx }) => {
	      await requireOperationalAccess(ctx.user, ["trust_safety", "support_agent", "platform_admin"]);
	      return listFamilyMetadataForOperations();
	    }),
	    restrictFamilyParticipant: protectedProcedure.input(z.object({ familyLinkId: z.number().int().positive(), reason: z.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => {
	      await requireOperationalAccess(ctx.user, ["trust_safety", "platform_admin"]);
	      return restrictFamilyParticipant(ctx.user.id, input.familyLinkId, input.reason);
	    }),
	    reviewWaliGuardian: protectedProcedure.input(z.object({ familyLinkId: z.number().int().positive(), decision: z.enum(["verified", "unverified"]) })).mutation(async ({ ctx, input }) => {
	      await requireOperationalAccess(ctx.user, ["verification_reviewer", "platform_admin"]);
	      return reviewWaliGuardianVerification(ctx.user.id, input.familyLinkId, input.decision);
	    }),
	    recommendationPolicies: protectedProcedure.query(async ({ ctx }) => { await requireOperationalAccess(ctx.user, ["platform_admin"]); return listRecommendationPolicies(); }),
	    saveRecommendationPolicy: protectedProcedure.input(z.object({ policyVersion: z.string().trim().min(3).max(64), categories: z.array(z.enum(["recommended_for_you", "strong_compatibility", "nearby_potential_matches", "similar_marriage_goals", "recently_joined", "verified_members", "worth_exploring"])).min(1).max(7), weights: z.object({ compatibility: z.number().min(0).max(10), verification: z.number().min(0).max(5), completeness: z.number().min(0).max(5), recency: z.number().min(0).max(3) }), requireDiscoveryEligibility: z.boolean(), excludeIntegrityHeld: z.boolean(), maxPerLocationGroup: z.number().int().min(1).max(5), activate: z.boolean() })).mutation(async ({ ctx, input }) => { await requireOperationalAccess(ctx.user, ["platform_admin"]); return saveRecommendationPolicy(ctx.user.id, input, input.activate); }),
	  }),
});

export type AppRouter = typeof appRouter;
