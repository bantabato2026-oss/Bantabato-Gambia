export type ProfileAudience = "public" | "verified_members" | "potential_matches" | "matched_members" | "family_circle" | "private" | "admin_restricted";

export function canViewerSeeProfileField(audience: ProfileAudience | string | undefined, context: { viewerIdentityVerified: boolean; hasMutualMatch: boolean; familyCircleAuthorized?: boolean }) {
  switch (audience ?? "potential_matches") {
    case "public":
    case "potential_matches": return true;
    case "verified_members": return context.viewerIdentityVerified;
    case "matched_members": return context.hasMutualMatch;
    case "family_circle": return Boolean(context.familyCircleAuthorized);
    case "private":
    case "admin_restricted": return false;
    default: return false;
  }
}
