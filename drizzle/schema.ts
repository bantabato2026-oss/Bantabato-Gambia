import {
  boolean,
  date,
  foreignKey,
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

export const COUNTRY_LIFECYCLE_VALUES = ["draft", "configured", "review", "approved", "active", "paused", "deactivated"] as const;
export const FEATURE_AVAILABILITY_VALUES = ["available", "unavailable", "coming_soon", "requires_configuration"] as const;

/** Country records are policy metadata, not a member-quality or safety-ranking input. */
export const countries = mysqlTable("countries", {
  id: int("id").autoincrement().primaryKey(),
  iso2: varchar("iso2", { length: 2 }).notNull(),
  iso3: varchar("iso3", { length: 3 }).notNull(),
  displayName: varchar("displayName", { length: 120 }).notNull(),
  region: varchar("region", { length: 100 }).notNull(),
  lifecycleStatus: mysqlEnum("lifecycleStatus", COUNTRY_LIFECYCLE_VALUES).default("draft").notNull(),
  defaultTimezone: varchar("defaultTimezone", { length: 80 }).notNull(),
  active: boolean("active").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("countries_iso2_unique").on(table.iso2), uniqueIndex("countries_iso3_unique").on(table.iso3), index("countries_lifecycle_idx").on(table.lifecycleStatus, table.active)]);

/** Currency metadata allows honest configured display without exchange-rate conversion or live payment claims. */
export const currencies = mysqlTable("currencies", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 3 }).notNull(),
  displayName: varchar("displayName", { length: 120 }).notNull(),
  symbol: varchar("symbol", { length: 12 }),
  minorUnit: int("minorUnit").default(2).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("currencies_code_unique").on(table.code)]);

/** Supported locales are declarations only; missing copy falls back to English rather than exposing keys. */
export const locales = mysqlTable("locales", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 16 }).notNull(),
  displayName: varchar("displayName", { length: 120 }).notNull(),
  direction: mysqlEnum("direction", ["ltr", "rtl"]).default("ltr").notNull(),
  status: mysqlEnum("status", ["available", "coming_soon", "requires_configuration"]).default("coming_soon").notNull(),
  fallbackLocaleCode: varchar("fallbackLocaleCode", { length: 16 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("locales_code_unique").on(table.code)]);

export const countryCurrencies = mysqlTable("country_currencies", {
  id: int("id").autoincrement().primaryKey(),
  countryId: int("countryId").notNull().references(() => countries.id, { onDelete: "cascade" }),
  currencyId: int("currencyId").notNull().references(() => currencies.id, { onDelete: "cascade" }),
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("country_currency_unique").on(table.countryId, table.currencyId), index("country_currency_default_idx").on(table.countryId, table.isDefault)]);

/** Versioned rollout configuration makes country availability explicit; none of these fields imply a live provider. */
export const countryPolicies = mysqlTable("country_policies", {
  id: int("id").autoincrement().primaryKey(),
  countryId: int("countryId").notNull().references(() => countries.id, { onDelete: "cascade" }),
  policyVersion: varchar("policyVersion", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["draft", "active", "retired"]).default("draft").notNull(),
  signupAvailability: mysqlEnum("signupAvailability", FEATURE_AVAILABILITY_VALUES).default("unavailable").notNull(),
  discoveryAvailability: mysqlEnum("discoveryAvailability", FEATURE_AVAILABILITY_VALUES).default("unavailable").notNull(),
  verificationAvailability: mysqlEnum("verificationAvailability", FEATURE_AVAILABILITY_VALUES).default("requires_configuration").notNull(),
  paymentAvailability: mysqlEnum("paymentAvailability", FEATURE_AVAILABILITY_VALUES).default("unavailable").notNull(),
  notificationAvailability: mysqlEnum("notificationAvailability", FEATURE_AVAILABILITY_VALUES).default("requires_configuration").notNull(),
  phoneVerificationAvailability: mysqlEnum("phoneVerificationAvailability", FEATURE_AVAILABILITY_VALUES).default("requires_configuration").notNull(),
  supportedLocaleCodes: json("supportedLocaleCodes").notNull(),
  supportedNotificationChannels: json("supportedNotificationChannels").notNull(),
  privacyConfiguration: json("privacyConfiguration").notNull(),
  verificationConfiguration: json("verificationConfiguration").notNull(),
  paymentConfiguration: json("paymentConfiguration").notNull(),
  activatedAt: timestamp("activatedAt"),
  createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("country_policy_version_unique").on(table.countryId, table.policyVersion), index("country_policy_status_idx").on(table.countryId, table.status, table.activatedAt)]);

