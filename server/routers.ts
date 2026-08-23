import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import {
  blockProfile,
  createInterest,
  createReport,
  getAdminOverview,
  getConversationsForProfile,
  getInterestConnectionState,
	  listBlockedProfiles,
  getDiscoveryProfiles,
  getMatchesForProfile,
  getMessagesForProfile,
  getNotificationsForUser,
  getProfileByUserId,
  requireFreshMemberAuthentication,
  getMemberEligibility,
  getProfilePhotoForReview,
  listSuccessStoryEditorialQueue,
  listPublishedSuccessStories,
  getProfileCompleteness,
  getProfileForMember,
  getSuccessDeclaration,
  getVerificationSummary,
  listFamilyLinks,
  listIncomingInterests,
	  listOutgoingInterests,
  listOwnProfilePhotos,
	  listProfilePhotoReviewQueue,
	  removeOwnProfilePhoto,
  markNotificationRead,
  respondToInterest,
  saveMemberProfile,
  saveSuccessDeclaration,
  sendTextMessage,
  withdrawSuccessDeclaration,
  withdrawInterest,
	  unblockProfile,
  uploadIdentityDocument,
  uploadProfilePhoto,
  upsertFamilyLink,
  getVerificationDocumentForReview,
  reviewIdentityVerification,
  reviewProfilePhoto,
  reviewSuccessStory,
  publishSuccessStory,
} from "./db";
import { claimReportCase, claimVerificationCase, decideReportCase, decideVerificationCase, getActiveAdminScopes, getReportCase, getReportQueue, getScopedAdminOverview, getVerificationCase, getVerificationDocumentForAuthorizedReview, getVerificationQueue, requireOperationalScope } from "./operations";
import { getCompatibilityExplanation, getCompatibilityPreferences, getCuratedDiscovery, listProfileFieldVisibilities, saveCompatibilityPreferences, saveProfileFieldVisibilities } from "./compatibilityService";
import { FAMILY_PERMISSIONS, acceptFamilyInvitation, createFamilyInvitation, declineFamilyInvitation, getFamilyParticipantDashboard, listFamilyMetadataForOperations, listMemberFamilyCircle, reissueFamilyInvitation, removeFamilyParticipant, reportFamilyParticipant, requestFamilyAcknowledgment, respondToFamilyAcknowledgment, restrictFamilyParticipant, reviewWaliGuardianVerification, revokeFamilyInvitation, setFamilyPermission, sharePotentialMatch, submitFamilyFeedback, withdrawFamilyShare } from "./familyService";
import { blockConversationMember, deleteOwnVoiceNote, getConversationPrompts, getVoiceNoteUrl, listConversations, listMessages, reportMessage, sendText, setConversationModerationState, setConversationPreference, setConversationState, uploadVoiceNote } from "./messagingService";
import { addConnectionReviewNote, claimConnectionReviewCase, decideConnectionReview, escalateConnectionReviewCase, flagConnectionIntegrityConcern, getConnectionReviewCase, getReadinessForMember, grantConnectionConsent, listConnectionReviewQueue, revokeConnectionForConversation, revokeConnectionForProfilePair, revokeConnectionsForProfile, revokeHardIncompatibleConnectionsForProfile, withdrawConnectionConsent } from "./readinessService";
import { getRecommendationExplanation, getRecommendationSettings, getRecommendationsForMember, listRecommendationPolicies, recordRecommendationInterest, saveRecommendationPolicy, saveRecommendationSettings, submitRecommendationFeedback, withdrawRecommendationsForProfile, withdrawRecommendationsForProfilePair } from "./recommendationService";
import { cancelSubscriptionRenewal, getMemberBilling, getMemberReceipt, hasEntitlement, initiatePayment, listBillingConfiguration, listFinanceTransactions, listMembershipOptions, listPublicMembershipCatalog, listReconciliationQueue, listRefundRequests, requestMemberRefund, requestRefund, reviewRefundRequest, saveBillingPlanConfiguration, saveMemberBillingSettings, savePaymentProviderAvailability, scanPaymentReconciliation } from "./billingService";
import { dismissNotification, getNotificationCenter, getNotificationPreferences, getNotificationSummary, listNotificationConfiguration, listNotificationOperations, markAllNotificationsRead, markNotificationReadState, processQueuedNotificationDeliveries, saveNotificationPreferences, saveNotificationProviderAvailability, saveNotificationTemplateConfiguration } from "./notificationService";
import { addSafetyEvidence, approveSafetyEnforcement, createIntegritySignal, expireSafetyEnforcements, getMemberSafetyCenter, getMemberSafetyReports, getSafetyCaseDetail, getSafetyEvidenceForReview, listSafetyOperations, requestSafetyEnforcement, reviewSafetyAppeal, revokeSafetyEnforcement, saveIntegrityPolicy, submitSafetyAppeal, triageIntegritySignal, updateMemberSafetyReport, withdrawMemberSafetyReport, withdrawSafetyAppeal } from "./integrityService";
import { acceptStaffInvitation, createOperationalApproval, createOperationalIncident, createStaffSessionControl, createSupportTicket, decideOperationalApproval, getEffectiveStaffAccess, getOperationalMemberSummary, inviteStaff, listAssignableSupportStaff, listCurrentStaffPermissions, listFeatureFlags, listOperationalApprovals, listOperationalAudit, listOperationalIncidents, listOperationsOverview, listStaffDirectory, listSupportTickets, proposeStaffChange, requireOperationalPermission, revokeStaffSession, searchOperationalMembers, updateOperationalIncident, updateSupportTicket } from "./adminOperationsService";
import { getInternationalSettings, listCountryOperations, listInternationalCountries, saveCountryPolicy, saveInternationalSettings, setCountryLifecycle } from "./internationalService";
import { acceptBetaInvitation, changeBetaEnrollment, createBetaInvitation, getMyBetaEnrollment, listBetaOperations, requireBetaMemberAccess, revokeBetaInvitation, setBetaMode } from "./betaService";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const staffOnlyProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "An authorized staff identity is required." });
  try { await getEffectiveStaffAccess(ctx.user.id, ctx.user.sessionReferenceHash); } catch { throw new TRPCError({ code: "FORBIDDEN", message: "An active, permissioned staff identity is required." }); }
  return next();
});

const betaMemberProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  await requireBetaMemberAccess(ctx.user.id);
  return next();
});

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
  expectedUpdatedAt: z.date().optional(),
});

