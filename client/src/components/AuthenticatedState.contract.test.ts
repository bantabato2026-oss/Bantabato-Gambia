import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const memberShell = readFileSync(join(process.cwd(), "client/src/components/MemberShell.tsx"), "utf8");
const adminShell = readFileSync(join(process.cwd(), "client/src/components/AdminShell.tsx"), "utf8");
const memberPages = readFileSync(join(process.cwd(), "client/src/pages/MemberPages.tsx"), "utf8");
const billingPage = readFileSync(join(process.cwd(), "client/src/pages/BillingPage.tsx"), "utf8");
const safetyPage = readFileSync(join(process.cwd(), "client/src/pages/SafetyCenterPage.tsx"), "utf8");

describe("authenticated experience state contracts", () => {
  it("gives every member route a labelled shared loading state and a clear sign-in recovery boundary", () => {
    expect(memberShell).toContain('StateSkeleton label="Loading your Bantabato experience"');
    expect(memberShell).toContain('title="A private space for serious intentions."');
    expect(memberShell).toContain("Sign in to continue your Bantabato journey.");
  });

  it("keeps offline member language privacy-safe and recovery-oriented", () => {
    expect(memberShell).toContain("You’re offline. We’ll reconnect when your connection returns.");
    expect(memberShell).toContain("Private information is not available offline.");
    expect(memberShell).toContain('aria-live="polite"');
  });

  it("gives administration routes a labelled loading state, role-aware restriction, and safe access-query retry", () => {
    expect(adminShell).toContain('StateSkeleton label="Loading this operational workspace"');
    expect(adminShell).toContain('title="This area is currently unavailable."');
    expect(adminShell).toContain('title="This workspace is unavailable right now."');
    expect(adminShell).toContain("No review information has been shown. Please try again.");
    expect(adminShell).toContain("access.refetch()");
  });

  it("uses member-friendly shared recovery panels on representative authenticated member reads", () => {
    expect(memberPages).toContain('title="Your start is unavailable right now."');
    expect(memberPages).toContain('title="Your notification center is unavailable right now."');
    expect(memberPages).toContain("notifications.refetch(); preferenceQuery.refetch();");
    expect(billingPage).toContain('title="Membership status is unavailable right now."');
    expect(safetyPage).toContain('title="Your Safety Center is unavailable right now."');
  });
});
