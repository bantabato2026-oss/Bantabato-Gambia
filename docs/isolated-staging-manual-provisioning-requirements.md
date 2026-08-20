# BANTABATO — Isolated Staging Manual Provisioning Requirements

**Status:** Manual setup requirements only. Every requested external resource is currently **BLOCKED — EXTERNAL ACTION REQUIRED** because no authorized account scope, staging project, hostname, or owner is available.

## First architecture decision: preserve the current stack or approve a migration

The application currently uses **MySQL/TiDB + Drizzle with `dialect: "mysql"`** and Manus OAuth/storage helpers. A Supabase project provides PostgreSQL, so its database must **not** be substituted for the current `DATABASE_URL` as a staging shortcut. Doing so would be a database-platform migration, not staging setup, and would require a separately approved schema/dialect/query/test/security plan.

| Option | Safe use | Not allowed without separate approval |
| --- | --- | --- |
| A. Stage the current architecture | Create a separate MySQL/TiDB staging database, stage-only storage identity, and stage OAuth configuration. | Reusing production connection/storage/OAuth/provider values. |
| B. Adopt Supabase deliberately | Create a wholly separate project only for evaluated migration work, with no real data, and keep it disconnected from production. | Pointing the running MySQL/Drizzle application at Supabase PostgreSQL, copying production schema/data blindly, or treating Supabase creation as completed staging. |

## Manual setup sequence for the current architecture

1. A named infrastructure owner creates an isolated staging hosting target and records its non-production origin. The origin must not be the production hostname and must have separate deployment/environment controls.
2. The owner creates a new MySQL/TiDB staging database and two least-privilege identities: one reviewed migration identity and one application runtime identity. Neither may have access to production.
3. The owner creates a stage-only private storage namespace/account. It must not list, read, sign, write, or delete production objects.
4. The identity owner registers separate staging OAuth/client callback details for the staging origin. The production callback and secret must not be reused.
5. The hosting owner creates staging-only secret entries for `APP_ENV=staging`, `DATABASE_URL`, `JWT_SECRET`, OAuth configuration, owner identity, and approved storage configuration. Values stay out of Git, chat, logs, screenshots, and client bundles.
6. A release owner selects a checkpoint, performs the required build/test/audit gates, and deploys only to the isolated origin.
7. A migration reviewer generates and reads the additive Drizzle SQL, applies it only to the staging database, records migration IDs/time/actor, and confirms no production connection was opened.
8. A tester verifies health liveness, stage OAuth callback, session isolation, private storage denial, controlled signed access, no external notification/payment path, and stage-only synthetic account lifecycle before any broader smoke matrix.

## Conditional Supabase project requirements

If the user explicitly chooses a Supabase migration evaluation, an authorized owner must manually create a **separate empty staging project** and complete the following before any application integration:

| Component | Manual requirement | Completion evidence |
| --- | --- | --- |
| Project | New project clearly named and labeled as staging/evaluation; do not link a production project. | Project identifier recorded without secrets. |
| Database | Keep empty or use only intentional fictional test data. Assess PostgreSQL schema, Drizzle dialect, query compatibility, migration conversion, and rollback separately. | Reviewed migration plan and isolated test result. |
| Auth | Separate staging redirect URLs and test-only identity configuration; do not reuse production OAuth secrets. | Redirect/cookie crossover denial result. |
| Storage | Private buckets only; deny public listing; stage-only signed URLs; explicit size/type limits; no production object references. | Access-denial and controlled test-artifact result. |
| RLS | Design deny-by-default policies as a new layer; keep service-role credentials server-only; independently test cross-account denial. | Policy review and controlled authorization results. |
| Environment | Put project URL/keys only in approved staging secret management. Do not add service-role keys to browser code. | Redacted secret inventory review. |
| Seed data | Use the prepared opaque fictional role matrix only after staging isolation is proven. | Account register and cleanup plan. |

## Manual setup for Sentry, Cloudflare, and GitHub

| Service | Required owner action | Safe staging-only configuration | Mandatory proof before use |
| --- | --- | --- | --- |
| Sentry | Authorize a stage-only project and monitoring owner. | Environment `staging`, scrub bodies/cookies/tokens/private content, restricted access, retention/routing policy. | Observed non-sensitive synthetic test event and verified scrub/routing. |
| Cloudflare | Authorize least-privilege zone access and a staging hostname. | `staging.<approved-domain>` or equivalent, TLS, security headers, no-store for APIs/private data, reviewed cache/WAF rules. | Staging origin/TLS/header/cache proof with no production DNS modification. |
| GitHub | Authorize a repository and least-privilege integration scope. | Reviewed branch/release-candidate strategy, environment protection, no secret commit, migration/rollback checklist. | Approved repository/branch protection and release owner record. |

## Prohibited actions

Do not provision a staging target against production database, storage, OAuth, payment, email, SMS, push, Cloudflare DNS, or real member data. Do not run a migration, create an account, upload media, send a test event, or execute a restore until the corresponding isolated resource, named owner, and explicit provider authorization exist.
