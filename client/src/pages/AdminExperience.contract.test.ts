import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const shell = readFileSync(join(process.cwd(), "client/src/components/AdminShell.tsx"), "utf8");
const operations = readFileSync(join(process.cwd(), "client/src/pages/AdminOperations.tsx"), "utf8");
const connectionReviews = readFileSync(join(process.cwd(), "client/src/pages/AdminConnectionReviews.tsx"), "utf8");
const contentReview = readFileSync(join(process.cwd(), "client/src/pages/AdminContentReview.tsx"), "utf8");
const countries = readFileSync(join(process.cwd(), "client/src/pages/AdminCountries.tsx"), "utf8");
const queues = readFileSync(join(process.cwd(), "client/src/pages/AdminOperationalQueues.tsx"), "utf8");
const billing = readFileSync(join(process.cwd(), "client/src/pages/AdminBilling.tsx"), "utf8");
const support = readFileSync(join(process.cwd(), "client/src/pages/AdminSupport.tsx"), "utf8");
const overview = readFileSync(join(process.cwd(), "client/src/pages/AdminPage.tsx"), "utf8");
const family = readFileSync(join(process.cwd(), "client/src/pages/AdminFamilyCircle.tsx"), "utf8");
const safety = readFileSync(join(process.cwd(), "client/src/pages/AdminSafetyOperations.tsx"), "utf8");
const management = readFileSync(join(process.cwd(), "client/src/pages/AdminOperationsManagement.tsx"), "utf8");
const policy = readFileSync(join(process.cwd(), "client/src/pages/AdminRecommendationPolicy.tsx"), "utf8");
const beta = readFileSync(join(process.cwd(), "client/src/pages/AdminBetaPage.tsx"), "utf8");

describe("administration experience state contracts", () => {
  it("keeps permission-scoped shell loading, access, and operations-access recovery on shared state primitives", () => {
    expect(shell).toContain('StateSkeleton label="Loading this operational workspace"');
    expect(shell).toContain('title="This workspace is unavailable right now."');
    expect(shell).toContain("access.refetch()");
    expect(shell).toContain("Member accounts cannot access sensitive review information.");
  });

  it("uses accessible shared loading, error/retry, and empty state surfaces for verification and Trust & Safety queues", () => {
    expect(operations).toContain("StatePanel, StateSkeleton");
    expect(operations).toContain("Loading this operational queue…");
    expect(operations).toContain("No operational cases require action.");
    expect(operations).toContain("No new case information has been shown. Please try again.");
    expect(operations).not.toContain("animate-pulse");
  });

  it("preserves approval, expiry, incident, country, editorial, photo-review, and connection-review boundaries while standardizing state recovery", () => {
    expect(connectionReviews).toContain('StateSkeleton label="Loading connection reviews…"');
    expect(connectionReviews).toContain("queue.refetch()");
    expect(contentReview).toContain('StateSkeleton label="Loading private photo reviews…"');
    expect(contentReview).toContain('StateSkeleton label="Loading editorial submissions…"');
    expect(countries).toContain('StateSkeleton label="Loading country operations…"');
    expect(countries).toContain("operations.refetch()");
    expect(queues).toContain("A requester cannot approve their own action.");
    expect(queues).toContain("Expired requests cannot be approved.");
    expect(queues).toContain('StateSkeleton label="Loading operational incidents…"');
    expect(queues).toContain("No provider recovery, payment completion, or external service state is implied");
    for (const source of [connectionReviews, contentReview, countries, queues]) expect(source).not.toContain("animate-pulse");
  });

  it("keeps finance and support operations inside shared recovery surfaces and their specialist boundaries", () => {
    expect(billing).toContain('StateSkeleton label="Loading finance operations…"');
    expect(billing).toContain("transactions.refetch(); reconciliation.refetch(); configuration.refetch();");
    expect(billing).toContain("never card data, payment credentials, private member content");
    expect(support).toContain('StateSkeleton label="Loading support tickets…"');
    expect(support).toContain("tickets.refetch()");
    expect(support).toContain("this queue cannot decide a safety action");
    expect(support).toContain("Support access does not imply access to private conversations");
  });

  it("uses shared loading, error/retry, and empty states across the remaining active overview, family, safety, management, policy, and beta routes", () => {
    for (const source of [overview, family, safety, management, policy, beta]) {
      expect(source).toContain("StatePanel, StateSkeleton");
      expect(source).not.toContain("animate-pulse");
    }
    expect(overview).toContain("Loading your authorized operations overview…");
    expect(overview).toContain("overview.refetch(); void access.refetch();");
    expect(family).toContain("Loading Family Circle oversight records…");
    expect(family).toContain("metadata.refetch()");
    expect(safety).toContain("Loading Trust & Safety cases…");
    expect(safety).toContain("detail.refetch()");
    expect(management).toContain("Loading authorized audit history…");
    expect(management).toContain("No secret-management UI");
    expect(policy).toContain("Loading recommendation policy versions…");
    expect(beta).toContain("Loading closed-beta operations…");
    expect(beta).toContain("Closed-beta operations are unavailable right now.");
  });
});
