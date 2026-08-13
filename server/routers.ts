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
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const profileInput = z.object({
  displayName: z.string().min(2).max(80).optional(),
  birthDate: z.string().date().optional(),
  gender: z.enum(["woman", "man", "self_described"]).optional(),
  religion: z.enum(["muslim", "christian"]).optional(),
  practiceLevel: z.string().max(80).optional(),
  ethnicity: z.string().max(100).optional(),
  tribe: z.string().max(100).optional(),
  residenceType: z.enum(["gambia", "diaspora"]).optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  maritalStatus: z.enum(["never_married", "divorced", "widowed"]).optional(),
  educationLevel: z.string().max(100).optional(),
  profession: z.string().max(160).optional(),
  marriageTimeline: z.string().max(100).optional(),
  relocationWillingness: z.enum(["open", "within_gambia", "not_open", "discuss"]).optional(),
  polygynyOpenness: z.enum(["open", "not_open", "discuss", "not_applicable"]).optional(),
  hasChildren: z.boolean().optional(),
  about: z.string().max(2400).optional(),
  familyBackground: z.string().max(1200).optional(),
  lifestyle: z.string().max(1200).optional(),
  profileVisibility: z.enum(["public", "members_only", "hidden"]).optional(),
  photoVisibility: z.enum(["public", "mutual_match", "hidden"]).optional(),
  searchVisible: z.boolean().optional(),
  familyVisibility: z.enum(["private", "matches", "visible"]).optional(),
});

async function requireProfile(userId: number) {
  const profile = await getProfileByUserId(userId);
  if (!profile) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Please complete your profile before continuing." });
  return profile;
}

function requireAdmin(user: { role: string }) {
  if (user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Administrator access is required." });
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
    report: protectedProcedure.input(z.object({ reportedProfileId: z.number().int().positive().optional(), conversationId: z.number().int().positive().optional(), reason: z.enum(["harassment", "impersonation", "scam", "inappropriate_content", "other"]), details: z.string().max(2000).optional() }).refine(value => Boolean(value.reportedProfileId || value.conversationId), { message: "Choose a profile or conversation to report." })).mutation(async ({ ctx, input }) => createReport((await requireProfile(ctx.user.id)).id, input)),
    block: protectedProcedure.input(z.object({ blockedProfileId: z.number().int().positive(), reason: z.string().max(255).optional() })).mutation(async ({ ctx, input }) => blockProfile((await requireProfile(ctx.user.id)).id, input.blockedProfileId, input.reason)),
  }),
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => getNotificationsForUser(ctx.user.id)),
    read: protectedProcedure.input(z.object({ notificationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => markNotificationRead(ctx.user.id, input.notificationId)),
  }),
  admin: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user);
      return getAdminOverview();
    }),
    verificationDocument: protectedProcedure.input(z.object({ verificationId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      requireAdmin(ctx.user);
      return getVerificationDocumentForReview(input.verificationId);
    }),
    reviewIdentity: protectedProcedure.input(z.object({ verificationId: z.number().int().positive(), decision: z.enum(["approved", "rejected"]), reviewNotes: z.string().max(2000).optional() })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user);
      await reviewIdentityVerification(ctx.user.id, input.verificationId, input.decision, input.reviewNotes);
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