const preferenceInput = z.object({
  minAge: z.number().int().min(18).max(80).optional(), maxAge: z.number().int().min(18).max(80).optional(),
  preferredGenders: z.array(z.enum(["woman", "man", "self_described"])).max(3).optional(), preferredReligions: z.array(z.enum(["muslim", "christian"])).max(2).optional(), preferredLocations: z.array(z.string().trim().min(1).max(100)).max(12).optional(), preferredMaritalStatuses: z.array(z.enum(["never_married", "married", "divorced", "widowed"])).max(4).optional(),
  childrenPreference: z.enum(["open", "prefer_no_children", "open_to_children", "not_important"]).optional(), desiredChildrenPreference: z.enum(["yes", "no", "open", "not_important"]).optional(), preferredRelocation: z.array(z.enum(["open", "within_gambia", "not_open", "discuss"])).max(4).optional(), preferredEducationLevels: z.array(z.string().trim().min(1).max(100)).max(10).optional(), preferredMarriageTimelines: z.array(z.string().trim().min(1).max(100)).max(10).optional(), preferredPolygynyOpenness: z.array(z.enum(["open", "not_open", "discuss", "not_applicable"])).max(4).optional(), preferredFamilyInvolvement: z.array(z.enum(["active", "limited", "optional", "private"])).max(4).optional(), lifestylePreferences: z.array(z.enum(["no", "occasionally", "yes", "private"])).max(4).optional(), preferenceImportance: z.record(z.string(), z.enum(["required", "preferred", "neutral", "not_important"])).optional(), marriageIntent: z.string().max(1200).optional(), mustHaves: z.string().max(1200).optional(),
}).refine(input => input.minAge === undefined || input.maxAge === undefined || input.minAge <= input.maxAge, { message: "Minimum age cannot exceed maximum age." });

const fieldVisibilityInput = z.object({ fields: z.array(z.object({ fieldKey: z.enum(["religion", "practiceLevel", "ethnicity", "tribe", "country", "region", "city", "languages", "maritalStatus", "educationLevel", "educationField", "profession", "employmentStatus", "industry", "about", "personality", "interests", "hobbies", "marriageTimeline", "marriageIntent", "marriageExpectations", "relocationWillingness", "polygynyOpenness", "hasChildren", "desireChildren", "familyInvolvementPreference", "lifestyle", "values", "importantPrinciples", "familyBackground"]), audience: z.enum(["public", "verified_members", "potential_matches", "matched_members", "family_circle", "private", "admin_restricted"]) })).max(30) });

async function requireProfile(userId: number) {
  await requireBetaMemberAccess(userId);
  const profile = await getProfileByUserId(userId);
  if (!profile) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Please complete your profile before continuing." });
  return profile;
}

