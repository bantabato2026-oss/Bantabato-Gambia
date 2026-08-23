import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Sprint 11 Family Circle, Wali, and marriage-intent contracts", () => {
  it("revokes pending Family Circle invitations server-side, clears the private code, records a dedicated event, and rejects stale revocation or reissue actions", () => {
    const family = read("server/familyService.ts");
    const router = read("server/routers.ts");
    const schema = read("drizzle/schema.ts");
    expect(family).toContain("export async function revokeFamilyInvitation");
    expect(family).toContain('status: "revoked", invitationCodeHash: null, revokedAt');
    expect(family).toContain('eq(familyLinks.status, "invited")');
    expect(family).toContain('"This Family Circle invitation changed before it could be revoked."');
    expect(family).toContain('"This Family Circle invitation changed before it could be reissued."');
    expect(family).toContain('"invitation_revoked"');
    expect(family).toContain('"family.invitation_revoked"');
    expect(router).toContain("revokeInvitation:");
    expect(schema).toContain('"invitation_revoked"');
  });

  it("keeps Family Circle optional, prerequisite-gated, and purpose-specific without exposing private messages, documents, account controls, or call consent", () => {
    const page = read("client/src/pages/FamilyCirclePages.tsx");
    const service = read("server/familyService.ts");
    expect(page).toContain("const profilePresent = Boolean(profile.data?.id)");
    expect(page).toContain("enabled: profilePresent");
    expect(page).toContain("No invitation, permission, shared match, participant, or Family Circle information has been requested or shown.");
    expect(page).toContain("Revoke invitation");
    expect(page).toContain("Its private code no longer works");
    expect(service).toContain("Only an existing mutual match can be shared with Family Circle");
    expect(service).toContain("Family Circle access is unavailable");
  });

  it("uses a married-only, private another-marriage context and explicitly excludes it from discovery, recommendations, Family Circle, compatibility explanations, scoring, and ranking", () => {
    const details = read("client/src/pages/ProfileDetailsPage.tsx");
    const discovery = read("server/compatibilityService.ts");
    expect(details).toContain('form.maritalStatus === "married"');
    expect(details).toContain("Why are you seeking another marriage?");
    expect(details).toContain("This is not shown to other members, Family Circle participants, discovery, recommendations, or compatibility explanations.");
    expect(details).toContain("never used as a score, popularity signal, or ranking input");
    expect(discovery).not.toContain("reasonSeekingMarriage:");
  });

  it("keeps engaged and married declarations private, factual, withdrawable, profile-gated, and separate from discovery, recommendations, matches, and Family Circle", () => {
    const settings = read("client/src/pages/MemberPages.tsx");
    const db = read("server/db.ts");
    const router = read("server/routers.ts");
    expect(settings).toContain("const profilePresent = Boolean(profile.data?.id)");
    expect(settings).toContain('declaration.data.status === "withdrawn"');
    expect(settings).toContain('"engagement" : "marriage"');
    expect(settings).toContain("declaration active");
    expect(settings).toContain("does not alter discovery or recommendations");
    expect(settings).toContain("never shown to matches or Family Circle participants");
    expect(db).toContain('status: "withdrawn"');
    expect(db).toContain('"member.success_declaration_withdrawn"');
    expect(db).toContain('from(memberProfiles).where(eq(memberProfiles.id, profileId)).for("update")');
    expect(db).toContain('from(memberSuccessDeclarations).where(eq(memberSuccessDeclarations.profileId, profileId)).limit(1)');
    expect(router).toContain("success: router");
  });

  it("preserves provider-neutral, no-score, privacy-safe staff and notification boundaries", () => {
    const family = read("server/familyService.ts");
    const policy = read("server/domain/successDeclarationPolicy.ts");
    const dashboard = read("client/src/pages/MemberDashboardPage.tsx");
    expect(family).toContain("Family Circle feedback. It is advisory and does not change your match or communication access.");
    expect(family).not.toContain("ranking");
    expect(policy).toContain("canPublishSuccessDeclaration(): false");
    expect(dashboard).toContain("Conveniences never override safety, privacy, consent, matching, verification, or Family Circle rules.");
  });
});
