# BANTABATO — Operational Ownership & Staging Authorization Dossier

**Purpose:** Define exactly what must be assigned, approved, and provisioned before isolated staging can begin. **Status:** Documentation only; staging is **NOT CONFIGURED** and launch readiness remains **NOT READY**.

## Required isolated architecture

```text
User
  ↓
Approved staging hostname and TLS
  ↓
Isolated staging application (APP_ENV=staging)
  ↓                         ↘
Staging MySQL/TiDB database   Stage-only private storage
  ↓                         ↘
Stage-only OAuth/session      Stage-only fictional test artifacts

Completely separate from production application, database, storage,
credentials, OAuth, provider accounts, and external communications.
```

The current application remains **MySQL/TiDB + Drizzle (`dialect: mysql`)**. Supabase PostgreSQL is not a drop-in staging replacement. Any move to Supabase is a separate approved migration project, requiring a PostgreSQL schema/dialect/query/storage/auth/RLS/security plan and must not be silently combined with staging setup.

## Minimum non-production target requirements

| Resource | Required condition | Current status | Authorization needed |
| --- | --- | --- | --- |
| Hosting | Distinct non-production deployment/origin with server-only `APP_ENV=staging`. | NOT AVAILABLE | Staging/infrastructure owner and hosting account scope. |
| Database | Separate MySQL/TiDB database and least-privilege runtime/migration identities; version must match a production-compatible MySQL/TiDB major version confirmed by the database owner. | NOT AVAILABLE | Database owner and provider credentials. |
| Storage | Separate private namespace/account, no production listing/read/write/sign capability. | NOT AVAILABLE | Storage owner and provider credentials. |
| OAuth | Separate client credentials, redirect URI limited to staging origin, no production secret/callback reuse. | NOT AVAILABLE | Identity/OAuth owner approval. |
| Domain and TLS | `staging.<approved-domain>` or another clearly non-production hostname, valid TLS, no production DNS modification. | REQUIRES USER ACTION | Domain/Cloudflare owner and approved zone scope. |
| Monitoring | Stage-only error/liveness configuration, scrubbed events, restricted access, test event, routing, retention. | NOT AVAILABLE | Monitoring owner and provider scope. |
| Backup | Non-production backup source and isolated restore target. | NOT AVAILABLE | Backup/restore owner and provider scope. |

## Provider least-privilege scope plan

| Connector | Purpose | Minimum required permission | Must not access | Revocation method |
| --- | --- | --- | --- | --- |
| GitHub | Optional staging release/workflow integration. | Only the approved repository; read source/metadata and, if separately approved, write only a staging release branch/workflow. | Other repositories, organization administration, production secrets, unrelated actions. | Disable connector; revoke repository app/token access; remove collaborator/team grant. |
| Supabase | Only if a separate migration/evaluation is approved. | Only the newly created staging project; required project/database/auth/storage configuration scope. | Production projects, real data, broad organization administration, browser service-role exposure. | Disable connector; revoke project token/API key; remove project member. |
| Sentry | Stage-only error monitoring and safe test-event validation. | Only a new staging project; event read/configure scope necessary for scrubbing, routing, and release tag. | Production projects, source secrets, private payloads, broad organization administration. | Disable connector; revoke project token/integration; remove project member. |
| Cloudflare | Stage hostname/TLS/header/cache configuration only after explicit domain approval. | Only approved zone and staging DNS/hostname settings necessary for the stage origin. | Production DNS changes, unrelated zones, broad Workers/R2 edits, account-wide administration. | Disable connector; revoke token; remove zone scope; delete staging-specific token. |

All connector families remain disabled. This table is an authorization request design, not a claim that any exact provider token scope has been granted.

## Domain, database, storage, and OAuth requirements

| Area | Required implementation before testing | Security boundary |
| --- | --- | --- |
| Staging domain | One approved hostname, DNS record to staging origin, valid TLS, security headers, no-store for APIs/private responses, cache review. | Never point a staging host at production origin/API/storage; do not change production DNS. |
| Database | Reviewed additive Drizzle migration SQL against a dedicated MySQL/TiDB staging URL; encrypted transport if provider supports/requires it; runtime/migration identities separated. | Never reuse production `DATABASE_URL`; never run a stage migration against production. |
| Seeds/test data | Create only opaque fictional records after isolation proof; record account labels, tester, purpose, cleanup. | No real member copy, message, photo, document, safety evidence, or personal data. |
| Storage | Private-by-default objects, minimal signed access, existing file validation/upload limits, five-photo enforcement, test-artifact retention/deletion register. | No real media/documents; no production object reference; no public list access. |
| OAuth | Dedicated client configuration, staging redirect only, stage session/cookie separation, no production secret or redirect route. | Prove no production callback/cookie crossover before account creation. |