async function requireOperationalAccess(user: { id: number; role: string; sessionReferenceHash?: string }, allowedScopes: Array<"verification_reviewer" | "trust_safety" | "support_agent" | "subscription_manager" | "platform_admin">) {
  if (user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Administrator access is required." });
  try {
    await getEffectiveStaffAccess(user.id, user.sessionReferenceHash);
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
  publicContent: router({
    successStories: publicProcedure.query(() => listPublishedSuccessStories()),
	  membershipCatalog: publicProcedure.input(z.object({ currency: z.string().trim().length(3).optional() }).optional()).query(({ input }) => listPublicMembershipCatalog(input?.currency ?? "GMD")),
  }),
  beta: router({
    status: protectedProcedure.query(({ ctx }) => getMyBetaEnrollment(ctx.user.id)),
    acceptInvitation: protectedProcedure.input(z.object({ invitationCode: z.string().trim().min(16).max(200) })).mutation(({ ctx, input }) => acceptBetaInvitation(ctx.user.id, ctx.user.email, input.invitationCode)),
  }),
  profile: router({
    mine: protectedProcedure.query(async ({ ctx }) => {
      await requireBetaMemberAccess(ctx.user.id);
      const profile = await getProfileByUserId(ctx.user.id);
      if (!profile) return null;
      const [completeness, verification, eligibility] = await Promise.all([getProfileCompleteness(profile.id), getVerificationSummary(profile.id), getMemberEligibility(profile.id)]);
      return { ...profile, completeness, verification, eligibility };
    }),
	    save: protectedProcedure.input(profileInput).mutation(async ({ ctx, input }) => {
	      await requireBetaMemberAccess(ctx.user.id);
	      const { expectedUpdatedAt, ...profileInput } = input;
	      const profile = await saveMemberProfile(ctx.user.id, { ...profileInput, birthDate: profileInput.birthDate ? new Date(profileInput.birthDate) : undefined }, expectedUpdatedAt);
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
	  international: router({
	    countries: publicProcedure.query(() => listInternationalCountries()),
	    settings: protectedProcedure.query(({ ctx }) => getInternationalSettings(ctx.user.id)),
	    saveSettings: protectedProcedure.input(z.object({ residenceCountryId: z.number().int().positive(), region: z.string().trim().max(100).nullable().optional(), city: z.string().trim().max(100).nullable().optional(), timezone: z.string().trim().min(3).max(80), interfaceLocale: z.string().trim().min(2).max(16), locationVisibility: z.enum(["eligible_members", "matches_only", "family_circle", "hidden"]), locationDetailLevel: z.enum(["country", "region", "city"]), diasporaStatus: z.enum(["living_in_gambia", "living_outside_gambia", "gambian_diaspora", "international_member"]), phone: z.string().trim().max(40).nullable().optional(), phoneCountryId: z.number().int().positive().nullable().optional(), originCountryIds: z.array(z.number().int().positive()).max(8), preferredDiscoveryCountryIds: z.array(z.number().int().positive()).max(12), futureResidenceCountryIds: z.array(z.number().int().positive()).max(12), futureResidenceOptions: z.array(z.enum(["the_gambia", "senegal", "my_current_country", "partners_country", "another_country", "open_to_discussion"])).max(6), longDistancePreference: z.enum(["open", "prefer_nearby", "no_preference"]) })).mutation(async ({ ctx, input }) => { const profile = await requireProfile(ctx.user.id); const saved = await saveInternationalSettings(ctx.user.id, input); await revokeHardIncompatibleConnectionsForProfile(profile.id); await withdrawRecommendationsForProfile(profile.id, "profile_changed"); return saved; }),
	  }),
	  uploads: router({
    profilePhotos: protectedProcedure.query(async ({ ctx }) => listOwnProfilePhotos((await requireProfile(ctx.user.id)).id)),
    uploadProfilePhoto: protectedProcedure.input(z.object({ dataUrl: z.string().max(12_000_000) })).mutation(async ({ ctx, input }) => uploadProfilePhoto((await requireProfile(ctx.user.id)).id, input.dataUrl)),
	    removeProfilePhoto: protectedProcedure.input(z.object({ photoId: z.number().int().positive() })).mutation(async ({ ctx, input }) => removeOwnProfilePhoto((await requireProfile(ctx.user.id)).id, input.photoId)),
    uploadIdentityDocument: protectedProcedure.input(z.object({ documentType: z.enum(["national_id", "passport"]), dataUrl: z.string().max(15_000_000) })).mutation(async ({ ctx, input }) => uploadIdentityDocument((await requireProfile(ctx.user.id)).id, input.documentType, input.dataUrl)),
  }),
  discovery: router({
	    list: protectedProcedure.input(z.object({ minAge: z.number().int().min(18).max(60).optional(), maxAge: z.number().int().min(18).max(60).optional(), religion: z.enum(["muslim", "christian"]).optional(), residenceType: z.enum(["gambia", "diaspora"]).optional(), country: z.string().max(100).optional(), residenceCountryId: z.number().int().positive().optional(), city: z.string().max(100).optional(), tribe: z.string().max(100).optional(), educationLevel: z.string().max(100).optional() }).optional()).query(async ({ ctx, input }) => {
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
	    outgoing: protectedProcedure.query(async ({ ctx }) => listOutgoingInterests((await requireProfile(ctx.user.id)).id)),
	    send: protectedProcedure.input(z.object({ recipientProfileId: z.number().int().positive(), message: z.string().max(500).optional() })).mutation(async ({ ctx, input }) => createInterest((await requireProfile(ctx.user.id)).id, input.recipientProfileId, input.message)),
	    respond: protectedProcedure.input(z.object({ interestId: z.number().int().positive(), response: z.enum(["accepted", "declined"]) })).mutation(async ({ ctx, input }) => respondToInterest((await requireProfile(ctx.user.id)).id, input.interestId, input.response)),
	    withdraw: protectedProcedure.input(z.object({ interestId: z.number().int().positive() })).mutation(async ({ ctx, input }) => withdrawInterest((await requireProfile(ctx.user.id)).id, input.interestId)),
	    connectionState: protectedProcedure.input(z.object({ profileId: z.number().int().positive() })).query(async ({ ctx, input }) => { const profile = await requireProfile(ctx.user.id); const visible = await getProfileForMember(profile.id, input.profileId); if (!visible) return { state: "unavailable" as const, interestId: null, conversationId: null }; return getInterestConnectionState(profile.id, input.profileId); }),
	  }),
	  recommendations: router({
	    list: protectedProcedure.input(z.object({ cursor: z.number().int().positive().optional(), limit: z.number().int().min(1).max(18).optional(), category: z.enum(["recommended_for_you", "strong_compatibility", "nearby_potential_matches", "similar_marriage_goals", "recently_joined", "verified_members", "worth_exploring"]).optional() }).optional()).query(async ({ ctx, input }) => getRecommendationsForMember((await requireProfile(ctx.user.id)).id, input)),
	    explain: protectedProcedure.input(z.object({ recommendationId: z.number().int().positive() })).query(async ({ ctx, input }) => getRecommendationExplanation((await requireProfile(ctx.user.id)).id, input.recommendationId)),
	    feedback: protectedProcedure.input(z.object({ recommendationId: z.number().int().positive(), response: z.enum(["not_interested", "not_relevant", "already_considered", "hide_profile"]) })).mutation(async ({ ctx, input }) => { const profile = await requireProfile(ctx.user.id); return submitRecommendationFeedback(profile.id, ctx.user.id, input.recommendationId, input.response); }),
	    settings: protectedProcedure.query(async ({ ctx }) => getRecommendationSettings((await requireProfile(ctx.user.id)).id)),
	    saveSettings: protectedProcedure.input(z.object({ recommendationsEnabled: z.boolean(), showVerifiedCategory: z.boolean(), showNearbyCategory: z.boolean(), showRecentCategory: z.boolean() })).mutation(async ({ ctx, input }) => { const profile = await requireProfile(ctx.user.id); return saveRecommendationSettings(profile.id, ctx.user.id, input); }),
	    startInterest: protectedProcedure.input(z.object({ recommendationId: z.number().int().positive(), message: z.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => { const profile = await requireProfile(ctx.user.id); const recommendation = await recordRecommendationInterest(profile.id, ctx.user.id, input.recommendationId, false); const interest = await createInterest(profile.id, recommendation.candidateProfileId, input.message); if (!interest.duplicate) await recordRecommendationInterest(profile.id, ctx.user.id, input.recommendationId); return { success: true, duplicate: interest.duplicate, state: interest.state }; }),
	  }),
  billing: router({
	    options: betaMemberProcedure.input(z.object({ currency: z.string().trim().length(3).optional() }).optional()).query(async ({ input }) => listMembershipOptions(input?.currency ?? "GMD")),
	    summary: protectedProcedure.query(async ({ ctx }) => getMemberBilling((await requireProfile(ctx.user.id)).id)),
	    receipt: protectedProcedure.input(z.object({ transactionId: z.number().int().positive() })).query(async ({ ctx, input }) => getMemberReceipt((await requireProfile(ctx.user.id)).id, input.transactionId)),
	    saveSettings: protectedProcedure.input(z.object({ preferredCurrency: z.string().trim().length(3), receiptEmail: z.string().email().optional().nullable() })).mutation(async ({ ctx, input }) => saveMemberBillingSettings((await requireProfile(ctx.user.id)).id, ctx.user.id, input)),
	    initiate: protectedProcedure.input(z.object({ membershipPriceId: z.number().int().positive(), provider: z.string().trim().min(2).max(80), idempotencyKey: z.string().trim().min(16).max(96), acknowledgedTerms: z.literal(true), returnUrl: z.string().url().max(500).optional() })).mutation(async ({ ctx, input }) => initiatePayment((await requireProfile(ctx.user.id)).id, ctx.user.id, input)),
	    cancelRenewal: protectedProcedure.input(z.object({ subscriptionId: z.number().int().positive() })).mutation(async ({ ctx, input }) => cancelSubscriptionRenewal((await requireProfile(ctx.user.id)).id, ctx.user.id, input.subscriptionId)),
	    requestRefund: protectedProcedure.input(z.object({ transactionId: z.number().int().positive(), reason: z.string().trim().min(10).max(500) })).mutation(async ({ ctx, input }) => requestMemberRefund((await requireProfile(ctx.user.id)).id, ctx.user.id, input.transactionId, input.reason)),
	    entitlement: protectedProcedure.input(z.object({ entitlementKey: z.enum(["advanced_discovery", "expanded_discovery_controls", "profile_visibility_controls", "enhanced_recommendation_controls", "profile_management_convenience"]) })).query(async ({ ctx, input }) => ({ active: await hasEntitlement((await requireProfile(ctx.user.id)).id, input.entitlementKey) })),
  }),
  success: router({
    mine: protectedProcedure.query(async ({ ctx }) => getSuccessDeclaration((await requireProfile(ctx.user.id)).id)),
    declare: protectedProcedure.input(z.object({ outcome: z.enum(["engaged", "married"]), sharingConsent: z.boolean(), editorialAction: z.enum(["save_private", "submit_for_review"]).default("save_private"), storySummary: z.string().trim().max(1200).optional(), publicDisplayNameAuthorized: z.boolean().optional(), publicPhotoId: z.number().int().positive().nullable().optional(), publicPhotoAuthorized: z.boolean().optional() })).mutation(async ({ ctx, input }) => { if (input.editorialAction === "submit_for_review") await requireFreshMemberAuthentication(ctx.user.id); return saveSuccessDeclaration((await requireProfile(ctx.user.id)).id, ctx.user.id, input); }),
    withdraw: protectedProcedure.mutation(async ({ ctx }) => withdrawSuccessDeclaration((await requireProfile(ctx.user.id)).id, ctx.user.id)),
  }),
  matches: router({
    list: protectedProcedure.query(async ({ ctx }) => getMatchesForProfile((await requireProfile(ctx.user.id)).id)),
  }),
  messaging: router({
    conversations: protectedProcedure.input(z.object({ cursor: z.number().int().positive().optional(), limit: z.number().int().min(1).max(30).optional() }).optional()).query(async ({ ctx, input }) => listConversations((await requireProfile(ctx.user.id)).id, input)),
    messages: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), cursor: z.number().int().positive().optional(), limit: z.number().int().min(1).max(50).optional() })).query(async ({ ctx, input }) => listMessages((await requireProfile(ctx.user.id)).id, input.conversationId, input)),
    sendText: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), body: z.string().trim().min(1).max(2000), retryOfMessageId: z.number().int().positive().optional(), clientRequestId: z.string().regex(/^[A-Za-z0-9_-]{16,96}$/).optional() })).mutation(async ({ ctx, input }) => sendText((await requireProfile(ctx.user.id)).id, input.conversationId, input.body, input.retryOfMessageId, input.clientRequestId)),
    prompts: protectedProcedure.input(z.object({ conversationId: z.number().int().positive() })).query(async ({ ctx, input }) => getConversationPrompts((await requireProfile(ctx.user.id)).id, input.conversationId)),
    uploadVoice: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), dataUrl: z.string().max(9_000_000), durationSeconds: z.number().int().min(1).max(180), clientRequestId: z.string().regex(/^[A-Za-z0-9_-]{16,96}$/).optional() })).mutation(async ({ ctx, input }) => uploadVoiceNote((await requireProfile(ctx.user.id)).id, input.conversationId, input.dataUrl, input.durationSeconds, input.clientRequestId)),
    voiceUrl: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), messageId: z.number().int().positive() })).query(async ({ ctx, input }) => getVoiceNoteUrl((await requireProfile(ctx.user.id)).id, input.conversationId, input.messageId)),
    deleteVoice: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), messageId: z.number().int().positive() })).mutation(async ({ ctx, input }) => deleteOwnVoiceNote((await requireProfile(ctx.user.id)).id, input.conversationId, input.messageId)),
    preferences: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), isMuted: z.boolean().optional(), readReceiptsEnabled: z.boolean().optional() })).mutation(async ({ ctx, input }) => setConversationPreference((await requireProfile(ctx.user.id)).id, input.conversationId, input)),
	    setState: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), state: z.enum(["active", "paused", "closed"]), expectedUpdatedAt: z.coerce.date().optional() })).mutation(async ({ ctx, input }) => setConversationState((await requireProfile(ctx.user.id)).id, input.conversationId, input.state, input.expectedUpdatedAt)),
    block: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), reason: z.string().max(255).optional() })).mutation(async ({ ctx, input }) => blockConversationMember((await requireProfile(ctx.user.id)).id, input.conversationId, input.reason)),
	    reportMessage: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), messageId: z.number().int().positive(), reason: z.enum(["fake_profile", "impersonation", "scam", "harassment", "inappropriate_content", "financial_solicitation", "suspicious_behavior", "safety_concern", "other"]), details: z.string().max(2000).optional(), clientRequestId: z.string().trim().regex(/^[A-Za-z0-9_-]{16,96}$/).optional() })).mutation(async ({ ctx, input }) => reportMessage((await requireProfile(ctx.user.id)).id, input.conversationId, input.messageId, input.reason, input.details, input.clientRequestId)),
  }),
  readiness: router({
    status: protectedProcedure.input(z.object({ conversationId: z.number().int().positive() })).query(async ({ ctx, input }) => getReadinessForMember((await requireProfile(ctx.user.id)).id, input.conversationId)),
    grantConsent: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), capability: z.enum(["voice", "video"]) })).mutation(async ({ ctx, input }) => grantConnectionConsent((await requireProfile(ctx.user.id)).id, input.conversationId, input.capability)),
    withdrawConsent: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), capability: z.enum(["voice", "video"]) })).mutation(async ({ ctx, input }) => withdrawConnectionConsent((await requireProfile(ctx.user.id)).id, input.conversationId, input.capability)),
  }),
		  family: router({
	  list: protectedProcedure.query(async ({ ctx }) => listMemberFamilyCircle((await requireProfile(ctx.user.id)).id)),
		    invite: protectedProcedure.input(z.object({ relationship: z.enum(["parent", "wali_guardian"]), contactName: z.string().trim().min(2).max(160), contactEmail: z.string().email(), contactPhone: z.string().trim().max(40).optional(), preferredContactMethod: z.enum(["email", "phone"]) })).mutation(async ({ ctx, input }) => createFamilyInvitation((await requireProfile(ctx.user.id)).id, ctx.user.id, input)),
		  resendInvitation: protectedProcedure.input(z.object({ familyLinkId: z.number().int().positive() })).mutation(async ({ ctx, input }) => reissueFamilyInvitation((await requireProfile(ctx.user.id)).id, ctx.user.id, input.familyLinkId)),
		  revokeInvitation: protectedProcedure.input(z.object({ familyLinkId: z.number().int().positive() })).mutation(async ({ ctx, input }) => revokeFamilyInvitation((await requireProfile(ctx.user.id)).id, ctx.user.id, input.familyLinkId)),
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
  }),
  safety: router({
	    report: protectedProcedure.input(z.object({ reportedProfileId: z.number().int().positive().optional(), conversationId: z.number().int().positive().optional(), reason: z.enum(["fake_profile", "impersonation", "scam", "harassment", "inappropriate_content", "financial_solicitation", "suspicious_behavior", "safety_concern", "other"]), details: z.string().max(2000).optional(), clientRequestId: z.string().trim().regex(/^[A-Za-z0-9_-]{16,96}$/).optional() }).refine(value => Boolean(value.reportedProfileId || value.conversationId), { message: "Choose a profile or conversation to report." })).mutation(async ({ ctx, input }) => { const profile = await requireProfile(ctx.user.id); const report = await createReport(profile.id, input); if (!report.duplicate) { await createIntegritySignal({ actorUserId: ctx.user.id, subjectProfileId: input.reportedProfileId ?? null, reportId: report.reportId, source: "member_report", category: input.reason === "financial_solicitation" ? "financial_solicitation" : "report_pattern", severity: ["scam", "harassment", "financial_solicitation", "safety_concern"].includes(input.reason) ? "medium" : "low", evidenceConfidence: "unverified", idempotencyKey: `member-report:${report.reportId}` }); if (["scam", "harassment", "financial_solicitation", "safety_concern"].includes(input.reason)) { if (input.conversationId) await revokeConnectionForConversation(input.conversationId, "open_report", { profileId: profile.id }); if (input.reportedProfileId) { await revokeConnectionForProfilePair(profile.id, input.reportedProfileId, "open_report", { profileId: profile.id }); await withdrawRecommendationsForProfilePair(profile.id, input.reportedProfileId, "report"); } } } return { success: true, reportId: report.reportId, duplicate: report.duplicate }; }),
	    block: protectedProcedure.input(z.object({ blockedProfileId: z.number().int().positive(), reason: z.string().max(255).optional() })).mutation(async ({ ctx, input }) => { const profile = await requireProfile(ctx.user.id); await blockProfile(profile.id, input.blockedProfileId, input.reason); await revokeConnectionForProfilePair(profile.id, input.blockedProfileId, "block", { profileId: profile.id }); await withdrawRecommendationsForProfilePair(profile.id, input.blockedProfileId, "block"); return { success: true }; }),
	    blocks: betaMemberProcedure.query(async ({ ctx }) => listBlockedProfiles((await requireProfile(ctx.user.id)).id)),
	    unblock: betaMemberProcedure.input(z.object({ blockedProfileId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const profile = await requireProfile(ctx.user.id); const result = await unblockProfile(profile.id, input.blockedProfileId); return result; }),
	    center: betaMemberProcedure.query(async ({ ctx }) => getMemberSafetyCenter(ctx.user.id)),
	    reports: betaMemberProcedure.query(async ({ ctx }) => getMemberSafetyReports(ctx.user.id)),
	    updateReport: betaMemberProcedure.input(z.object({ reportId: z.number().int().positive(), details: z.string().trim().min(1).max(2000) })).mutation(async ({ ctx, input }) => updateMemberSafetyReport(ctx.user.id, input.reportId, input.details)),
	    withdrawReport: betaMemberProcedure.input(z.object({ reportId: z.number().int().positive() })).mutation(async ({ ctx, input }) => withdrawMemberSafetyReport(ctx.user.id, input.reportId)),
	    submitAppeal: betaMemberProcedure.input(z.object({ enforcementActionId: z.number().int().positive(), reason: z.string().trim().min(20).max(2000) })).mutation(async ({ ctx, input }) => submitSafetyAppeal(ctx.user.id, input.enforcementActionId, input.reason)),
	    withdrawAppeal: betaMemberProcedure.input(z.object({ appealId: z.number().int().positive() })).mutation(async ({ ctx, input }) => withdrawSafetyAppeal(ctx.user.id, input.appealId)),
  }),
	  notifications: router({
	    list: betaMemberProcedure.query(async ({ ctx }) => getNotificationCenter(ctx.user.id)),
	    summary: betaMemberProcedure.query(async ({ ctx }) => getNotificationSummary(ctx.user.id)),
	    read: betaMemberProcedure.input(z.object({ notificationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => markNotificationReadState(ctx.user.id, input.notificationId)),
	    markAllRead: betaMemberProcedure.mutation(async ({ ctx }) => { await markAllNotificationsRead(ctx.user.id); return { success: true }; }),
	    dismiss: betaMemberProcedure.input(z.object({ notificationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await dismissNotification(ctx.user.id, input.notificationId); return { success: true }; }),
	    preferences: betaMemberProcedure.query(async ({ ctx }) => getNotificationPreferences(ctx.user.id)),
	    savePreferences: betaMemberProcedure.input(z.object({ timezone: z.string().trim().min(1).max(64), quietHoursEnabled: z.boolean(), quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(), quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(), locale: z.string().trim().min(2).max(16), preferences: z.array(z.object({ category: z.enum(["messages", "family", "recommendations", "billing", "product_updates", "marketing", "security", "verification", "safety"]), inAppEnabled: z.boolean(), emailEnabled: z.boolean(), smsEnabled: z.boolean(), pushEnabled: z.boolean(), marketingOptIn: z.boolean() })).max(9) })).mutation(async ({ ctx, input }) => { await saveNotificationPreferences(ctx.user.id, input); return { success: true }; }),
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
    decideVerification: protectedProcedure.input(z.object({ verificationId: z.number().int().positive(), decision: z.enum(["approved", "rejected", "requires_resubmission", "escalated"]), reason: z.enum(["document_unclear", "document_expired", "document_unsupported", "information_mismatch", "image_quality_insufficient", "verification_image_insufficient", "suspected_duplicate", "suspected_fraud", "requires_additional_review", "other"]).optional(), internalNote: z.string().max(2000).optional(), memberMessage: z.string().max(500).optional(), priority: z.enum(["standard", "attention", "high"]).optional(), expectedUpdatedAt: z.coerce.date().optional() })).mutation(async ({ ctx, input }) => {
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
	    safetyOperations: protectedProcedure.query(async ({ ctx }) => { await requireOperationalAccess(ctx.user, ["trust_safety", "platform_admin"]); return listSafetyOperations(); }),
	    safetyCaseDetail: protectedProcedure.input(z.object({ reportId: z.number().int().positive() })).query(async ({ ctx, input }) => { await requireOperationalAccess(ctx.user, ["trust_safety", "platform_admin"]); return getSafetyCaseDetail(input.reportId); }),
	    createIntegritySignal: protectedProcedure.input(z.object({ subjectProfileId: z.number().int().positive().optional(), reportId: z.number().int().positive().optional(), source: z.enum(["staff_observation", "verification", "account_security", "messaging", "family_circle", "connection_readiness", "payment", "platform_rule", "policy_violation"]), category: z.enum(["account_behavior", "verification_anomaly", "messaging_behavior", "report_pattern", "block_pattern", "family_circle_behavior", "recommendation_abuse", "connection_readiness_abuse", "payment_abuse", "account_security", "session_anomaly", "multiple_account_indicator", "rapid_profile_change", "invitation_behavior", "repeated_policy_violation", "financial_solicitation", "other"]), severity: z.enum(["informational", "low", "medium", "high", "critical"]), evidenceConfidence: z.enum(["unverified", "limited", "corroborated", "strong"]), idempotencyKey: z.string().trim().min(8).max(191), safeMetadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional() })).mutation(async ({ ctx, input }) => { await requireOperationalAccess(ctx.user, ["trust_safety", "platform_admin"]); return createIntegritySignal({ actorUserId: ctx.user.id, ...input }); }),
	    triageIntegritySignal: protectedProcedure.input(z.object({ signalId: z.number().int().positive(), outcome: z.enum(["no_action", "monitor", "investigate", "restrict_temporarily", "escalate"]), internalNote: z.string().trim().max(2000).optional() })).mutation(async ({ ctx, input }) => { await requireOperationalAccess(ctx.user, ["trust_safety", "platform_admin"]); return triageIntegritySignal({ actorUserId: ctx.user.id, ...input }); }),
	    addSafetyEvidence: protectedProcedure.input(z.object({ reportId: z.number().int().positive(), integritySignalId: z.number().int().positive().optional(), evidenceType: z.enum(["report_reference", "message_reference", "account_event", "verification_event", "payment_event", "family_event", "security_event", "staff_note", "integrity_signal"]), sourceRecordType: z.string().trim().min(2).max(80), sourceRecordId: z.string().trim().min(1).max(120), evidenceConfidence: z.enum(["unverified", "limited", "corroborated", "strong"]) })).mutation(async ({ ctx, input }) => { await requireOperationalAccess(ctx.user, ["trust_safety", "platform_admin"]); return addSafetyEvidence({ actorUserId: ctx.user.id, ...input }); }),
	    safetyEvidence: protectedProcedure.input(z.object({ reportId: z.number().int().positive() })).query(async ({ ctx, input }) => { await requireOperationalAccess(ctx.user, ["trust_safety", "platform_admin"]); return getSafetyEvidenceForReview(ctx.user.id, input.reportId); }),
	    requestSafetyEnforcement: protectedProcedure.input(z.object({ reportId: z.number().int().positive(), subjectProfileId: z.number().int().positive(), actionType: z.enum(["warning", "feature_restriction", "messaging_restriction", "connection_restriction", "temporary_suspension", "verification_hold", "integrity_hold", "permanent_account_removal"]), scope: z.array(z.enum(["discovery", "connection_initiation", "family_invitations", "messaging", "connection_readiness", "calls", "account", "verification"])).max(8), reasonCode: z.string().trim().min(3).max(120), memberSafeMessage: z.string().trim().max(500).optional(), expiresAt: z.coerce.date().optional(), idempotencyKey: z.string().trim().min(8).max(191) })).mutation(async ({ ctx, input }) => { await requireOperationalAccess(ctx.user, ["trust_safety", "platform_admin"]); return requestSafetyEnforcement({ actorUserId: ctx.user.id, ...input }); }),
	    approveSafetyEnforcement: protectedProcedure.input(z.object({ enforcementActionId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await requireOperationalAccess(ctx.user, ["trust_safety", "platform_admin"]); return approveSafetyEnforcement(ctx.user.id, input.enforcementActionId); }),
	    revokeSafetyEnforcement: protectedProcedure.input(z.object({ enforcementActionId: z.number().int().positive(), reason: z.string().trim().min(3).max(500) })).mutation(async ({ ctx, input }) => { await requireOperationalAccess(ctx.user, ["trust_safety", "platform_admin"]); return revokeSafetyEnforcement(ctx.user.id, input.enforcementActionId, input.reason); }),
	    expireSafetyEnforcements: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(50) })).mutation(async ({ ctx, input }) => { await requireOperationalAccess(ctx.user, ["trust_safety", "platform_admin"]); return expireSafetyEnforcements(ctx.user.id, input.limit); }),
	    reviewSafetyAppeal: protectedProcedure.input(z.object({ appealId: z.number().int().positive(), status: z.enum(["in_review", "information_requested", "upheld", "modified", "overturned"]), decisionSummary: z.string().trim().min(10).max(500) })).mutation(async ({ ctx, input }) => { await requireOperationalAccess(ctx.user, ["trust_safety", "platform_admin"]); return reviewSafetyAppeal({ actorUserId: ctx.user.id, ...input }); }),
	    saveIntegrityPolicy: protectedProcedure.input(z.object({ policyVersion: z.string().trim().min(3).max(64), ruleConfiguration: z.record(z.string(), z.unknown()).optional(), retentionConfiguration: z.record(z.string(), z.number().int().min(1).max(3650)).optional(), activate: z.boolean() })).mutation(async ({ ctx, input }) => { await requireOperationalAccess(ctx.user, ["platform_admin"]); return saveIntegrityPolicy(ctx.user.id, input); }),
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
	    paymentTransactions: protectedProcedure.query(async ({ ctx }) => { await requireOperationalAccess(ctx.user, ["subscription_manager", "platform_admin"]); return listFinanceTransactions(); }),
	    refundRequests: protectedProcedure.query(async ({ ctx }) => { await requireOperationalAccess(ctx.user, ["subscription_manager", "platform_admin"]); return listRefundRequests(); }),
	    paymentReconciliationQueue: protectedProcedure.query(async ({ ctx }) => { await requireOperationalAccess(ctx.user, ["subscription_manager", "platform_admin"]); return listReconciliationQueue(); }),
	    scanPaymentReconciliation: protectedProcedure.mutation(async ({ ctx }) => { await requireOperationalAccess(ctx.user, ["subscription_manager", "platform_admin"]); return scanPaymentReconciliation(ctx.user.id); }),
	    requestPaymentRefund: protectedProcedure.input(z.object({ transactionId: z.number().int().positive(), amountMinor: z.number().int().positive(), reason: z.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => { await requireOperationalAccess(ctx.user, ["subscription_manager", "platform_admin"]); return requestRefund(ctx.user.id, input.transactionId, input.amountMinor, input.reason); }),
	    reviewRefundRequest: protectedProcedure.input(z.object({ refundId: z.number().int().positive(), decision: z.enum(["approve_for_provider", "reject"]) })).mutation(async ({ ctx, input }) => { await requireOperationalAccess(ctx.user, ["subscription_manager", "platform_admin"]); return reviewRefundRequest(ctx.user.id, input.refundId, input.decision); }),
	    billingConfiguration: protectedProcedure.query(async ({ ctx }) => { await requireOperationalAccess(ctx.user, ["subscription_manager", "platform_admin"]); return listBillingConfiguration(); }),
	    saveBillingPlan: protectedProcedure.input(z.object({ planCode: z.string().trim().min(3).max(64), displayName: z.string().trim().min(3).max(120), description: z.string().trim().max(1200).optional(), versionCode: z.string().trim().min(3).max(80), featureKeys: z.array(z.enum(["advanced_discovery", "expanded_discovery_controls", "profile_visibility_controls", "enhanced_recommendation_controls", "profile_management_convenience"])).min(1).max(5), renewalTerms: z.string().trim().max(1200).optional(), gracePeriodDays: z.number().int().min(0).max(60), graceEntitlementsActive: z.boolean(), cancelAtPeriodEndAllowed: z.boolean(), currency: z.string().trim().length(3), amountMinor: z.number().int().min(0).max(100_000_000), taxMinor: z.number().int().min(0).max(100_000_000), billingInterval: z.enum(["monthly", "quarterly", "annual", "one_time"]), provider: z.string().trim().max(80).optional().nullable(), providerPriceReference: z.string().trim().max(255).optional().nullable(), effectiveFrom: z.coerce.date().optional().nullable(), effectiveUntil: z.coerce.date().optional().nullable(), activate: z.boolean() })).mutation(async ({ ctx, input }) => { await requireOperationalAccess(ctx.user, ["subscription_manager", "platform_admin"]); return saveBillingPlanConfiguration(ctx.user.id, input); }),
	    savePaymentProviderAvailability: protectedProcedure.input(z.object({ provider: z.string().trim().min(2).max(80), enabled: z.boolean(), environment: z.enum(["not_configured", "sandbox", "live"]), supportedCurrencies: z.array(z.string().trim().length(3)).max(12), supportedMethods: z.array(z.string().trim().min(1).max(80)).max(12), configurationNote: z.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => { await requireOperationalAccess(ctx.user, ["subscription_manager", "platform_admin"]); return savePaymentProviderAvailability(ctx.user.id, input); }),
	    notificationOperations: protectedProcedure.input(z.object({ status: z.enum(["pending", "queued", "sending", "delivered", "failed", "retrying", "suppressed", "cancelled", "expired", "unavailable"]).optional(), channel: z.enum(["in_app", "email", "sms", "push"]).optional() }).optional()).query(async ({ ctx, input }) => { await requireOperationalAccess(ctx.user, ["support_agent", "trust_safety", "platform_admin"]); return listNotificationOperations(input ?? {}); }),
	    notificationConfiguration: protectedProcedure.query(async ({ ctx }) => { await requireOperationalAccess(ctx.user, ["platform_admin"]); return listNotificationConfiguration(); }),
	    processNotificationQueue: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(50).default(25) })).mutation(async ({ ctx, input }) => { await requireOperationalAccess(ctx.user, ["platform_admin"]); return processQueuedNotificationDeliveries(ctx.user.id, input.limit); }),
	    saveNotificationTemplate: protectedProcedure.input(z.object({ eventType: z.string().trim().min(3).max(100), channel: z.enum(["in_app", "email", "sms", "push"]), locale: z.string().trim().min(2).max(16), templateVersion: z.string().trim().min(2).max(64), subject: z.string().trim().min(3).max(160), body: z.string().trim().min(3).max(500), allowedVariables: z.array(z.string()).max(0), activate: z.boolean() })).mutation(async ({ ctx, input }) => { await requireOperationalAccess(ctx.user, ["platform_admin"]); return saveNotificationTemplateConfiguration(ctx.user.id, input); }),
	    saveNotificationProviderAvailability: protectedProcedure.input(z.object({ provider: z.string().trim().min(2).max(80), channel: z.enum(["email", "sms", "push"]), enabled: z.boolean(), supportedLocales: z.array(z.string().trim().min(2).max(16)).max(12), configurationNote: z.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => { await requireOperationalAccess(ctx.user, ["platform_admin"]); return saveNotificationProviderAvailability(ctx.user.id, input); }),
	    operationsAccess: staffOnlyProcedure.query(async ({ ctx }) => getEffectiveStaffAccess(ctx.user.id)),
	    profilePhotoReviewQueue: staffOnlyProcedure.query(async ({ ctx }) => { await requireOperationalPermission(ctx.user.id, "photos.review", { sessionReferenceHash: ctx.user.sessionReferenceHash }); return listProfilePhotoReviewQueue(); }),
	    profilePhotoReviewUrl: staffOnlyProcedure.input(z.object({ photoId: z.number().int().positive() })).query(async ({ ctx, input }) => { await requireOperationalPermission(ctx.user.id, "photos.review", { sessionReferenceHash: ctx.user.sessionReferenceHash }); return getProfilePhotoForReview(ctx.user.id, input.photoId); }),
	    reviewProfilePhoto: staffOnlyProcedure.input(z.object({ photoId: z.number().int().positive(), decision: z.enum(["approved", "rejected"]), reviewNote: z.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => { await requireOperationalPermission(ctx.user.id, "photos.review", { sessionReferenceHash: ctx.user.sessionReferenceHash }); return reviewProfilePhoto(ctx.user.id, input.photoId, input.decision, input.reviewNote); }),
	    successStoryEditorialQueue: staffOnlyProcedure.query(async ({ ctx }) => { await requireOperationalPermission(ctx.user.id, "success_stories.review", { sessionReferenceHash: ctx.user.sessionReferenceHash }); return listSuccessStoryEditorialQueue(); }),
	    reviewSuccessStory: staffOnlyProcedure.input(z.object({ declarationId: z.number().int().positive(), decision: z.enum(["approved", "rejected"]), reviewNote: z.string().trim().max(500).optional(), editorialCopy: z.string().trim().max(1200).optional() })).mutation(async ({ ctx, input }) => { await requireOperationalPermission(ctx.user.id, "success_stories.review", { sessionReferenceHash: ctx.user.sessionReferenceHash }); return reviewSuccessStory(ctx.user.id, input.declarationId, input.decision, input.reviewNote, input.editorialCopy); }),
	    requestSuccessStoryPublicationApproval: staffOnlyProcedure.input(z.object({ declarationId: z.number().int().positive(), reason: z.string().trim().min(10).max(1000) })).mutation(async ({ ctx, input }) => { await requireOperationalPermission(ctx.user.id, "success_stories.publish", { requireFresh: true, sessionReferenceHash: ctx.user.sessionReferenceHash }); return createOperationalApproval(ctx.user.id, { approvalType: "configuration_change", resourceType: "success_declaration_publication", resourceId: String(input.declarationId), requiredApproverRole: "platform_administrator", reason: input.reason, impactSummary: JSON.stringify({ declarationId: input.declarationId, action: "publish_success_story" }), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }); }),
	    publishSuccessStory: staffOnlyProcedure.input(z.object({ declarationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await requireOperationalPermission(ctx.user.id, "success_stories.publish", { requireFresh: true, sessionReferenceHash: ctx.user.sessionReferenceHash }); return publishSuccessStory(ctx.user.id, input.declarationId); }),
	    operationsOverview: staffOnlyProcedure.query(async ({ ctx }) => listOperationsOverview(ctx.user.id)),
	    operationsMembers: staffOnlyProcedure.input(z.object({ query: z.string().trim().min(2).max(120), page: z.number().int().min(0).max(100).default(0) })).query(async ({ ctx, input }) => searchOperationalMembers(ctx.user.id, input.query, input.page)),
	    operationsMemberSummary: staffOnlyProcedure.input(z.object({ profileId: z.number().int().positive() })).query(async ({ ctx, input }) => getOperationalMemberSummary(ctx.user.id, input.profileId)),
	    staffDirectory: staffOnlyProcedure.query(async ({ ctx }) => listStaffDirectory(ctx.user.id)),
	    staffPermissions: staffOnlyProcedure.query(async ({ ctx }) => listCurrentStaffPermissions(ctx.user.id)),
	    inviteStaff: staffOnlyProcedure.input(z.object({ email: z.string().email().max(320), staffRole: z.enum(["platform_administrator", "operations_manager", "trust_safety_officer", "verification_officer", "customer_support_officer", "finance_officer", "content_policy_manager", "read_only_auditor"]), expiresInHours: z.number().int().min(1).max(168).default(72) })).mutation(async ({ ctx, input }) => inviteStaff(ctx.user.id, input)),
	    acceptStaffInvitation: protectedProcedure.input(z.object({ email: z.string().email().max(320), invitationCode: z.string().trim().min(16).max(200) })).mutation(async ({ ctx, input }) => acceptStaffInvitation(ctx.user.id, input.email, input.invitationCode)),
	    proposeStaffChange: staffOnlyProcedure.input(z.object({ staffProfileId: z.number().int().positive(), nextRole: z.enum(["platform_administrator", "operations_manager", "trust_safety_officer", "verification_officer", "customer_support_officer", "finance_officer", "content_policy_manager", "read_only_auditor"]).optional(), nextStatus: z.enum(["suspended", "deactivated", "active"]).optional(), reason: z.string().trim().min(10).max(500) })).mutation(async ({ ctx, input }) => proposeStaffChange(ctx.user.id, input)),
	    createStaffSessionControl: staffOnlyProcedure.input(z.object({ sessionReference: z.string().trim().min(16).max(500), expiresAt: z.coerce.date() })).mutation(async ({ ctx, input }) => createStaffSessionControl(ctx.user.id, input.sessionReference, input.expiresAt)),
	    revokeStaffSession: staffOnlyProcedure.input(z.object({ sessionControlId: z.number().int().positive() })).mutation(async ({ ctx, input }) => revokeStaffSession(ctx.user.id, input.sessionControlId)),
    supportTickets: staffOnlyProcedure.input(z.object({ status: z.enum(["new", "open", "waiting_for_member", "waiting_for_staff", "escalated", "resolved", "closed"]).optional(), category: z.enum(["account_access", "profile", "verification", "membership", "payment", "notifications", "family_circle", "technical_issue", "safety_concern", "other"]).optional(), assignment: z.enum(["assigned", "unassigned"]).optional() })).query(async ({ ctx, input }) => listSupportTickets(ctx.user.id, input)),
	    supportAssignees: staffOnlyProcedure.query(async ({ ctx }) => listAssignableSupportStaff(ctx.user.id)),
	    createSupportTicket: staffOnlyProcedure.input(z.object({ memberProfileId: z.number().int().positive(), category: z.enum(["account_access", "profile", "verification", "membership", "payment", "notifications", "family_circle", "technical_issue", "safety_concern", "other"]), subject: z.string().trim().min(3).max(200), description: z.string().trim().min(10).max(5000), priority: z.enum(["low", "normal", "high", "critical"]) })).mutation(async ({ ctx, input }) => createSupportTicket(ctx.user.id, input)),
    updateSupportTicket: staffOnlyProcedure.input(z.object({ ticketId: z.number().int().positive(), status: z.enum(["new", "open", "waiting_for_member", "waiting_for_staff", "escalated", "resolved", "closed"]).optional(), assignedStaffProfileId: z.number().int().positive().nullable().optional(), resolution: z.string().trim().max(1000).optional(), expectedUpdatedAt: z.coerce.date() })).mutation(async ({ ctx, input }) => { const { ticketId, ...change } = input; return updateSupportTicket(ctx.user.id, ticketId, change); }),
	    incidents: staffOnlyProcedure.query(async ({ ctx }) => listOperationalIncidents(ctx.user.id)),
	    createIncident: staffOnlyProcedure.input(z.object({ category: z.enum(["notification_provider", "payment_provider", "authentication", "database", "safety_system", "service_degradation", "other"]), severity: z.enum(["low", "medium", "high", "critical"]), title: z.string().trim().min(3).max(220), summary: z.string().trim().min(10).max(2000) })).mutation(async ({ ctx, input }) => createOperationalIncident(ctx.user.id, input)),
	    updateIncident: staffOnlyProcedure.input(z.object({ incidentId: z.number().int().positive(), status: z.enum(["detected", "investigating", "mitigating", "monitoring", "resolved", "closed"]), note: z.string().trim().max(1000).optional() })).mutation(async ({ ctx, input }) => updateOperationalIncident(ctx.user.id, input.incidentId, input.status, input.note)),
	    approvals: staffOnlyProcedure.query(async ({ ctx }) => listOperationalApprovals(ctx.user.id)),
	    createApproval: staffOnlyProcedure.input(z.object({ approvalType: z.enum(["safety_action", "refund", "staff_role_change", "permission_override", "policy_change", "configuration_change", "feature_flag"]), resourceType: z.string().trim().min(2).max(80), resourceId: z.string().trim().min(1).max(120), requiredApproverRole: z.enum(["platform_administrator", "operations_manager", "trust_safety_officer", "verification_officer", "customer_support_officer", "finance_officer", "content_policy_manager", "read_only_auditor"]), reason: z.string().trim().min(10).max(1000), impactSummary: z.string().trim().min(10).max(1000), expiresAt: z.coerce.date() })).mutation(async ({ ctx, input }) => createOperationalApproval(ctx.user.id, input)),
	    decideApproval: staffOnlyProcedure.input(z.object({ approvalId: z.number().int().positive(), decision: z.enum(["approved", "rejected"]) })).mutation(async ({ ctx, input }) => decideOperationalApproval(ctx.user.id, input.approvalId, input.decision)),
    operationsAudit: staffOnlyProcedure.input(z.object({ action: z.string().trim().min(1).max(120).optional(), entityType: z.string().trim().min(1).max(80).optional(), entityId: z.string().trim().min(1).max(120).optional(), actorId: z.number().int().positive().optional(), outcome: z.string().trim().min(1).max(40).optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional(), page: z.number().int().min(0).max(100).default(0) }).refine(input => !input.from || !input.to || input.from <= input.to, { message: "Audit start time must be before the end time." })).query(async ({ ctx, input }) => listOperationalAudit(ctx.user.id, input)),
	    featureFlags: staffOnlyProcedure.query(async ({ ctx }) => listFeatureFlags(ctx.user.id)),
	    betaOperations: staffOnlyProcedure.query(async ({ ctx }) => listBetaOperations(ctx.user.id)),
	    setBetaMode: staffOnlyProcedure.input(z.object({ mode: z.enum(["disabled", "invite_only", "paused", "shutdown"]) })).mutation(async ({ ctx, input }) => setBetaMode(ctx.user.id, input)),
	    createBetaInvitation: staffOnlyProcedure.input(z.object({ invitedEmail: z.string().email().max(320), expiresInHours: z.number().int().min(1).max(168).default(72) })).mutation(async ({ ctx, input }) => createBetaInvitation(ctx.user.id, input)),
	    revokeBetaInvitation: staffOnlyProcedure.input(z.object({ invitationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => revokeBetaInvitation(ctx.user.id, input.invitationId)),
	    changeBetaEnrollment: staffOnlyProcedure.input(z.object({ enrollmentId: z.number().int().positive(), nextStatus: z.enum(["suspended", "removed"]) })).mutation(async ({ ctx, input }) => changeBetaEnrollment(ctx.user.id, input.enrollmentId, input.nextStatus)),
	    countryOperations: staffOnlyProcedure.query(async ({ ctx }) => listCountryOperations(ctx.user.id)),
	    setCountryLifecycle: staffOnlyProcedure.input(z.object({ countryId: z.number().int().positive(), lifecycleStatus: z.enum(["draft", "configured", "review", "approved", "active", "paused", "deactivated"]) })).mutation(async ({ ctx, input }) => setCountryLifecycle(ctx.user.id, input.countryId, input.lifecycleStatus)),
	    saveCountryPolicy: staffOnlyProcedure.input(z.object({ countryId: z.number().int().positive(), policyVersion: z.string().trim().min(3).max(64), signupAvailability: z.enum(["available", "unavailable", "coming_soon", "requires_configuration"]), discoveryAvailability: z.enum(["available", "unavailable", "coming_soon", "requires_configuration"]), verificationAvailability: z.enum(["available", "unavailable", "coming_soon", "requires_configuration"]), paymentAvailability: z.enum(["available", "unavailable", "coming_soon", "requires_configuration"]), notificationAvailability: z.enum(["available", "unavailable", "coming_soon", "requires_configuration"]), phoneVerificationAvailability: z.enum(["available", "unavailable", "coming_soon", "requires_configuration"]), supportedLocaleCodes: z.array(z.string().trim().min(2).max(16)).max(12), supportedNotificationChannels: z.array(z.enum(["in_app", "email", "sms", "push"])).max(4), privacyConfiguration: z.record(z.string(), z.string()).optional(), verificationConfiguration: z.record(z.string(), z.string()).optional(), paymentConfiguration: z.record(z.string(), z.string()).optional(), activate: z.boolean() })).mutation(async ({ ctx, input }) => { const { countryId, ...policy } = input; return saveCountryPolicy(ctx.user.id, countryId, policy); }),
	  }),
});

export type AppRouter = typeof appRouter;
