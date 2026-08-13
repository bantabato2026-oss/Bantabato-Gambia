import {
  boolean,
  date,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Core authenticated identities. Member details are deliberately separated into memberProfiles. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const memberProfiles = mysqlTable(
  "member_profiles",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    displayName: varchar("displayName", { length: 80 }),
    profileStatus: mysqlEnum("profileStatus", ["draft", "under_review", "active", "paused", "suspended"])
      .default("draft")
      .notNull(),
    birthDate: date("birthDate"),
    gender: mysqlEnum("gender", ["woman", "man", "self_described"]),
    religion: mysqlEnum("religion", ["muslim", "christian"]),
    practiceLevel: varchar("practiceLevel", { length: 80 }),
    ethnicity: varchar("ethnicity", { length: 100 }),
    tribe: varchar("tribe", { length: 100 }),
    residenceType: mysqlEnum("residenceType", ["gambia", "diaspora"]).default("gambia").notNull(),
    country: varchar("country", { length: 100 }),
    city: varchar("city", { length: 100 }),
    maritalStatus: mysqlEnum("maritalStatus", ["never_married", "divorced", "widowed"]),
    educationLevel: varchar("educationLevel", { length: 100 }),
    profession: varchar("profession", { length: 160 }),
    marriageTimeline: varchar("marriageTimeline", { length: 100 }),
    relocationWillingness: mysqlEnum("relocationWillingness", ["open", "within_gambia", "not_open", "discuss"]),
    polygynyOpenness: mysqlEnum("polygynyOpenness", ["open", "not_open", "discuss", "not_applicable"]),
    hasChildren: boolean("hasChildren").default(false).notNull(),
    about: text("about"),
    familyBackground: text("familyBackground"),
    lifestyle: text("lifestyle"),
    profileVisibility: mysqlEnum("profileVisibility", ["public", "members_only", "hidden"])
      .default("members_only")
      .notNull(),
    photoVisibility: mysqlEnum("photoVisibility", ["public", "mutual_match", "hidden"])
      .default("mutual_match")
      .notNull(),
    searchVisible: boolean("searchVisible").default(true).notNull(),
    familyVisibility: mysqlEnum("familyVisibility", ["private", "matches", "visible"])
      .default("private")
      .notNull(),
    completedAt: timestamp("completedAt"),
    deletedAt: timestamp("deletedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("member_profiles_user_unique").on(table.userId),
    index("member_profiles_discovery_idx").on(table.profileStatus, table.searchVisible, table.religion, table.residenceType),
    index("member_profiles_location_idx").on(table.country, table.city),
  ],
);

export const memberPreferences = mysqlTable(
  "member_preferences",
  {
    id: int("id").autoincrement().primaryKey(),
    profileId: int("profileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
    minAge: int("minAge"),
    maxAge: int("maxAge"),
    preferredReligions: json("preferredReligions"),
    preferredLocations: json("preferredLocations"),
    preferredTribes: json("preferredTribes"),
    preferredEducationLevels: json("preferredEducationLevels"),
    marriageIntent: text("marriageIntent"),
    mustHaves: text("mustHaves"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("member_preferences_profile_unique").on(table.profileId)],
);

export const profilePhotos = mysqlTable(
  "profile_photos",
  {
    id: int("id").autoincrement().primaryKey(),
    profileId: int("profileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
    storageKey: varchar("storageKey", { length: 512 }).notNull(),
    mimeType: varchar("mimeType", { length: 100 }).notNull(),
    photoPurpose: mysqlEnum("photoPurpose", ["profile", "verification"]).default("profile").notNull(),
    isPrimary: boolean("isPrimary").default(false).notNull(),
    displayOrder: int("displayOrder").default(0).notNull(),
    reviewStatus: mysqlEnum("reviewStatus", ["pending", "approved", "rejected"]).default("pending").notNull(),
    deletedAt: timestamp("deletedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("profile_photos_profile_idx").on(table.profileId, table.photoPurpose, table.reviewStatus)],
);

export const verificationRecords = mysqlTable(
  "verification_records",
  {
    id: int("id").autoincrement().primaryKey(),
    profileId: int("profileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
    verificationType: mysqlEnum("verificationType", ["phone", "email", "identity_document", "facial", "profile_photo"])
      .notNull(),
    status: mysqlEnum("status", ["not_started", "submitted", "under_review", "approved", "rejected", "expired"])
      .default("not_started")
      .notNull(),
    documentStorageKey: varchar("documentStorageKey", { length: 512 }),
    documentType: mysqlEnum("documentType", ["national_id", "passport"]),
    providerReference: varchar("providerReference", { length: 255 }),
    reviewNotes: text("reviewNotes"),
    reviewedByUserId: int("reviewedByUserId").references(() => users.id, { onDelete: "set null" }),
    submittedAt: timestamp("submittedAt"),
    reviewedAt: timestamp("reviewedAt"),
    expiresAt: timestamp("expiresAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("verification_records_profile_idx").on(table.profileId, table.status),
    index("verification_records_queue_idx").on(table.status, table.submittedAt),
  ],
);

export const familyLinks = mysqlTable(
  "family_links",
  {
    id: int("id").autoincrement().primaryKey(),
    memberProfileId: int("memberProfileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
    relationship: mysqlEnum("relationship", ["parent", "wali_guardian"]).notNull(),
    contactName: varchar("contactName", { length: 160 }).notNull(),
    contactEmail: varchar("contactEmail", { length: 320 }),
    contactPhone: varchar("contactPhone", { length: 40 }),
    status: mysqlEnum("status", ["draft", "invited", "accepted", "revoked"]).default("draft").notNull(),
    canReceiveMatchNotifications: boolean("canReceiveMatchNotifications").default(false).notNull(),
    consentedAt: timestamp("consentedAt"),
    invitedAt: timestamp("invitedAt"),
    revokedAt: timestamp("revokedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("family_links_profile_idx").on(table.memberProfileId, table.status)],
);

export const interestRequests = mysqlTable(
  "interest_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    senderProfileId: int("senderProfileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
    recipientProfileId: int("recipientProfileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
    message: varchar("message", { length: 500 }),
    status: mysqlEnum("status", ["pending", "accepted", "declined", "withdrawn"]).default("pending").notNull(),
    respondedAt: timestamp("respondedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("interest_requests_direction_unique").on(table.senderProfileId, table.recipientProfileId),
    index("interest_requests_recipient_idx").on(table.recipientProfileId, table.status, table.createdAt),
  ],
);

export const matches = mysqlTable(
  "matches",
  {
    id: int("id").autoincrement().primaryKey(),
    memberOneProfileId: int("memberOneProfileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
    memberTwoProfileId: int("memberTwoProfileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", ["active", "closed", "blocked"]).default("active").notNull(),
    matchedAt: timestamp("matchedAt").defaultNow().notNull(),
    closedAt: timestamp("closedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("matches_pair_unique").on(table.memberOneProfileId, table.memberTwoProfileId),
    index("matches_member_one_idx").on(table.memberOneProfileId, table.status),
    index("matches_member_two_idx").on(table.memberTwoProfileId, table.status),
  ],
);

export const conversations = mysqlTable(
  "conversations",
  {
    id: int("id").autoincrement().primaryKey(),
    matchId: int("matchId").notNull().references(() => matches.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", ["active", "archived", "blocked"]).default("active").notNull(),
    lastMessageAt: timestamp("lastMessageAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("conversations_match_unique").on(table.matchId)],
);

export const messages = mysqlTable(
  "messages",
  {
    id: int("id").autoincrement().primaryKey(),
    conversationId: int("conversationId").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    senderProfileId: int("senderProfileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
    messageType: mysqlEnum("messageType", ["text", "voice", "image"]).default("text").notNull(),
    body: text("body"),
    mediaStorageKey: varchar("mediaStorageKey", { length: 512 }),
    readAt: timestamp("readAt"),
    deletedAt: timestamp("deletedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("messages_conversation_idx").on(table.conversationId, table.createdAt)],
);

export const reports = mysqlTable(
  "reports",
  {
    id: int("id").autoincrement().primaryKey(),
    reporterProfileId: int("reporterProfileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
    reportedProfileId: int("reportedProfileId").references(() => memberProfiles.id, { onDelete: "set null" }),
    conversationId: int("conversationId").references(() => conversations.id, { onDelete: "set null" }),
    reason: mysqlEnum("reason", ["harassment", "impersonation", "scam", "inappropriate_content", "other"]).notNull(),
    details: text("details"),
    status: mysqlEnum("status", ["open", "in_review", "resolved", "dismissed"]).default("open").notNull(),
    reviewedByUserId: int("reviewedByUserId").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("reports_queue_idx").on(table.status, table.createdAt)],
);

export const blocks = mysqlTable(
  "blocks",
  {
    id: int("id").autoincrement().primaryKey(),
    blockerProfileId: int("blockerProfileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
    blockedProfileId: int("blockedProfileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
    reason: varchar("reason", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("blocks_direction_unique").on(table.blockerProfileId, table.blockedProfileId)],
);

export const subscriptions = mysqlTable(
  "subscriptions",
  {
    id: int("id").autoincrement().primaryKey(),
    profileId: int("profileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
    plan: mysqlEnum("plan", ["free", "premium", "profile_review"]).default("free").notNull(),
    status: mysqlEnum("status", ["inactive", "active", "past_due", "cancelled", "expired"]).default("inactive").notNull(),
    provider: varchar("provider", { length: 80 }),
    providerReference: varchar("providerReference", { length: 255 }),
    startsAt: timestamp("startsAt"),
    endsAt: timestamp("endsAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("subscriptions_profile_idx").on(table.profileId, table.status)],
);

export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    notificationType: mysqlEnum("notificationType", ["interest", "match", "message", "verification", "safety", "family"])
      .notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    body: varchar("body", { length: 500 }).notNull(),
    actionPath: varchar("actionPath", { length: 255 }),
    eventKey: varchar("eventKey", { length: 191 }),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("notifications_event_unique").on(table.userId, table.eventKey),
    index("notifications_user_unread_idx").on(table.userId, table.readAt, table.createdAt),
  ],
);

export const adminRoles = mysqlTable(
  "admin_roles",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    scope: mysqlEnum("scope", ["verification_reviewer", "trust_safety", "support_agent", "subscription_manager", "platform_admin"])
      .notNull(),
    status: mysqlEnum("status", ["active", "revoked"]).default("active").notNull(),
    grantedByUserId: int("grantedByUserId").references(() => users.id, { onDelete: "set null" }),
    grantedAt: timestamp("grantedAt").defaultNow().notNull(),
    revokedAt: timestamp("revokedAt"),
  },
  table => [uniqueIndex("admin_roles_user_scope_unique").on(table.userId, table.scope)],
);

export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    actorUserId: int("actorUserId").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 120 }).notNull(),
    entityType: varchar("entityType", { length: 80 }).notNull(),
    entityId: varchar("entityId", { length: 120 }),
    metadata: json("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("audit_logs_entity_idx").on(table.entityType, table.entityId, table.createdAt)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type MemberProfile = typeof memberProfiles.$inferSelect;
export type InterestRequest = typeof interestRequests.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