/** Append-oriented country lifecycle events contain operational metadata only, never legal or data-residency claims. */
export const countryEvents = mysqlTable("country_events", {
  id: int("id").autoincrement().primaryKey(),
  countryId: int("countryId").notNull().references(() => countries.id, { onDelete: "cascade" }),
  actorUserId: int("actorUserId").references(() => users.id, { onDelete: "set null" }),
  eventType: mysqlEnum("eventType", ["created", "configured", "submitted_for_review", "approved", "activated", "paused", "deactivated", "policy_activated"]).notNull(),
  safeMetadata: json("safeMetadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("country_events_country_idx").on(table.countryId, table.createdAt)]);

export const memberProfiles = mysqlTable(
  "member_profiles",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    firstName: varchar("firstName", { length: 80 }),
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
    residenceCountryId: int("residenceCountryId").references(() => countries.id, { onDelete: "set null" }),
    region: varchar("region", { length: 100 }),
    city: varchar("city", { length: 100 }),
    nationality: varchar("nationality", { length: 100 }),
    languages: json("languages"),
    timezone: varchar("timezone", { length: 80 }).default("Africa/Banjul").notNull(),
    interfaceLocale: varchar("interfaceLocale", { length: 16 }).default("en").notNull(),
    locationVisibility: mysqlEnum("locationVisibility", ["eligible_members", "matches_only", "family_circle", "hidden"]).default("eligible_members").notNull(),
    locationDetailLevel: mysqlEnum("locationDetailLevel", ["country", "region", "city"]).default("country").notNull(),
    maritalStatus: mysqlEnum("maritalStatus", ["never_married", "married", "divorced", "widowed"]),
    educationLevel: varchar("educationLevel", { length: 100 }),
    educationField: varchar("educationField", { length: 120 }),
    educationInstitution: varchar("educationInstitution", { length: 160 }),
    profession: varchar("profession", { length: 160 }),
    employmentStatus: mysqlEnum("employmentStatus", ["employed", "self_employed", "student", "seeking_work", "retired", "prefer_not_to_say"]),
    industry: varchar("industry", { length: 120 }),
    personality: text("personality"),
    interests: json("interests"),
    hobbies: json("hobbies"),
    marriageTimeline: varchar("marriageTimeline", { length: 100 }),
    marriageIntent: varchar("marriageIntent", { length: 255 }),
    marriageExpectations: text("marriageExpectations"),
    reasonSeekingMarriage: text("reasonSeekingMarriage"),
    relocationWillingness: mysqlEnum("relocationWillingness", ["open", "within_gambia", "not_open", "discuss"]),
    polygynyOpenness: mysqlEnum("polygynyOpenness", ["open", "not_open", "discuss", "not_applicable"]),
    hasChildren: boolean("hasChildren").default(false).notNull(),
    desireChildren: mysqlEnum("desireChildren", ["yes", "no", "open", "private"]),
    familyInvolvementPreference: mysqlEnum("familyInvolvementPreference", ["active", "limited", "optional", "private"]),
    smokingPreference: mysqlEnum("smokingPreference", ["no", "occasionally", "yes", "private"]),
    alcoholPreference: mysqlEnum("alcoholPreference", ["no", "occasionally", "yes", "private"]),
    about: text("about"),
    familyBackground: text("familyBackground"),
    lifestyle: text("lifestyle"),
    values: text("values"),
    importantPrinciples: text("importantPrinciples"),
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
    index("member_profiles_residence_country_idx").on(table.residenceCountryId, table.profileStatus, table.searchVisible),
  ],
);

/** Member account lifecycle is separate from matrimonial profile content. Pending deletion is a request, never an automatic record purge. */
export const memberAccountStates = mysqlTable("member_account_states", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  lifecycleStatus: mysqlEnum("lifecycleStatus", ["active", "paused", "deletion_requested"]).default("active").notNull(),
  previousProfileStatus: mysqlEnum("previousProfileStatus", ["draft", "under_review", "active", "paused", "suspended"]),
  previousSearchVisible: boolean("previousSearchVisible"),
  pausedAt: timestamp("pausedAt"),
  deletionRequestedAt: timestamp("deletionRequestedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("member_account_states_user_unique").on(table.userId), index("member_account_states_lifecycle_idx").on(table.lifecycleStatus, table.updatedAt)]);

/** A member can request an export or deletion review, but a request never claims that a file was produced or records were erased. */
export const memberDataRightsRequests = mysqlTable("member_data_rights_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  requestType: mysqlEnum("requestType", ["data_export", "account_deletion"]).notNull(),
  status: mysqlEnum("status", ["requested", "processing", "ready", "expired", "cancelled", "unavailable", "failed"]).default("requested").notNull(),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  cancelledAt: timestamp("cancelledAt"),
  expiresAt: timestamp("expiresAt"),
  safeSummary: json("safeSummary"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("member_data_rights_user_status_idx").on(table.userId, table.requestType, table.status, table.updatedAt)]);

/** Append-only member lifecycle evidence excludes credentials, documents, message content, staff notes, and safety detail. */
export const memberAccountEvents = mysqlTable("member_account_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventType: mysqlEnum("eventType", ["account_paused", "account_reactivated", "deletion_requested", "deletion_cancelled", "data_export_requested", "data_request_cancelled"]).notNull(),
  requestId: int("requestId").references(() => memberDataRightsRequests.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("member_account_events_user_idx").on(table.userId, table.createdAt)]);

/** Observed member sessions are derived from real authenticated request hashes; raw cookies, IPs, device details, and locations are never stored. */
export const memberSecuritySessions = mysqlTable("member_security_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionReferenceHash: varchar("sessionReferenceHash", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["active", "revoked", "expired"]).default("active").notNull(),
  issuedAt: timestamp("issuedAt").defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  revokedAt: timestamp("revokedAt"),
  revokedByUserId: int("revokedByUserId").references(() => users.id, { onDelete: "set null" }),
  reauthenticatedAt: timestamp("reauthenticatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("mss_reference_unique").on(table.sessionReferenceHash), index("mss_user_status_idx").on(table.userId, table.status, table.lastSeenAt)]);

/** Origins may be multiple but remain private unless existing field-level visibility grants an audience. */
export const memberProfileOrigins = mysqlTable("member_profile_origins", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
  countryId: int("countryId").notNull().references(() => countries.id, { onDelete: "restrict" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("member_origin_unique").on(table.profileId, table.countryId), index("member_origin_country_idx").on(table.countryId, table.profileId)]);

/** Private international account settings hold phone normalization and optional self-identification, never a public phone directory. */
export const memberInternationalSettings = mysqlTable("member_international_settings", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
  diasporaStatus: mysqlEnum("diasporaStatus", ["living_in_gambia", "living_outside_gambia", "gambian_diaspora", "international_member"]).default("living_in_gambia").notNull(),
  normalizedPhone: varchar("normalizedPhone", { length: 32 }),
  phoneCountryId: int("phoneCountryId").references(() => countries.id, { onDelete: "set null" }),
  phoneVerificationStatus: mysqlEnum("phoneVerificationStatus", ["not_started", "unavailable", "pending", "verified"]).default("not_started").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("member_intl_settings_profile_unique").on(table.profileId), index("member_intl_phone_country_idx").on(table.phoneCountryId, table.phoneVerificationStatus)]);

/** Cross-border preference data is voluntary and logistics-focused; it is not a prestige or member-ranking model. */
export const memberInternationalPreferences = mysqlTable("member_international_preferences", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
  longDistancePreference: mysqlEnum("longDistancePreference", ["open", "prefer_nearby", "no_preference"]).default("no_preference").notNull(),
  futureResidenceOptions: json("futureResidenceOptions").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("member_intl_preferences_profile_unique").on(table.profileId)]);

export const memberPreferredCountries = mysqlTable("member_preferred_countries", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
  countryId: int("countryId").notNull().references(() => countries.id, { onDelete: "restrict" }),
  preferencePurpose: mysqlEnum("preferencePurpose", ["discovery", "future_residence"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("member_pref_country_unique").on(table.profileId, table.countryId, table.preferencePurpose), index("member_pref_country_lookup_idx").on(table.countryId, table.preferencePurpose)]);

export const memberPreferences = mysqlTable(
  "member_preferences",
  {
    id: int("id").autoincrement().primaryKey(),
    profileId: int("profileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
    minAge: int("minAge"),
    maxAge: int("maxAge"),
    preferredReligions: json("preferredReligions"),
    preferredGenders: json("preferredGenders"),
    preferredLocations: json("preferredLocations"),
    preferredMaritalStatuses: json("preferredMaritalStatuses"),
    childrenPreference: mysqlEnum("childrenPreference", ["open", "prefer_no_children", "open_to_children", "not_important"]),
    desiredChildrenPreference: mysqlEnum("desiredChildrenPreference", ["yes", "no", "open", "not_important"]),
    preferredRelocation: json("preferredRelocation"),
    preferredTribes: json("preferredTribes"),
    preferredEducationLevels: json("preferredEducationLevels"),
    preferredMarriageTimelines: json("preferredMarriageTimelines"),
    preferredPolygynyOpenness: json("preferredPolygynyOpenness"),
    preferredFamilyInvolvement: json("preferredFamilyInvolvement"),
    lifestylePreferences: json("lifestylePreferences"),
    preferenceImportance: json("preferenceImportance"),
    marriageIntent: text("marriageIntent"),
    mustHaves: text("mustHaves"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("member_preferences_profile_unique").on(table.profileId)],
);

/** Member-owned discovery controls. These are filters only; they do not alter eligibility, ordering policy, or other members' privacy. */
export const memberDiscoveryFilters = mysqlTable(
  "member_discovery_filters",
  {
    id: int("id").autoincrement().primaryKey(),
    profileId: int("profileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
    query: varchar("query", { length: 80 }),
    minAge: int("minAge"),
    maxAge: int("maxAge"),
    gender: mysqlEnum("gender", ["woman", "man", "self_described"]),
    religion: mysqlEnum("religion", ["muslim", "christian"]),
    country: varchar("country", { length: 100 }),
    residenceType: mysqlEnum("residenceType", ["gambia", "diaspora"]),
    maritalStatus: mysqlEnum("maritalStatus", ["never_married", "married", "divorced", "widowed"]),
    hasChildren: boolean("hasChildren"),
    relocationWillingness: mysqlEnum("relocationWillingness", ["open", "within_gambia", "not_open", "discuss"]),
    polygynyOpenness: mysqlEnum("polygynyOpenness", ["open", "not_open", "discuss", "not_applicable"]),
    verifiedOnly: boolean("verifiedOnly").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("member_discovery_filters_profile_unique").on(table.profileId)],
);

/** Per-field profile audiences; absent rows use the privacy-preserving service defaults. */
export const profileFieldVisibilities = mysqlTable(
  "profile_field_visibilities",
  {
    id: int("id").autoincrement().primaryKey(),
    profileId: int("profileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
    fieldKey: varchar("fieldKey", { length: 80 }).notNull(),
    audience: mysqlEnum("audience", ["public", "verified_members", "potential_matches", "matched_members", "family_circle", "private", "admin_restricted"])
      .default("potential_matches")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("profile_field_visibility_unique").on(table.profileId, table.fieldKey),
    index("profile_field_visibility_lookup_idx").on(table.profileId, table.audience),
  ],
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
    reviewedByUserId: int("reviewedByUserId").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewedAt"),
    reviewNote: varchar("reviewNote", { length: 500 }),
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
    status: mysqlEnum("status", ["not_started", "submitted", "under_review", "approved", "rejected", "requires_resubmission", "escalated", "expired"])
      .default("not_started")
      .notNull(),
    documentStorageKey: varchar("documentStorageKey", { length: 512 }),
    documentType: mysqlEnum("documentType", ["national_id", "passport"]),
    providerReference: varchar("providerReference", { length: 255 }),
    reviewNotes: text("reviewNotes"),
    reviewReason: mysqlEnum("reviewReason", ["document_unclear", "document_expired", "document_unsupported", "information_mismatch", "image_quality_insufficient", "verification_image_insufficient", "suspected_duplicate", "suspected_fraud", "requires_additional_review", "other"]),
    memberMessage: varchar("memberMessage", { length: 500 }),
    priority: mysqlEnum("priority", ["standard", "attention", "high"])
      .default("standard")
      .notNull(),
    assignedReviewerUserId: int("assignedReviewerUserId").references(() => users.id, { onDelete: "set null" }),
    reviewedByUserId: int("reviewedByUserId").references(() => users.id, { onDelete: "set null" }),
    submittedAt: timestamp("submittedAt"),
    reviewedAt: timestamp("reviewedAt"),
    escalatedAt: timestamp("escalatedAt"),
    closedAt: timestamp("closedAt"),
    expiresAt: timestamp("expiresAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("verification_records_profile_idx").on(table.profileId, table.status),
    index("verification_records_queue_idx").on(table.status, table.priority, table.submittedAt),
    index("verification_records_assignee_idx").on(table.assignedReviewerUserId, table.status),
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
    preferredContactMethod: mysqlEnum("preferredContactMethod", ["email", "phone"]).default("email").notNull(),
    familyParticipantUserId: int("familyParticipantUserId").references(() => users.id, { onDelete: "set null" }),
    status: mysqlEnum("status", ["draft", "invited", "accepted", "declined", "pending_verification", "verified", "unverified", "suspended", "removed", "revoked"]).default("draft").notNull(),
    waliVerificationStatus: mysqlEnum("waliVerificationStatus", ["not_required", "pending", "verified", "unverified"]).default("not_required").notNull(),
    invitationCodeHash: varchar("invitationCodeHash", { length: 128 }),
    invitationExpiresAt: timestamp("invitationExpiresAt"),
    canReceiveMatchNotifications: boolean("canReceiveMatchNotifications").default(false).notNull(),
    consentedAt: timestamp("consentedAt"),
    invitedAt: timestamp("invitedAt"),
    acceptedAt: timestamp("acceptedAt"),
    declinedAt: timestamp("declinedAt"),
    restrictedAt: timestamp("restrictedAt"),
    removedAt: timestamp("removedAt"),
    revokedAt: timestamp("revokedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("family_links_profile_idx").on(table.memberProfileId, table.status), uniqueIndex("family_links_invite_code_unique").on(table.invitationCodeHash), index("family_links_participant_idx").on(table.familyParticipantUserId, table.status)],
);

export const familyPermissions = mysqlTable(
  "family_permissions",
  {
    id: int("id").autoincrement().primaryKey(),
    familyLinkId: int("familyLinkId").notNull().references(() => familyLinks.id, { onDelete: "cascade" }),
    permission: mysqlEnum("permission", ["profile_basics", "profile_photo", "marriage_intentions", "compatibility_summary", "family_context", "potential_match", "acknowledgment_status"]).notNull(),
    isGranted: boolean("isGranted").default(false).notNull(),
    grantedAt: timestamp("grantedAt"),
    revokedAt: timestamp("revokedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("family_permissions_link_permission_unique").on(table.familyLinkId, table.permission), index("family_permissions_link_idx").on(table.familyLinkId, table.isGranted)],
);

export const familyShares = mysqlTable(
  "family_shares",
  {
    id: int("id").autoincrement().primaryKey(),
    familyLinkId: int("familyLinkId").notNull().references(() => familyLinks.id, { onDelete: "cascade" }),
    sharedProfileId: int("sharedProfileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", ["active", "withdrawn", "expired"]).default("active").notNull(),
    expiresAt: timestamp("expiresAt"),
    withdrawnAt: timestamp("withdrawnAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("family_shares_link_idx").on(table.familyLinkId, table.status), uniqueIndex("family_shares_active_pair_unique").on(table.familyLinkId, table.sharedProfileId, table.status)],
);

export const familyAcknowledgments = mysqlTable(
  "family_acknowledgments",
  {
    id: int("id").autoincrement().primaryKey(),
    familyShareId: int("familyShareId").notNull().references(() => familyShares.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", ["requested", "acknowledged", "declined", "withdrawn", "expired"]).default("requested").notNull(),
    requestedAt: timestamp("requestedAt").defaultNow().notNull(),
    respondedAt: timestamp("respondedAt"),
    withdrawnAt: timestamp("withdrawnAt"),
    expiresAt: timestamp("expiresAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("family_acknowledgments_share_idx").on(table.familyShareId, table.status), uniqueIndex("family_acknowledgments_pending_share_unique").on(table.familyShareId, table.status)],
);

export const familyFeedback = mysqlTable(
  "family_feedback",
  {
    id: int("id").autoincrement().primaryKey(),
    familyShareId: int("familyShareId").notNull().references(() => familyShares.id, { onDelete: "cascade" }),
    familyLinkId: int("familyLinkId").notNull().references(() => familyLinks.id, { onDelete: "cascade" }),
    response: mysqlEnum("response", ["acknowledged", "interested_to_learn_more", "has_concerns", "decline_to_comment"]).notNull(),
    note: varchar("note", { length: 1200 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("family_feedback_share_idx").on(table.familyShareId, table.createdAt), uniqueIndex("family_feedback_share_link_unique").on(table.familyShareId, table.familyLinkId)],
);

export const familyEvents = mysqlTable(
  "family_events",
  {
    id: int("id").autoincrement().primaryKey(),
    familyLinkId: int("familyLinkId").notNull().references(() => familyLinks.id, { onDelete: "cascade" }),
    actorUserId: int("actorUserId").references(() => users.id, { onDelete: "set null" }),
    eventType: mysqlEnum("eventType", ["invitation_sent", "invitation_accepted", "invitation_declined", "invitation_revoked", "permission_granted", "permission_revoked", "match_shared", "share_withdrawn", "acknowledgment_requested", "acknowledgment_submitted", "feedback_submitted", "participant_removed", "access_restricted", "report_submitted"]).notNull(),
    details: json("details"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("family_events_link_idx").on(table.familyLinkId, table.createdAt)],
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
    status: mysqlEnum("status", ["mutual_interest", "active", "paused", "archived", "blocked", "reported", "restricted", "closed"]).default("mutual_interest").notNull(),
    mutualInterestAt: timestamp("mutualInterestAt").defaultNow().notNull(),
    lastMessageAt: timestamp("lastMessageAt"),
    lastActivityAt: timestamp("lastActivityAt"),
    restrictedAt: timestamp("restrictedAt"),
	    safetyRestrictionActionId: int("safetyRestrictionActionId"),
    closedAt: timestamp("closedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("conversations_match_unique").on(table.matchId), index("conversations_status_activity_idx").on(table.status, table.lastActivityAt)],
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
    mimeType: varchar("mimeType", { length: 100 }),
    durationSeconds: int("durationSeconds"),
    deliveryStatus: mysqlEnum("deliveryStatus", ["sent", "delivered", "failed"]).default("sent").notNull(),
    deliveredAt: timestamp("deliveredAt"),
    failureReason: varchar("failureReason", { length: 500 }),
    retryOfMessageId: int("retryOfMessageId"),
    clientRequestId: varchar("clientRequestId", { length: 96 }),
    requestFingerprint: varchar("requestFingerprint", { length: 64 }),
    moderationStatus: mysqlEnum("moderationStatus", ["normal", "flagged", "under_review", "restricted"]).default("normal").notNull(),
    reportCount: int("reportCount").default(0).notNull(),
    metadata: json("metadata"),
    readAt: timestamp("readAt"),
    deletedAt: timestamp("deletedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("messages_conversation_idx").on(table.conversationId, table.createdAt), index("messages_sender_idx").on(table.senderProfileId, table.createdAt), uniqueIndex("messages_sender_conversation_client_request_unique").on(table.senderProfileId, table.conversationId, table.clientRequestId)],
);

export const messageReads = mysqlTable(
  "message_reads",
  {
    id: int("id").autoincrement().primaryKey(),
    messageId: int("messageId").notNull().references(() => messages.id, { onDelete: "cascade" }),
    readerProfileId: int("readerProfileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
    readAt: timestamp("readAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("message_reads_unique").on(table.messageId, table.readerProfileId), index("message_reads_reader_idx").on(table.readerProfileId, table.readAt)],
);

export const conversationPreferences = mysqlTable(
  "conversation_preferences",
  {
    id: int("id").autoincrement().primaryKey(),
    conversationId: int("conversationId").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    profileId: int("profileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
    isMuted: boolean("isMuted").default(false).notNull(),
    readReceiptsEnabled: boolean("readReceiptsEnabled").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("conversation_preferences_unique").on(table.conversationId, table.profileId), index("conversation_preferences_profile_idx").on(table.profileId, table.isMuted)],
);

export const conversationEvents = mysqlTable(
  "conversation_events",
  {
    id: int("id").autoincrement().primaryKey(),
    conversationId: int("conversationId").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    actorProfileId: int("actorProfileId").references(() => memberProfiles.id, { onDelete: "set null" }),
    eventType: mysqlEnum("eventType", ["mutual_interest", "conversation_started", "message_sent", "voice_note_sent", "message_deduplicated", "message_request_conflict", "message_read", "conversation_paused", "conversation_restricted", "conversation_closed", "safety_reported", "member_blocked"])
      .notNull(),
    metadata: json("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("conversation_events_timeline_idx").on(table.conversationId, table.createdAt), index("conversation_events_actor_idx").on(table.actorProfileId, table.eventType, table.createdAt)],
);

/** Activity indicators for Phase 5 analysis; never a score and never an automatic permission trigger. */
export const conversationInteractionSignals = mysqlTable(
  "conversation_interaction_signals",
  {
    id: int("id").autoincrement().primaryKey(),
    conversationId: int("conversationId").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    profileId: int("profileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
    firstParticipatedAt: timestamp("firstParticipatedAt"),
    lastParticipatedAt: timestamp("lastParticipatedAt"),
    messagesSent: int("messagesSent").default(0).notNull(),
    voiceNotesSent: int("voiceNotesSent").default(0).notNull(),
    readEvents: int("readEvents").default(0).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("conversation_interaction_signals_unique").on(table.conversationId, table.profileId), index("conversation_interaction_profile_idx").on(table.profileId, table.lastParticipatedAt)],
);

/** Configurable policy values for connection readiness. Thresholds are evidence gates, never scores. */
export const connectionReadinessPolicies = mysqlTable(
  "connection_readiness_policies",
  {
    id: int("id").autoincrement().primaryKey(),
    policyName: varchar("policyName", { length: 120 }).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    stageConfig: json("stageConfig").notNull(),
    thresholdConfig: json("thresholdConfig").notNull(),
    requireIdentityVerification: boolean("requireIdentityVerification").default(true).notNull(),
    requireVoiceNotesForReview: boolean("requireVoiceNotesForReview").default(true).notNull(),
    requireHumanReviewForVoice: boolean("requireHumanReviewForVoice").default(false).notNull(),
    requireHumanReviewForVideo: boolean("requireHumanReviewForVideo").default(true).notNull(),
    updatedByUserId: int("updatedByUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("connection_readiness_policy_active_idx").on(table.isActive, table.updatedAt)],
);

/** Current state for one match conversation; stores explainable gate outcomes, never a relationship score. */
export const connectionStates = mysqlTable(
  "connection_states",
  {
    id: int("id").autoincrement().primaryKey(),
    conversationId: int("conversationId").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    policyId: int("policyId").references(() => connectionReadinessPolicies.id, { onDelete: "set null" }),
    stage: mysqlEnum("stage", ["mutual_interest", "text_conversation", "voice_note_conversation", "ready_for_review", "voice_call_eligible", "video_call_eligible"]).default("mutual_interest").notNull(),
    status: mysqlEnum("status", ["not_ready", "building_connection", "ready_for_review", "approved_voice", "approved_video", "declined", "paused", "restricted", "revoked"]).default("not_ready").notNull(),
    readinessSummary: json("readinessSummary"),
    policySnapshot: json("policySnapshot"),
    reviewRequired: boolean("reviewRequired").default(false).notNull(),
    voiceEligible: boolean("voiceEligible").default(false).notNull(),
    videoEligible: boolean("videoEligible").default(false).notNull(),
    lastEvaluatedAt: timestamp("lastEvaluatedAt"),
    approvedAt: timestamp("approvedAt"),
    pausedAt: timestamp("pausedAt"),
    restrictedAt: timestamp("restrictedAt"),
    revokedAt: timestamp("revokedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("connection_states_conversation_unique").on(table.conversationId), index("connection_states_status_idx").on(table.status, table.reviewRequired, table.updatedAt)],
);

export const connectionConsents = mysqlTable(
  "connection_consents",
  {
    id: int("id").autoincrement().primaryKey(),
    connectionStateId: int("connectionStateId").notNull().references(() => connectionStates.id, { onDelete: "cascade" }),
    profileId: int("profileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
    capability: mysqlEnum("capability", ["voice", "video"]).notNull(),
    status: mysqlEnum("status", ["pending", "granted", "withdrawn", "declined"]).default("pending").notNull(),
    grantedAt: timestamp("grantedAt"),
    withdrawnAt: timestamp("withdrawnAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("connection_consents_unique").on(table.connectionStateId, table.profileId, table.capability), index("connection_consents_profile_idx").on(table.profileId, table.capability, table.status)],
);

/** Future provider-facing capability state. This phase grants no calls and stores no provider credentials. */
export const communicationPermissions = mysqlTable(
  "communication_permissions",
  {
    id: int("id").autoincrement().primaryKey(),
    connectionStateId: int("connectionStateId").notNull().references(() => connectionStates.id, { onDelete: "cascade" }),
    capability: mysqlEnum("capability", ["voice", "video"]).notNull(),
    status: mysqlEnum("status", ["unavailable", "available", "paused", "revoked"]).default("unavailable").notNull(),
    providerReference: varchar("providerReference", { length: 255 }),
    availableAt: timestamp("availableAt"),
    revokedAt: timestamp("revokedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("communication_permissions_unique").on(table.connectionStateId, table.capability), index("communication_permissions_status_idx").on(table.status, table.capability)],
);

export const connectionReviews = mysqlTable(
  "connection_reviews",
  {
    id: int("id").autoincrement().primaryKey(),
    connectionStateId: int("connectionStateId").notNull().references(() => connectionStates.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", ["pending", "approved_voice", "approved_video", "declined", "restricted", "revoked", "escalated"]).default("pending").notNull(),
    reason: mysqlEnum("reason", ["safety_signal", "fraud_concern", "open_report", "ambiguous_criteria", "policy_requirement", "other"]),
    assignedReviewerUserId: int("assignedReviewerUserId").references(() => users.id, { onDelete: "set null" }),
    reviewedByUserId: int("reviewedByUserId").references(() => users.id, { onDelete: "set null" }),
    memberMessage: varchar("memberMessage", { length: 500 }),
    internalNote: text("internalNote"),
    reviewedAt: timestamp("reviewedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("connection_reviews_queue_idx").on(table.status, table.createdAt), index("connection_reviews_assignee_idx").on(table.assignedReviewerUserId, table.status)],
);

export const connectionEvents = mysqlTable(
  "connection_events",
  {
    id: int("id").autoincrement().primaryKey(),
    connectionStateId: int("connectionStateId").notNull().references(() => connectionStates.id, { onDelete: "cascade" }),
    actorProfileId: int("actorProfileId").references(() => memberProfiles.id, { onDelete: "set null" }),
    actorUserId: int("actorUserId").references(() => users.id, { onDelete: "set null" }),
    eventType: mysqlEnum("eventType", ["evaluated", "ready_for_review", "voice_consent_granted", "voice_consent_withdrawn", "video_consent_granted", "video_consent_withdrawn", "voice_approved", "video_approved", "review_escalated", "restricted", "revoked", "paused"])
      .notNull(),
    metadata: json("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("connection_events_state_idx").on(table.connectionStateId, table.createdAt)],
);

export const communicationRevocations = mysqlTable(
  "communication_revocations",
  {
    id: int("id").autoincrement().primaryKey(),
    connectionStateId: int("connectionStateId").notNull().references(() => connectionStates.id, { onDelete: "cascade" }),
    capability: mysqlEnum("capability", ["voice", "video", "all"]).default("all").notNull(),
    reason: mysqlEnum("reason", ["member_withdrew_consent", "block", "open_report", "safety_restriction", "account_suspended", "hard_incompatibility", "manual_review", "other"]).notNull(),
    actorProfileId: int("actorProfileId").references(() => memberProfiles.id, { onDelete: "set null" }),
    actorUserId: int("actorUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("communication_revocations_state_idx").on(table.connectionStateId, table.createdAt)],
);

export const reports = mysqlTable(
  "reports",
  {
    id: int("id").autoincrement().primaryKey(),
	    reporterProfileId: int("reporterProfileId").references(() => memberProfiles.id, { onDelete: "set null" }),
	    reportedProfileId: int("reportedProfileId").references(() => memberProfiles.id, { onDelete: "set null" }),
	    reportedFamilyLinkId: int("reportedFamilyLinkId").references(() => familyLinks.id, { onDelete: "set null" }),
	    conversationId: int("conversationId").references(() => conversations.id, { onDelete: "set null" }),
    messageId: int("messageId").references(() => messages.id, { onDelete: "set null" }),
    reason: mysqlEnum("reason", ["fake_profile", "impersonation", "scam", "harassment", "threatening_behavior", "inappropriate_content", "financial_solicitation", "misrepresentation", "unwanted_contact", "block_circumvention", "verification_concern", "multiple_account_concern", "suspicious_behavior", "safety_concern", "other"]).notNull(),
    details: text("details"),
    status: mysqlEnum("status", ["open", "triage", "in_review", "investigating", "awaiting_information", "action_required", "decision_pending", "resolved", "dismissed", "escalated", "appealed", "reopened", "closed"]).default("open").notNull(),
    priority: mysqlEnum("priority", ["low", "normal", "high", "critical"]).default("normal").notNull(),
	    caseSource: mysqlEnum("caseSource", ["member_report", "system_signal", "staff_observation"]).default("member_report").notNull(),
	    policyVersion: varchar("policyVersion", { length: 64 }),
	    appealEligible: boolean("appealEligible").default(false).notNull(),
	    memberSafeSummary: varchar("memberSafeSummary", { length: 500 }),
    assignedModeratorUserId: int("assignedModeratorUserId").references(() => users.id, { onDelete: "set null" }),
	    memberAction: mysqlEnum("memberAction", ["none", "warn", "restrict", "temporary_suspend"])
	      .default("none")
	      .notNull(),
	    memberMessage: varchar("memberMessage", { length: 500 }),
	    resolution: varchar("resolution", { length: 500 }),
	    clientRequestId: varchar("clientRequestId", { length: 96 }),
	    memberUpdatedAt: timestamp("memberUpdatedAt"),
	    memberWithdrawnAt: timestamp("memberWithdrawnAt"),
	    reviewedByUserId: int("reviewedByUserId").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
	  table => [
	    index("reports_queue_idx").on(table.status, table.priority, table.createdAt),
	    index("reports_assignee_idx").on(table.assignedModeratorUserId, table.status),
	    index("reports_family_link_idx").on(table.reportedFamilyLinkId, table.status),
	    uniqueIndex("reports_reporter_request_unique").on(table.reporterProfileId, table.clientRequestId),
	  ],
);

/** Internal-only operational notes. Case IDs are intentionally polymorphic to avoid duplicating note structures. */
export const caseNotes = mysqlTable(
  "case_notes",
  {
    id: int("id").autoincrement().primaryKey(),
	    caseType: mysqlEnum("caseType", ["verification", "report", "connection_review"]).notNull(),
    caseId: int("caseId").notNull(),
    authorUserId: int("authorUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("case_notes_case_idx").on(table.caseType, table.caseId, table.createdAt)],
);

/** Versioned integrity configuration. It deliberately contains no member score, protected-characteristic rule, premium rule, or engagement weighting. */
export const integrityPolicies = mysqlTable(
  "integrity_policies",
  {
    id: int("id").autoincrement().primaryKey(),
    policyVersion: varchar("policyVersion", { length: 64 }).notNull(),
    status: mysqlEnum("status", ["draft", "active", "retired"]).default("draft").notNull(),
    ruleConfiguration: json("ruleConfiguration").notNull(),
    retentionConfiguration: json("retentionConfiguration").notNull(),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    activatedAt: timestamp("activatedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("integrity_policies_version_unique").on(table.policyVersion), index("integrity_policies_status_idx").on(table.status, table.activatedAt)],
);

/** Explainable operational signals are review prompts, not proof and never a composite risk score. */
export const integritySignals = mysqlTable(
  "integrity_signals",
  {
    id: int("id").autoincrement().primaryKey(),
    subjectProfileId: int("subjectProfileId").references(() => memberProfiles.id, { onDelete: "set null" }),
    reportId: int("reportId").references(() => reports.id, { onDelete: "set null" }),
    source: mysqlEnum("source", ["member_report", "staff_observation", "verification", "account_security", "messaging", "family_circle", "connection_readiness", "payment", "platform_rule", "policy_violation"]).notNull(),
    category: mysqlEnum("category", ["account_behavior", "verification_anomaly", "messaging_behavior", "report_pattern", "block_pattern", "family_circle_behavior", "recommendation_abuse", "connection_readiness_abuse", "payment_abuse", "account_security", "session_anomaly", "multiple_account_indicator", "rapid_profile_change", "invitation_behavior", "repeated_policy_violation", "financial_solicitation", "other"]).notNull(),
    severity: mysqlEnum("severity", ["informational", "low", "medium", "high", "critical"]).default("informational").notNull(),
    evidenceConfidence: mysqlEnum("evidenceConfidence", ["unverified", "limited", "corroborated", "strong"]).default("unverified").notNull(),
    status: mysqlEnum("status", ["new", "triaged", "monitoring", "investigating", "dismissed", "actioned"]).default("new").notNull(),
    policyVersion: varchar("policyVersion", { length: 64 }),
    idempotencyKey: varchar("idempotencyKey", { length: 191 }).notNull(),
    safeMetadata: json("safeMetadata"),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    reviewedAt: timestamp("reviewedAt"),
  },
  table => [uniqueIndex("integrity_signals_idempotency_unique").on(table.idempotencyKey), index("integrity_signals_subject_idx").on(table.subjectProfileId, table.status, table.createdAt), index("integrity_signals_case_idx").on(table.reportId, table.severity, table.createdAt)],
);

/** Controlled evidence points to authorized records instead of duplicating messages, documents, payment details, or family content. */
export const safetyEvidence = mysqlTable(
  "safety_evidence",
  {
    id: int("id").autoincrement().primaryKey(),
    reportId: int("reportId").notNull().references(() => reports.id, { onDelete: "cascade" }),
    integritySignalId: int("integritySignalId").references(() => integritySignals.id, { onDelete: "set null" }),
    evidenceType: mysqlEnum("evidenceType", ["report_reference", "message_reference", "account_event", "verification_event", "payment_event", "family_event", "security_event", "staff_note", "integrity_signal"]).notNull(),
    sourceRecordType: varchar("sourceRecordType", { length: 80 }).notNull(),
    sourceRecordId: varchar("sourceRecordId", { length: 120 }).notNull(),
    evidenceConfidence: mysqlEnum("evidenceConfidence", ["unverified", "limited", "corroborated", "strong"]).default("unverified").notNull(),
    integrityState: mysqlEnum("integrityState", ["recorded", "superseded", "revoked"]).default("recorded").notNull(),
    capturedByUserId: int("capturedByUserId").references(() => users.id, { onDelete: "set null" }),
    capturedAt: timestamp("capturedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("safety_evidence_reference_unique").on(table.reportId, table.evidenceType, table.sourceRecordType, table.sourceRecordId), index("safety_evidence_case_idx").on(table.reportId, table.createdAt), index("safety_evidence_signal_idx").on(table.integritySignalId, table.createdAt)],
);

/** Each enforcement record is linked to the existing report-case, scoped, auditable, and reversible when temporary. */
export const safetyEnforcementActions = mysqlTable(
  "safety_enforcement_actions",
  {
    id: int("id").autoincrement().primaryKey(),
    reportId: int("reportId").notNull().references(() => reports.id, { onDelete: "cascade" }),
    subjectProfileId: int("subjectProfileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
    actionType: mysqlEnum("actionType", ["warning", "feature_restriction", "messaging_restriction", "connection_restriction", "temporary_suspension", "verification_hold", "integrity_hold", "permanent_account_removal"]).notNull(),
    status: mysqlEnum("status", ["proposed", "active", "expired", "revoked", "rejected", "completed"]).default("proposed").notNull(),
    scope: json("scope").notNull(),
    reasonCode: varchar("reasonCode", { length: 120 }).notNull(),
    memberSafeMessage: varchar("memberSafeMessage", { length: 500 }).notNull(),
    policyVersion: varchar("policyVersion", { length: 64 }),
    requiresSecondApproval: boolean("requiresSecondApproval").default(false).notNull(),
    requestedByUserId: int("requestedByUserId").notNull().references(() => users.id, { onDelete: "restrict" }),
    approvedByUserId: int("approvedByUserId").references(() => users.id, { onDelete: "set null" }),
    effectiveAt: timestamp("effectiveAt"),
    expiresAt: timestamp("expiresAt"),
    revokedAt: timestamp("revokedAt"),
    revokedByUserId: int("revokedByUserId").references(() => users.id, { onDelete: "set null" }),
    idempotencyKey: varchar("idempotencyKey", { length: 191 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("safety_enforcement_idempotency_unique").on(table.subjectProfileId, table.idempotencyKey), index("safety_enforcement_subject_idx").on(table.subjectProfileId, table.status, table.expiresAt), index("safety_enforcement_case_idx").on(table.reportId, table.status, table.createdAt)],
);

/** Appeals are member-owned submissions reviewed through a separate, auditable workflow and never disclose reporter identities or internal evidence. */
export const safetyAppeals = mysqlTable(
  "safety_appeals",
  {
    id: int("id").autoincrement().primaryKey(),
    reportId: int("reportId").notNull().references(() => reports.id, { onDelete: "cascade" }),
    enforcementActionId: int("enforcementActionId").notNull(),
    appellantUserId: int("appellantUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    status: mysqlEnum("status", ["submitted", "in_review", "information_requested", "upheld", "modified", "overturned", "withdrawn"]).default("submitted").notNull(),
    reviewerUserId: int("reviewerUserId").references(() => users.id, { onDelete: "set null" }),
    decisionSummary: varchar("decisionSummary", { length: 500 }),
    submittedAt: timestamp("submittedAt").defaultNow().notNull(),
    decidedAt: timestamp("decidedAt"),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [foreignKey({ columns: [table.enforcementActionId], foreignColumns: [safetyEnforcementActions.id], name: "safety_appeals_enforcement_fk" }).onDelete("cascade"), uniqueIndex("safety_appeals_action_appellant_unique").on(table.enforcementActionId, table.appellantUserId), index("safety_appeals_case_idx").on(table.reportId, table.status, table.submittedAt), index("safety_appeals_reviewer_idx").on(table.reviewerUserId, table.status)],
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

/** Commercial plans describe product functionality, never matrimonial suitability, safety, or consent. */
export const membershipPlans = mysqlTable(
  "membership_plans",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 64 }).notNull(),
    displayName: varchar("displayName", { length: 120 }).notNull(),
    membershipLevel: mysqlEnum("membershipLevel", ["free", "premium"]).notNull(),
    status: mysqlEnum("status", ["draft", "active", "archived"]).default("draft").notNull(),
    description: text("description"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("membership_plans_code_unique").on(table.code), index("membership_plans_level_status_idx").on(table.membershipLevel, table.status)],
);

/** Versioned plan terms preserve historical price and entitlement context for existing subscriptions. */
export const membershipPlanVersions = mysqlTable(
  "membership_plan_versions",
  {
    id: int("id").autoincrement().primaryKey(),
    membershipPlanId: int("membershipPlanId").notNull().references(() => membershipPlans.id, { onDelete: "restrict" }),
    versionCode: varchar("versionCode", { length: 80 }).notNull(),
    status: mysqlEnum("status", ["draft", "active", "retired"]).default("draft").notNull(),
    featureKeys: json("featureKeys").notNull(),
    renewalTerms: text("renewalTerms"),
    gracePeriodDays: int("gracePeriodDays").default(0).notNull(),
    graceEntitlementsActive: boolean("graceEntitlementsActive").default(false).notNull(),
    cancelAtPeriodEndAllowed: boolean("cancelAtPeriodEndAllowed").default(true).notNull(),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    activatedAt: timestamp("activatedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("membership_plan_versions_code_unique").on(table.versionCode), index("membership_plan_versions_plan_status_idx").on(table.membershipPlanId, table.status)],
);

/** Monetary amounts are stored only as minor integer units; client-side currency conversion is never authoritative. */
export const membershipPrices = mysqlTable(
  "membership_prices",
  {
    id: int("id").autoincrement().primaryKey(),
    membershipPlanVersionId: int("membershipPlanVersionId").notNull().references(() => membershipPlanVersions.id, { onDelete: "restrict" }),
    currency: varchar("currency", { length: 3 }).notNull(),
    amountMinor: int("amountMinor").notNull(),
    taxMinor: int("taxMinor").default(0).notNull(),
    billingInterval: mysqlEnum("billingInterval", ["monthly", "quarterly", "annual", "one_time"]).notNull(),
    provider: varchar("provider", { length: 80 }),
    providerPriceReference: varchar("providerPriceReference", { length: 255 }),
    status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
	    effectiveFrom: timestamp("effectiveFrom"),
	    effectiveUntil: timestamp("effectiveUntil"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("membership_prices_version_currency_interval_unique").on(table.membershipPlanVersionId, table.currency, table.billingInterval, table.provider), index("membership_prices_availability_idx").on(table.currency, table.status, table.billingInterval)],
);

export const subscriptions = mysqlTable(
  "subscriptions",
  {
    id: int("id").autoincrement().primaryKey(),
    profileId: int("profileId").references(() => memberProfiles.id, { onDelete: "set null" }),
    membershipPlanVersionId: int("membershipPlanVersionId").references(() => membershipPlanVersions.id, { onDelete: "restrict" }),
    plan: mysqlEnum("plan", ["free", "premium", "profile_review"]).default("free").notNull(),
    status: mysqlEnum("status", ["trial", "active", "past_due", "grace_period", "cancelled", "expired", "suspended", "refunded", "inactive"]).default("inactive").notNull(),
    provider: varchar("provider", { length: 80 }),
    providerReference: varchar("providerReference", { length: 255 }),
    providerCustomerReference: varchar("providerCustomerReference", { length: 255 }),
    autoRenew: boolean("autoRenew").default(true).notNull(),
    cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false).notNull(),
    startsAt: timestamp("startsAt"),
    endsAt: timestamp("endsAt"),
    currentPeriodStartsAt: timestamp("currentPeriodStartsAt"),
    currentPeriodEndsAt: timestamp("currentPeriodEndsAt"),
    gracePeriodEndsAt: timestamp("gracePeriodEndsAt"),
    cancelledAt: timestamp("cancelledAt"),
    endedAt: timestamp("endedAt"),
    suspendedAt: timestamp("suspendedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("subscriptions_profile_idx").on(table.profileId, table.status), index("subscriptions_plan_status_idx").on(table.membershipPlanVersionId, table.status)],
);

/** Provider-independent lifecycle record. It stores references and status only—never card numbers, CVVs, passwords, or secrets. */
export const paymentTransactions = mysqlTable(
  "payment_transactions",
  {
    id: int("id").autoincrement().primaryKey(),
    profileId: int("profileId").references(() => memberProfiles.id, { onDelete: "set null" }),
    subscriptionId: int("subscriptionId").references(() => subscriptions.id, { onDelete: "set null" }),
    membershipPriceId: int("membershipPriceId").references(() => membershipPrices.id, { onDelete: "set null" }),
    provider: varchar("provider", { length: 80 }).notNull(),
    internalReference: varchar("internalReference", { length: 96 }).notNull(),
    providerTransactionId: varchar("providerTransactionId", { length: 255 }),
    idempotencyKey: varchar("idempotencyKey", { length: 96 }).notNull(),
    transactionType: mysqlEnum("transactionType", ["initial", "renewal", "recovery", "manual_adjustment"]).default("initial").notNull(),
    status: mysqlEnum("status", ["created", "pending", "processing", "successful", "failed", "cancelled", "expired", "refunded", "partially_refunded", "disputed"]).default("created").notNull(),
    amountMinor: int("amountMinor").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    taxMinor: int("taxMinor").default(0).notNull(),
    feeMinor: int("feeMinor").default(0).notNull(),
    discountMinor: int("discountMinor").default(0).notNull(),
    failureCode: varchar("failureCode", { length: 120 }),
    failureMessage: varchar("failureMessage", { length: 500 }),
    completedAt: timestamp("completedAt"),
    providerVerifiedAt: timestamp("providerVerifiedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("payment_transactions_internal_reference_unique").on(table.internalReference), uniqueIndex("payment_transactions_idempotency_unique").on(table.idempotencyKey), uniqueIndex("payment_transactions_provider_reference_unique").on(table.provider, table.providerTransactionId), index("payment_transactions_profile_history_idx").on(table.profileId, table.createdAt), index("payment_transactions_reconcile_idx").on(table.provider, table.status, table.createdAt)],
);

export const paymentRefunds = mysqlTable(
  "payment_refunds",
  {
    id: int("id").autoincrement().primaryKey(),
    paymentTransactionId: int("paymentTransactionId").notNull().references(() => paymentTransactions.id, { onDelete: "restrict" }),
    providerRefundReference: varchar("providerRefundReference", { length: 255 }),
    status: mysqlEnum("status", ["requested", "processing", "succeeded", "failed", "cancelled"]).default("requested").notNull(),
    amountMinor: int("amountMinor").notNull(),
    reason: varchar("reason", { length: 500 }),
    requestedByUserId: int("requestedByUserId").references(() => users.id, { onDelete: "set null" }),
    processedAt: timestamp("processedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("payment_refunds_provider_reference_unique").on(table.providerRefundReference), index("payment_refunds_transaction_status_idx").on(table.paymentTransactionId, table.status)],
);

/** Centralized product entitlements; these cannot grant an exception to safety, compatibility, consent, or readiness policy. */
export const subscriptionEntitlements = mysqlTable(
  "subscription_entitlements",
  {
    id: int("id").autoincrement().primaryKey(),
    subscriptionId: int("subscriptionId").notNull().references(() => subscriptions.id, { onDelete: "cascade" }),
    entitlementKey: mysqlEnum("entitlementKey", ["advanced_discovery", "expanded_discovery_controls", "profile_visibility_controls", "enhanced_recommendation_controls", "profile_management_convenience"]).notNull(),
    status: mysqlEnum("status", ["active", "revoked", "expired"]).default("active").notNull(),
    startsAt: timestamp("startsAt").defaultNow().notNull(),
    endsAt: timestamp("endsAt"),
    revokedAt: timestamp("revokedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("subscription_entitlements_unique").on(table.subscriptionId, table.entitlementKey), index("subscription_entitlements_active_idx").on(table.entitlementKey, table.status, table.endsAt)],
);

/** Signed provider event metadata allows idempotent reconciliation without storing raw payment payloads or secrets. */
export const paymentWebhookEvents = mysqlTable(
  "payment_webhook_events",
  {
    id: int("id").autoincrement().primaryKey(),
    provider: varchar("provider", { length: 80 }).notNull(),
    providerEventId: varchar("providerEventId", { length: 255 }).notNull(),
    eventType: varchar("eventType", { length: 120 }).notNull(),
    payloadHash: varchar("payloadHash", { length: 128 }).notNull(),
    signatureValid: boolean("signatureValid").default(false).notNull(),
    status: mysqlEnum("status", ["received", "verified", "processed", "rejected", "failed"]).default("received").notNull(),
    paymentTransactionId: int("paymentTransactionId").references(() => paymentTransactions.id, { onDelete: "set null" }),
    receivedAt: timestamp("receivedAt").defaultNow().notNull(),
    processedAt: timestamp("processedAt"),
  },
  table => [uniqueIndex("payment_webhook_events_provider_event_unique").on(table.provider, table.providerEventId), index("payment_webhook_events_status_idx").on(table.provider, table.status, table.receivedAt)],
);

export const paymentReconciliations = mysqlTable(
  "payment_reconciliations",
  {
    id: int("id").autoincrement().primaryKey(),
	    paymentTransactionId: int("paymentTransactionId").references(() => paymentTransactions.id, { onDelete: "cascade" }),
	    subscriptionId: int("subscriptionId").references(() => subscriptions.id, { onDelete: "cascade" }),
	    issueCode: varchar("issueCode", { length: 100 }),
    status: mysqlEnum("status", ["open", "reconciled", "needs_review"]).default("open").notNull(),
    providerObservedStatus: varchar("providerObservedStatus", { length: 120 }),
    note: varchar("note", { length: 500 }),
    reviewedByUserId: int("reviewedByUserId").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
	  table => [index("payment_reconciliations_status_idx").on(table.status, table.createdAt), uniqueIndex("payment_reconciliations_transaction_unique").on(table.paymentTransactionId), uniqueIndex("payment_reconciliations_subscription_issue_unique").on(table.subscriptionId, table.issueCode)],
);

/** Availability metadata deliberately excludes provider credentials and can differ by provider, currency, and method. */
export const paymentProviderConfigurations = mysqlTable(
  "payment_provider_configurations",
  {
    id: int("id").autoincrement().primaryKey(),
    provider: varchar("provider", { length: 80 }).notNull(),
    enabled: boolean("enabled").default(false).notNull(),
	    environment: mysqlEnum("environment", ["not_configured", "sandbox", "live"]).default("not_configured").notNull(),
    supportedCurrencies: json("supportedCurrencies").notNull(),
    supportedMethods: json("supportedMethods").notNull(),
    configurationNote: varchar("configurationNote", { length: 500 }),
    updatedByUserId: int("updatedByUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("payment_provider_configurations_provider_unique").on(table.provider)],
);

export const memberBillingSettings = mysqlTable(
  "member_billing_settings",
  {
    id: int("id").autoincrement().primaryKey(),
    profileId: int("profileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
    preferredCurrency: varchar("preferredCurrency", { length: 3 }).default("GMD").notNull(),
    receiptEmail: varchar("receiptEmail", { length: 320 }),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("member_billing_settings_profile_unique").on(table.profileId)],
);

export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    notificationType: mysqlEnum("notificationType", ["interest", "match", "message", "verification", "safety", "family", "connection", "recommendation", "billing", "product", "security"])
      .notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    body: varchar("body", { length: 500 }).notNull(),
    actionPath: varchar("actionPath", { length: 255 }),
    eventKey: varchar("eventKey", { length: 191 }),
    eventType: varchar("eventType", { length: 100 }),
    priority: mysqlEnum("priority", ["critical", "high", "normal", "low"]).default("normal").notNull(),
    notificationClass: mysqlEnum("notificationClass", ["transactional", "marketing"]).default("transactional").notNull(),
    templateVersion: varchar("templateVersion", { length: 64 }),
    readAt: timestamp("readAt"),
    dismissedAt: timestamp("dismissedAt"),
    expiresAt: timestamp("expiresAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("notifications_event_unique").on(table.userId, table.eventKey),
    index("notifications_user_unread_idx").on(table.userId, table.readAt, table.createdAt),
    index("notifications_event_type_idx").on(table.userId, table.eventType, table.createdAt),
  ],
);

/** A privacy-safe application event record: never store raw messages, documents, contact data, or sensitive relationship details here. */
export const notificationEvents = mysqlTable(
  "notification_events",
  {
    id: int("id").autoincrement().primaryKey(),
    recipientUserId: int("recipientUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    actorUserId: int("actorUserId").references(() => users.id, { onDelete: "set null" }),
    eventType: varchar("eventType", { length: 100 }).notNull(),
    notificationType: varchar("notificationType", { length: 40 }).notNull(),
    notificationClass: mysqlEnum("notificationClass", ["transactional", "marketing"]).default("transactional").notNull(),
    priority: mysqlEnum("priority", ["critical", "high", "normal", "low"]).default("normal").notNull(),
    sourceType: varchar("sourceType", { length: 80 }),
    sourceId: varchar("sourceId", { length: 128 }),
    idempotencyKey: varchar("idempotencyKey", { length: 191 }).notNull(),
    safeMetadata: json("safeMetadata"),
    actionPath: varchar("actionPath", { length: 255 }),
    expiresAt: timestamp("expiresAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("notification_events_idempotency_unique").on(table.recipientUserId, table.idempotencyKey), index("notification_events_recipient_idx").on(table.recipientUserId, table.createdAt), index("notification_events_type_idx").on(table.eventType, table.createdAt)],
);

/** Versioned, locale-ready copy only. Variables are limited to privacy-safe values resolved server-side. */
export const notificationTemplates = mysqlTable(
  "notification_templates",
  {
    id: int("id").autoincrement().primaryKey(),
    eventType: varchar("eventType", { length: 100 }).notNull(),
    channel: mysqlEnum("channel", ["in_app", "email", "sms", "push"]).notNull(),
    locale: varchar("locale", { length: 16 }).default("en").notNull(),
    templateVersion: varchar("templateVersion", { length: 64 }).notNull(),
    status: mysqlEnum("status", ["draft", "active", "retired"]).default("draft").notNull(),
    subject: varchar("subject", { length: 160 }).notNull(),
    body: varchar("body", { length: 500 }).notNull(),
    allowedVariables: json("allowedVariables").notNull(),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    activatedAt: timestamp("activatedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("notification_templates_version_unique").on(table.eventType, table.channel, table.locale, table.templateVersion), index("notification_templates_active_idx").on(table.eventType, table.channel, table.status)],
);

/** One member-owned settings record covers timezone and quiet hours; channel/category controls are stored separately for explicit consent. */
export const memberNotificationSettings = mysqlTable(
  "member_notification_settings",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    timezone: varchar("timezone", { length: 64 }).default("UTC").notNull(),
    quietHoursEnabled: boolean("quietHoursEnabled").default(false).notNull(),
    quietHoursStart: varchar("quietHoursStart", { length: 5 }),
    quietHoursEnd: varchar("quietHoursEnd", { length: 5 }),
    locale: varchar("locale", { length: 16 }).default("en").notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("member_notification_settings_user_unique").on(table.userId)],
);

export const notificationPreferences = mysqlTable(
  "notification_preferences",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    category: mysqlEnum("category", ["messages", "family", "recommendations", "billing", "product_updates", "marketing", "security", "verification", "safety"]).notNull(),
    inAppEnabled: boolean("inAppEnabled").default(true).notNull(),
    emailEnabled: boolean("emailEnabled").default(true).notNull(),
    smsEnabled: boolean("smsEnabled").default(false).notNull(),
    pushEnabled: boolean("pushEnabled").default(false).notNull(),
    marketingOptIn: boolean("marketingOptIn").default(false).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("notification_preferences_category_unique").on(table.userId, table.category)],
);

/** Delivery records are distinct from in-app read state and carry no rendered payload. */
export const notificationDeliveries = mysqlTable(
  "notification_deliveries",
  {
    id: int("id").autoincrement().primaryKey(),
    notificationId: int("notificationId").references(() => notifications.id, { onDelete: "cascade" }),
    notificationEventId: int("notificationEventId").notNull().references(() => notificationEvents.id, { onDelete: "cascade" }),
    recipientUserId: int("recipientUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    channel: mysqlEnum("channel", ["in_app", "email", "sms", "push"]).notNull(),
    provider: varchar("provider", { length: 80 }),
    templateVersion: varchar("templateVersion", { length: 64 }),
    status: mysqlEnum("status", ["pending", "queued", "sending", "delivered", "failed", "retrying", "suppressed", "cancelled", "expired", "unavailable"]).default("pending").notNull(),
    providerMessageId: varchar("providerMessageId", { length: 191 }),
    failureReason: varchar("failureReason", { length: 500 }),
    retryCount: int("retryCount").default(0).notNull(),
    nextRetryAt: timestamp("nextRetryAt"),
    scheduledAt: timestamp("scheduledAt"),
    sentAt: timestamp("sentAt"),
    deliveredAt: timestamp("deliveredAt"),
    failedAt: timestamp("failedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("notification_deliveries_event_channel_unique").on(table.notificationEventId, table.channel), index("notification_deliveries_operations_idx").on(table.status, table.nextRetryAt, table.createdAt), index("notification_deliveries_recipient_idx").on(table.recipientUserId, table.channel, table.createdAt)],
);

/** Queue rows make retry, deferred quiet-hour release, and future digest delivery observable without an in-process timer. */
export const notificationJobs = mysqlTable(
  "notification_jobs",
  {
    id: int("id").autoincrement().primaryKey(),
    notificationDeliveryId: int("notificationDeliveryId").notNull().references(() => notificationDeliveries.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", ["queued", "processing", "completed", "failed", "cancelled", "expired"]).default("queued").notNull(),
    priority: mysqlEnum("priority", ["critical", "high", "normal", "low"]).default("normal").notNull(),
    availableAt: timestamp("availableAt").defaultNow().notNull(),
    attempts: int("attempts").default(0).notNull(),
    maxAttempts: int("maxAttempts").default(3).notNull(),
    lastError: varchar("lastError", { length: 500 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("notification_jobs_delivery_unique").on(table.notificationDeliveryId), index("notification_jobs_due_idx").on(table.status, table.availableAt, table.priority)],
);

/** Provider availability is operational metadata only; credentials stay in server-side secrets when an adapter is intentionally added. */
export const notificationProviderConfigurations = mysqlTable(
  "notification_provider_configurations",
  {
    id: int("id").autoincrement().primaryKey(),
    provider: varchar("provider", { length: 80 }).notNull(),
    channel: mysqlEnum("channel", ["email", "sms", "push"]).notNull(),
    enabled: boolean("enabled").default(false).notNull(),
    supportedLocales: json("supportedLocales").notNull(),
    configurationNote: varchar("configurationNote", { length: 500 }),
    updatedByUserId: int("updatedByUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("notification_provider_channel_unique").on(table.provider, table.channel)],
);

/** Policy-controlled configuration only; it contains no member-level scoring or protected-characteristic rules. */
export const recommendationPolicies = mysqlTable(
  "recommendation_policies",
  {
    id: int("id").autoincrement().primaryKey(),
    policyVersion: varchar("policyVersion", { length: 64 }).notNull(),
    status: mysqlEnum("status", ["draft", "active", "retired"]).default("draft").notNull(),
    categories: json("categories").notNull(),
    dimensionWeights: json("dimensionWeights").notNull(),
    eligibilityRules: json("eligibilityRules").notNull(),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    activatedAt: timestamp("activatedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("recommendation_policy_version_unique").on(table.policyVersion), index("recommendation_policy_status_idx").on(table.status, table.activatedAt)],
);

/** Member-controlled presentation settings; search visibility remains the authoritative discovery eligibility control. */
export const memberRecommendationSettings = mysqlTable(
  "member_recommendation_settings",
  {
    id: int("id").autoincrement().primaryKey(),
    profileId: int("profileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
    recommendationsEnabled: boolean("recommendationsEnabled").default(true).notNull(),
    showVerifiedCategory: boolean("showVerifiedCategory").default(true).notNull(),
    showNearbyCategory: boolean("showNearbyCategory").default(true).notNull(),
    showRecentCategory: boolean("showRecentCategory").default(true).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("member_recommendation_settings_profile_unique").on(table.profileId)],
);

/** A recommendation persists only its lifecycle and member-safe explanation keys, never a numeric score or private reason. */
export const recommendations = mysqlTable(
  "recommendations",
  {
    id: int("id").autoincrement().primaryKey(),
    profileId: int("profileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
    candidateProfileId: int("candidateProfileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
    recommendationPolicyId: int("recommendationPolicyId").notNull().references(() => recommendationPolicies.id, { onDelete: "restrict" }),
    categoryKey: varchar("categoryKey", { length: 64 }).notNull(),
    status: mysqlEnum("status", ["active", "dismissed", "hidden", "withdrawn", "expired"]).default("active").notNull(),
    explanationKeys: json("explanationKeys").notNull(),
    considerationKeys: json("considerationKeys").notNull(),
    generatedAt: timestamp("generatedAt").defaultNow().notNull(),
    lastEvaluatedAt: timestamp("lastEvaluatedAt").defaultNow().notNull(),
    withdrawnAt: timestamp("withdrawnAt"),
    expiresAt: timestamp("expiresAt"),
  },
  table => [uniqueIndex("recommendations_profile_candidate_policy_unique").on(table.profileId, table.candidateProfileId, table.recommendationPolicyId), index("recommendations_member_feed_idx").on(table.profileId, table.status, table.categoryKey, table.generatedAt), index("recommendations_candidate_status_idx").on(table.candidateProfileId, table.status)],
);

/** Feedback changes the requester's discovery experience only; it never labels or scores the other member. */
export const recommendationFeedback = mysqlTable(
  "recommendation_feedback",
  {
    id: int("id").autoincrement().primaryKey(),
    recommendationId: int("recommendationId").notNull().references(() => recommendations.id, { onDelete: "cascade" }),
    profileId: int("profileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
    response: mysqlEnum("response", ["not_interested", "not_relevant", "already_considered", "hide_profile"]).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("recommendation_feedback_profile_idx").on(table.profileId, table.createdAt), uniqueIndex("recommendation_feedback_unique").on(table.recommendationId, table.profileId)],
);

/** Metadata-only lifecycle evidence for audit and non-invasive analytics; no rank values or private preferences are recorded. */
export const recommendationEvents = mysqlTable(
  "recommendation_events",
  {
    id: int("id").autoincrement().primaryKey(),
    recommendationId: int("recommendationId").notNull().references(() => recommendations.id, { onDelete: "cascade" }),
    profileId: int("profileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
    eventType: mysqlEnum("eventType", ["generated", "presented", "viewed", "withdrawn", "feedback_recorded", "interest_started"]).notNull(),
    policyVersion: varchar("policyVersion", { length: 64 }).notNull(),
    metadata: json("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("recommendation_events_recommendation_idx").on(table.recommendationId, table.createdAt), index("recommendation_events_profile_idx").on(table.profileId, table.eventType, table.createdAt)],
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

export const STAFF_ROLE_VALUES = ["platform_administrator", "operations_manager", "trust_safety_officer", "verification_officer", "customer_support_officer", "finance_officer", "content_policy_manager", "read_only_auditor"] as const;
export type StaffRole = (typeof STAFF_ROLE_VALUES)[number];

/** Separate staff identities are linked to authenticated users; shared administrator accounts are not supported. */
export const staffProfiles = mysqlTable("staff_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  staffRole: mysqlEnum("staffRole", STAFF_ROLE_VALUES).notNull(),
  status: mysqlEnum("status", ["invited", "active", "suspended", "deactivated"]).default("invited").notNull(),
  mfaRequired: boolean("mfaRequired").default(false).notNull(),
  invitedByUserId: int("invitedByUserId").references(() => users.id, { onDelete: "set null" }),
  activatedAt: timestamp("activatedAt"),
  suspendedAt: timestamp("suspendedAt"),
  deactivatedAt: timestamp("deactivatedAt"),
  lastReauthenticatedAt: timestamp("lastReauthenticatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("staff_profiles_user_unique").on(table.userId), index("staff_profiles_role_status_idx").on(table.staffRole, table.status)]);

export const staffPermissions = mysqlTable("staff_permissions", {
  id: int("id").autoincrement().primaryKey(),
  permissionKey: varchar("permissionKey", { length: 120 }).notNull(),
  module: varchar("module", { length: 64 }).notNull(),
  description: varchar("description", { length: 300 }).notNull(),
  highImpact: boolean("highImpact").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("staff_permissions_key_unique").on(table.permissionKey), index("staff_permissions_module_idx").on(table.module)]);

export const staffRolePermissions = mysqlTable("staff_role_permissions", {
  id: int("id").autoincrement().primaryKey(),
  staffRole: mysqlEnum("staffRole", STAFF_ROLE_VALUES).notNull(),
  permissionId: int("permissionId").notNull().references(() => staffPermissions.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("srp_role_permission_unique").on(table.staffRole, table.permissionId)]);

/** Narrow, reviewable exceptions cannot be used for self-granted privilege escalation. */
export const staffPermissionOverrides = mysqlTable("staff_permission_overrides", {
  id: int("id").autoincrement().primaryKey(),
  staffProfileId: int("staffProfileId").notNull().references(() => staffProfiles.id, { onDelete: "cascade" }),
  permissionId: int("permissionId").notNull().references(() => staffPermissions.id, { onDelete: "cascade" }),
  effect: mysqlEnum("effect", ["grant", "revoke"]).notNull(),
  status: mysqlEnum("status", ["proposed", "active", "rejected", "revoked", "expired"]).default("proposed").notNull(),
  reason: varchar("reason", { length: 500 }).notNull(),
  requestedByUserId: int("requestedByUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  approvedByUserId: int("approvedByUserId").references(() => users.id, { onDelete: "set null" }),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  decidedAt: timestamp("decidedAt"),
}, table => [index("spo_status_expiry_idx").on(table.status, table.expiresAt), index("spo_staff_idx").on(table.staffProfileId, table.status)]);

/** Invitation secrets are stored as hashes and are never exposed through audit records or UI. */
export const staffInvitations = mysqlTable("staff_invitations", {
  id: int("id").autoincrement().primaryKey(),
  invitedEmail: varchar("invitedEmail", { length: 320 }).notNull(),
  invitationCodeHash: varchar("invitationCodeHash", { length: 128 }).notNull(),
  requestedRole: mysqlEnum("requestedRole", STAFF_ROLE_VALUES).notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "expired", "revoked"]).default("pending").notNull(),
  invitedByUserId: int("invitedByUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  acceptedByUserId: int("acceptedByUserId").references(() => users.id, { onDelete: "set null" }),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("staff_invitation_hash_unique").on(table.invitationCodeHash), index("staff_invitation_status_expiry_idx").on(table.status, table.expiresAt)]);

/** Session-control records permit server-side revocation without storing session secrets. */
export const staffSessionControls = mysqlTable("staff_session_controls", {
  id: int("id").autoincrement().primaryKey(),
  staffProfileId: int("staffProfileId").notNull().references(() => staffProfiles.id, { onDelete: "cascade" }),
  sessionReferenceHash: varchar("sessionReferenceHash", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["active", "revoked", "expired"]).default("active").notNull(),
  issuedAt: timestamp("issuedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  revokedAt: timestamp("revokedAt"),
  revokedByUserId: int("revokedByUserId").references(() => users.id, { onDelete: "set null" }),
  reauthenticatedAt: timestamp("reauthenticatedAt"),
}, table => [uniqueIndex("ssc_reference_unique").on(table.sessionReferenceHash), index("ssc_staff_status_idx").on(table.staffProfileId, table.status, table.expiresAt)]);

/** Support stays separate from Trust & Safety; escalation records a case link but never grants evidence access. */
export const supportTickets = mysqlTable("support_tickets", {
  id: int("id").autoincrement().primaryKey(),
  memberProfileId: int("memberProfileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
  category: mysqlEnum("category", ["account_access", "profile", "verification", "membership", "payment", "notifications", "family_circle", "technical_issue", "safety_concern", "other"]).notNull(),
  subject: varchar("subject", { length: 200 }).notNull(),
  description: text("description").notNull(),
  status: mysqlEnum("status", ["new", "open", "waiting_for_member", "waiting_for_staff", "escalated", "resolved", "closed"]).default("new").notNull(),
  priority: mysqlEnum("priority", ["low", "normal", "high", "critical"]).default("normal").notNull(),
  assignedStaffProfileId: int("assignedStaffProfileId").references(() => staffProfiles.id, { onDelete: "set null" }),
  escalatedReportId: int("escalatedReportId").references(() => reports.id, { onDelete: "set null" }),
  resolution: varchar("resolution", { length: 1000 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
  closedAt: timestamp("closedAt"),
}, table => [index("support_ticket_queue_idx").on(table.status, table.priority, table.createdAt), index("support_ticket_member_idx").on(table.memberProfileId, table.createdAt)]);

export const supportTicketEvents = mysqlTable("support_ticket_events", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticketId").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),
  actorUserId: int("actorUserId").references(() => users.id, { onDelete: "set null" }),
  eventType: mysqlEnum("eventType", ["created", "assigned", "status_changed", "note_added", "escalated", "resolved", "closed"]).notNull(),
  safeMetadata: json("safeMetadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("ste_ticket_created_idx").on(table.ticketId, table.createdAt)]);

export const operationalIncidents = mysqlTable("operational_incidents", {
  id: int("id").autoincrement().primaryKey(),
  category: mysqlEnum("category", ["notification_provider", "payment_provider", "authentication", "database", "safety_system", "service_degradation", "other"]).notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  status: mysqlEnum("status", ["detected", "investigating", "mitigating", "monitoring", "resolved", "closed"]).default("detected").notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  summary: varchar("summary", { length: 2000 }).notNull(),
  assignedStaffProfileId: int("assignedStaffProfileId").references(() => staffProfiles.id, { onDelete: "set null" }),
  detectedByUserId: int("detectedByUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  resolvedAt: timestamp("resolvedAt"),
  closedAt: timestamp("closedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("incident_queue_idx").on(table.status, table.severity, table.createdAt)]);

export const operationalIncidentEvents = mysqlTable("operational_incident_events", {
  id: int("id").autoincrement().primaryKey(),
  incidentId: int("incidentId").notNull().references(() => operationalIncidents.id, { onDelete: "cascade" }),
  actorUserId: int("actorUserId").references(() => users.id, { onDelete: "set null" }),
  eventType: mysqlEnum("eventType", ["detected", "assigned", "note_added", "status_changed", "escalated", "resolved", "post_incident_review"]).notNull(),
  safeMetadata: json("safeMetadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("oie_incident_created_idx").on(table.incidentId, table.createdAt)]);

/** High-impact operational changes require a separately authorized approval, never requester self-approval. */
export const operationalApprovals = mysqlTable("operational_approvals", {
  id: int("id").autoincrement().primaryKey(),
  approvalType: mysqlEnum("approvalType", ["safety_action", "refund", "staff_role_change", "permission_override", "policy_change", "configuration_change", "feature_flag"]).notNull(),
  resourceType: varchar("resourceType", { length: 80 }).notNull(),
  resourceId: varchar("resourceId", { length: 120 }).notNull(),
  requestedByUserId: int("requestedByUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  requiredApproverRole: mysqlEnum("requiredApproverRole", STAFF_ROLE_VALUES).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "cancelled", "expired"]).default("pending").notNull(),
  reason: varchar("reason", { length: 1000 }).notNull(),
  impactSummary: varchar("impactSummary", { length: 1000 }).notNull(),
  approvedByUserId: int("approvedByUserId").references(() => users.id, { onDelete: "set null" }),
  decidedAt: timestamp("decidedAt"),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("oa_queue_idx").on(table.status, table.approvalType, table.expiresAt)]);

/** Metadata-only flags remain environment-aware, permission-controlled, and secret-free. */
export const operationalFeatureFlags = mysqlTable("operational_feature_flags", {
  id: int("id").autoincrement().primaryKey(),
  flagKey: varchar("flagKey", { length: 120 }).notNull(),
  environment: mysqlEnum("environment", ["development", "staging", "production"]).notNull(),
  enabled: boolean("enabled").default(false).notNull(),
  status: mysqlEnum("status", ["draft", "approved", "archived"]).default("draft").notNull(),
  configuration: json("configuration"),
  updatedByUserId: int("updatedByUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("off_key_environment_unique").on(table.flagKey, table.environment)]);

/** Closed-beta control is environment-scoped and defaults to disabled until an authorized staff member explicitly enables invite-only enrollment. */
export const betaLaunchControls = mysqlTable("beta_launch_controls", {
  id: int("id").autoincrement().primaryKey(),
  environment: mysqlEnum("environment", ["development", "staging", "production"]).notNull(),
  mode: mysqlEnum("mode", ["disabled", "invite_only", "paused", "shutdown"]).default("disabled").notNull(),
  updatedByUserId: int("updatedByUserId").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("beta_control_environment_unique").on(table.environment)]);

/** Beta invitation secrets are stored only as hashes; raw codes are returned once to the authorized creator and never recorded in audit metadata. */
export const betaInvitations = mysqlTable("beta_invitations", {
  id: int("id").autoincrement().primaryKey(),
  invitedEmail: varchar("invitedEmail", { length: 320 }).notNull(),
  invitationCodeHash: varchar("invitationCodeHash", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "expired", "revoked"]).default("pending").notNull(),
  invitedByUserId: int("invitedByUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  acceptedByUserId: int("acceptedByUserId").references(() => users.id, { onDelete: "set null" }),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("beta_invitation_hash_unique").on(table.invitationCodeHash), index("beta_invitation_status_expiry_idx").on(table.status, table.expiresAt), index("beta_invitation_email_idx").on(table.invitedEmail, table.status)]);

/** A member may have one beta enrollment lifecycle; beta state grants no exemption from any separate safety, consent, or eligibility rule. */
export const betaEnrollments = mysqlTable("beta_enrollments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  invitationId: int("invitationId").references(() => betaInvitations.id, { onDelete: "set null" }),
  status: mysqlEnum("status", ["enrolled", "suspended", "removed"]).default("enrolled").notNull(),
  enrolledAt: timestamp("enrolledAt").defaultNow().notNull(),
  suspendedAt: timestamp("suspendedAt"),
  removedAt: timestamp("removedAt"),
  changedByUserId: int("changedByUserId").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("beta_enrollment_user_unique").on(table.userId), index("beta_enrollment_status_idx").on(table.status, table.updatedAt)]);

/** Metadata-only beta events support operational review without recording invitation secrets, profile content, or private communications. */
export const betaEvents = mysqlTable("beta_events", {
  id: int("id").autoincrement().primaryKey(),
  invitationId: int("invitationId").references(() => betaInvitations.id, { onDelete: "set null" }),
  enrollmentId: int("enrollmentId").references(() => betaEnrollments.id, { onDelete: "set null" }),
  actorUserId: int("actorUserId").references(() => users.id, { onDelete: "set null" }),
  eventType: mysqlEnum("eventType", ["mode_changed", "invitation_created", "invitation_accepted", "invitation_revoked", "enrollment_completed", "enrollment_suspended", "enrollment_removed", "emergency_shutdown"]).notNull(),
  safeMetadata: json("safeMetadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("beta_events_invitation_idx").on(table.invitationId, table.createdAt), index("beta_events_enrollment_idx").on(table.enrollmentId, table.createdAt)]);
/** Private member-declared engagement or marriage outcomes. Sharing consent is never publication consent and no public story surface reads this table. */
export const memberSuccessDeclarations = mysqlTable("member_success_declarations", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull().references(() => memberProfiles.id, { onDelete: "cascade" }),
  outcome: mysqlEnum("outcome", ["engaged", "married"]).notNull(),
  sharingConsent: boolean("sharingConsent").default(false).notNull(),
  status: mysqlEnum("status", ["private", "consent_recorded", "withdrawn"]).default("private").notNull(),
  editorialStatus: mysqlEnum("editorialStatus", ["draft", "private", "pending_review", "approved", "published", "withdrawn", "rejected"]).default("private").notNull(),
  publicStoryConsent: boolean("publicStoryConsent").default(false).notNull(),
  publicConsentAt: timestamp("publicConsentAt"),
  storySummary: varchar("storySummary", { length: 1200 }),
  editorialCopy: varchar("editorialCopy", { length: 1200 }),
  publicDisplayNameAuthorized: boolean("publicDisplayNameAuthorized").default(false).notNull(),
  publicPhotoId: int("publicPhotoId").references(() => profilePhotos.id, { onDelete: "set null" }),
  publicPhotoAuthorized: boolean("publicPhotoAuthorized").default(false).notNull(),
  publicPhotoAuthorizedAt: timestamp("publicPhotoAuthorizedAt"),
  submittedAt: timestamp("submittedAt"),
  reviewedByUserId: int("reviewedByUserId").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewedAt"),
  reviewNote: varchar("reviewNote", { length: 500 }),
  publishedByUserId: int("publishedByUserId").references(() => users.id, { onDelete: "set null" }),
  publishedAt: timestamp("publishedAt"),
  declaredAt: timestamp("declaredAt").defaultNow().notNull(),
  consentRecordedAt: timestamp("consentRecordedAt"),
  withdrawnAt: timestamp("withdrawnAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("member_success_declaration_profile_unique").on(table.profileId), index("member_success_declaration_status_idx").on(table.status, table.updatedAt)]);
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
