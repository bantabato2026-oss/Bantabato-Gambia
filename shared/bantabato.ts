export const BANTABATO_RULES = {
  eligibility: {
    minimumAge: 18,
    maximumAge: 60,
    minimumProfilePhotos: 5,
  },
  profile: {
    visibilityOptions: ["public", "members_only", "hidden"] as const,
    photoVisibilityOptions: ["public", "mutual_match", "hidden"] as const,
    familyVisibilityOptions: ["private", "matches", "visible"] as const,
    residenceOptions: ["gambia", "diaspora"] as const,
    religionOptions: ["muslim", "christian"] as const,
    maritalStatusOptions: ["never_married", "divorced", "widowed"] as const,
  },
  messaging: {
    requiresMutualMatch: true,
    supportedMessageTypes: ["text", "voice", "image"] as const,
  },
  verification: {
    requireManualIdentityReview: true,
    verificationBadgeSource: "approved_identity_document" as const,
  },
  family: {
    isOptional: true,
    canAccessPrivateConversations: false,
  },
} as const;

export const GAMBIA_LOCATIONS = ["Banjul", "Serrekunda", "Brikama", "Other Gambian community"] as const;
export const DIASPORA_REGIONS = ["United Kingdom", "United States", "European Union", "Other diaspora community"] as const;