## Monitoring, backup, and restore requirements

| Area | Required owner decision | Required evidence | Current status |
| --- | --- | --- | --- |
| Monitoring | Define application/auth/database/storage/API/security/liveness signals, threshold, routing, scrubbing, access, and retention. | Observed non-sensitive staging test event with scrub/routing verification. | NOT CONFIGURED |
| Backup frequency and retention | Backup/restore owner selects provider-supported frequency, retention, encryption, storage location, and recovery SLA after data/legal review. | Approved configuration record and successful backup evidence. | UNASSIGNED — USER ACTION REQUIRED |
| Restore | Restore only stage synthetic data to a new isolated non-production target; verify application reconnect, integrity, private storage, session/auth, and cleanup. | UTC restore record, operator, target, validation, exceptions, cleanup. | NOT EXECUTED |
| Rollback | Release owner identifies checkpoint rollback and database forward-fix/restore decision path. | Incident/release record and verified safe fallback. | UNASSIGNED — USER ACTION REQUIRED |

Monitoring must exclude private messages, verification documents, family information, safety evidence, passwords, tokens, and payment credentials. Backup readiness must not be claimed before an isolated restore test succeeds.

## Fictional staging account matrix

All accounts are **definitions only** until staging isolation and ownership are verified. Every value must be opaque and fictional.

| Account label | Required scenario | Responsible owner |
| --- | --- | --- |
| `STG_MEMBER_INCOMPLETE` | Incomplete onboarding. | Beta test owner |
| `STG_MEMBER_FIVE_PHOTO` | Exactly five approved fictional media artifacts. | Beta test owner |
| `STG_MEMBER_VERIFY_PENDING` | Verification pending without a real document. | Verification owner |
| `STG_MEMBER_VERIFY_APPROVED` | Controlled approved status. | Verification owner |
| `STG_MEMBER_VERIFY_REJECTED` | Controlled rejection/recovery status. | Verification owner |
| `STG_MEMBER_MARRIED` | Private staged married declaration/withdrawal lifecycle. | Beta test owner |
| `STG_MEMBER_FAMILY` | Family Circle permission/revocation. | Beta test owner |
| `STG_MEMBER_MUTUAL_A/B` | Mutual interest, messaging, voice, block interaction. | Beta test owner |
| `STG_MEMBER_RESTRICTED` | Restricted/safety state denial. | Trust & Safety owner |
| `STG_MEMBER_REPORT_CASE` | Test-only safety/report scenario with no fabricated evidence payload. | Trust & Safety owner |
| `STG_STAFF_VERIFICATION` | Scoped verification reviewer. | Verification owner |
| `STG_STAFF_SAFETY` | Scoped safety reviewer. | Trust & Safety owner |
| `STG_STAFF_EDITORIAL` | Editorial reviewer. | Editorial owner |
| `STG_STAFF_PUBLICATION` | Independent publication approver. | Editorial owner |
| `STG_STAFF_SUPPORT` | Scoped support operator. | Support owner |
| `STG_ADMIN_OPERATIONS` | Stage-only operations administrator. | Release/staging owner |

## Accessibility ownership and staging readiness gate

The accessibility test owner is **UNASSIGNED — USER ACTION REQUIRED**. Once assigned, that owner must execute the keyboard, screen-reader, mobile, desktop, reduced-motion, low-bandwidth, and authenticated smoke matrices only against approved staging accounts.

| Readiness condition | Status |
| --- | --- |
| Named primary technical owner | [ ] |
| Named backup technical owner | [ ] |
| Named staging/database/backup/monitoring/security/release owners | [ ] |
| Isolated staging hosting | [ ] |
| Isolated MySQL/TiDB database | [ ] |
| Isolated private storage | [ ] |
| Staging OAuth/authentication | [ ] |
| Approved staging domain/TLS | [ ] |
| Monitoring configured and safe test event observed | [ ] |
| Backup configured | [ ] |
| Isolated restore test completed | [ ] |
| Fictional accounts created and registered | [ ] |
| Least-privilege staging access verified | [ ] |
| Accessibility test owner assigned | [ ] |

If any item remains unchecked, **STAGING TESTING NOT READY**. Production payments, email, SMS, push, DNS, database, storage, OAuth, and real member accounts remain outside this checkpoint and must not be activated or used.
