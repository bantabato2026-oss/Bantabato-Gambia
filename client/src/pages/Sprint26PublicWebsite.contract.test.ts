import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Sprint 26 complete public website and conversion experience", () => {
  const layout = read("client/src/components/PublicLayout.tsx");
  const home = read("client/src/pages/Home.tsx");
  const pages = read("client/src/pages/PublicPages.tsx");
  const stories = read("client/src/pages/PublicSuccessStoriesPage.tsx");
  const routes = read("client/src/App.tsx");

  it("provides a factual marriage-first landing journey without fabricated proof", () => {
    expect(home).toContain("A private, marriage-first space for Gambians in The Gambia, Senegal, and the diaspora");
    expect(home).toContain("There is no public social feed and no one-sided access to private conversations.");
    expect(home).toContain("Verification is one part of trust.");
    expect(home).toContain("It is not a promise about character, compatibility, intentions, or safety.");
    expect(home).not.toMatch(/member count|success rate|thousands of|testimonials?/i);
  });

  it("covers all required public entry routes and navigates authenticated members privately", () => {
    ["/about", "/how-it-works", "/family-circle", "/safety", "/privacy", "/membership", "/stories", "/faq", "/contact", "/login", "/register"].forEach(route => expect(routes).toContain(`path="${route}"`));
    expect(layout).toContain("Your member space");
    expect(layout).toContain('href="/app"');
    expect(layout).not.toContain("user.name");
    expect(layout).not.toContain("user.email");
  });

  it("uses accessible FAQ disclosure controls and truthful no-provider support states", () => {
    expect(pages).toContain("Accordion type=\"single\" collapsible");
    expect(pages).toContain("What does an Identity reviewed badge not mean?");
    expect(pages).toContain("Can I report or block someone?");
    expect(pages).toContain("Public message delivery is not configured.");
    expect(pages).toContain("No email, ticket, form submission, external support message, or provider delivery is initiated from this page.");
  });

  it("keeps public trust, Family Circle, privacy, and premium messages bounded", () => {
    expect(pages).toContain("It is not a safety guarantee");
    expect(pages).toContain("Family Circle never grants automatic access to private conversations, voice notes, identity documents");
    expect(pages).toContain("Private identity documents, private media, messages, voice, safety records, payment details");
    expect(pages).toContain("Premium cannot override a block, report, Trust & Safety restriction");
    expect(pages).not.toContain("pay-to-win");
  });

  it("preserves consented-story-only public presentation and member-safe recovery", () => {
    expect(stories).toContain("voluntary, reviewed stories shared only after explicit consent and independent approval");
    expect(stories).toContain("Stories are shared only when a member chooses.");
    expect(stories).toContain("stories.refetch()");
    expect(stories).toContain("This page never displays private messages, family information, contact details, verification material");
  });

  it("updates SEO metadata for public routes without social-proof claims", () => {
    expect(layout).toContain('"/contact"');
    expect(layout).toContain('"/privacy"');
    expect(layout).toContain('"/faq"');
    expect(layout).toContain('meta[property="og:url"]');
    expect(layout).toContain('link[rel="canonical"]');
    expect(layout).not.toMatch(/#1|most popular|millions/i);
  });
});
