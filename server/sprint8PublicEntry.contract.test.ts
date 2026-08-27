import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const app = readFileSync(join(process.cwd(), "client/src/App.tsx"), "utf8");
const home = readFileSync(join(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
const publicPages = readFileSync(join(process.cwd(), "client/src/pages/PublicPages.tsx"), "utf8");
const publicLayout = readFileSync(join(process.cwd(), "client/src/components/PublicLayout.tsx"), "utf8");
const stories = readFileSync(join(process.cwd(), "client/src/pages/PublicSuccessStoriesPage.tsx"), "utf8");
const onboarding = readFileSync(join(process.cwd(), "client/src/pages/MemberPages.tsx"), "utf8");
const media = readFileSync(join(process.cwd(), "client/src/pages/ProfileMediaPage.tsx"), "utf8");
const preview = readFileSync(join(process.cwd(), "client/src/pages/ProfilePreviewPage.tsx"), "utf8");
const motion = readFileSync(join(process.cwd(), "client/src/components/ExperienceMotion.tsx"), "utf8");
const router = readFileSync(join(process.cwd(), "server/routers.ts"), "utf8");
const db = readFileSync(join(process.cwd(), "server/db.ts"), "utf8");
const indexHtml = readFileSync(join(process.cwd(), "client/index.html"), "utf8");

describe("Sprint 8 public website and onboarding contracts", () => {
  it("keeps the public visitor journey routable from landing through information, membership, stories, secure entry, onboarding, photos, verification, and private member recovery", () => {
    for (const route of ["/", "/about", "/how-it-works", "/family-circle", "/safety", "/membership", "/stories", "/login", "/register", "/app/onboarding", "/app/photos", "/app/verification", "/app"]) expect(app).toContain(`path="${route}"`);
    expect(home).toContain("Where love");
    expect(home).toContain("Private by default. Respectful by design.");
    expect(home).toContain("For Gambians, wherever life has taken you");
    expect(publicPages).toContain("A considered beginning");
    expect(publicPages).toContain("A private space to begin with intention.");
	    expect(publicPages).toContain("Family involvement, held with care.");
	    expect(publicPages).toContain("A Parent or Wali/Guardian receives only the permissioned match and acknowledgement information");
  });

  it("keeps registration and onboarding factual, draft-safe, accessible, offline-aware, and unable to claim eligibility on secure entry alone", () => {
    expect(publicPages).toContain("Secure sign-in creates or opens your member account");
    expect(publicPages).toContain("incomplete profile remains a draft and cannot become eligible by simply signing in");
    expect(publicPages).toContain("no profile, payment, verification, or membership state has changed");
    expect(onboarding).toContain('Profile setup · {step + 1} of 3');
    expect(onboarding).toContain('aria-live="polite"');
    expect(onboarding).toContain("clearSafeDraft(onboardingDraftKey)");
    expect(onboarding).toContain("You appear to be offline. Your draft is saved on this device");
    expect(onboarding).toContain("document.getElementById(missing.id)?.focus()");
    expect(onboarding).toContain("Previous");
    expect(onboarding).toContain("Save draft");
  });

  it("keeps the five-photo requirement factual and allows a member-owned private removal to make a replacement slot without erasing evidence or overstating eligibility", () => {
    expect(media).toContain("{approvedPhotoCount}/5 approved photos");
    expect(media).toContain("Pending review");
    expect(media).toContain("Action required");
    expect(media).toContain("Remove & replace");
    expect(media).toContain("Remove a pending, rejected, or unwanted photo");
    expect(router).toContain("removeProfilePhoto: protectedProcedure");
    expect(db).toContain("export async function removeOwnProfilePhoto");
    expect(db).toContain("eq(profilePhotos.profileId, profileId)");
    expect(db).toContain("set({ deletedAt: new Date() })");
    expect(db).toContain("synchronizeProfileEligibility(profileId)");
    expect(db).toContain('"profile_photo.withdrawn"');
  });

  it("projects factual profile readiness without private safety reasoning and preserves separate photo, verification, preference, and eligibility paths", () => {
    expect(preview).toContain("This is a factual readiness view.");
    expect(preview).toContain("Five approved photos");
    expect(preview).toContain("Identity verification");
    expect(preview).toContain("Marriage preferences");
    expect(preview).toContain("does not disclose internal safety information");
    expect(preview).toContain("Manage profile photos");
    expect(preview).toContain("Review field privacy");
  });

  it("preserves consent-first public stories and restricts public content to approved query surfaces rather than member data", () => {
    expect(router).toContain("successStories: publicProcedure.query(() => listPublishedSuccessStories())");
    expect(stories).toContain("voluntary, reviewed stories shared only after explicit consent and independent approval");
    expect(stories).toContain("There are no voluntary, fully approved public stories to share right now.");
    expect(stories).toContain("withdraw their story at any time");
    expect(stories).toContain("never displays private messages, family information, contact details, verification material, private location, safety information");
  });

  it("uses the central public shell for accessible navigation, live public metadata, truthful membership retry, branded route loading, and no fabricated SEO claim", () => {
    expect(publicLayout).toContain("Skip to main content");
    expect(publicLayout).toContain("mobileNavigationRef.current?.querySelector");
    expect(publicLayout).toContain('event.key === "Escape"');
    expect(publicLayout).toContain("Stories");
    expect(publicLayout).toContain("applyPublicMetadata(location)");
    expect(publicLayout).toContain('link[rel="canonical"]');
    expect(publicPages).toContain("Bantabato is currently free during our initial launch period");
    expect(publicPages).toContain("No payment provider is active, no checkout is available");
    expect(publicPages).not.toContain("catalog.refetch()");
    expect(motion).toContain('audience?: "member" | "public"');
    expect(motion).toContain("Preparing Bantabato…");
    expect(indexHtml).toContain('meta property="og:title"');
    expect(indexHtml).toContain('link rel="canonical"');
  });
});
