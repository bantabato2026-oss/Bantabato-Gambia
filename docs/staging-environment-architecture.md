# BANTABATO — Isolated Staging Environment Architecture

**Status:** Preparation only. No staging application, database, storage namespace, OAuth registration, Supabase project, Sentry project, Cloudflare hostname, account, bucket, secret, migration, or provider has been created or activated.

## Architecture decision

The current application uses **MySQL/TiDB through Drizzle ORM**, application-server authorization, and managed storage helpers. It does not currently use Supabase as its production database, authentication provider, storage backend, or RLS enforcement layer. Therefore, an isolated staging environment must first preserve the current stack’s separation requirements. A future Supabase migration is a separate architecture decision and must not be inferred from the presence of a disabled connector.

| Boundary | Required staging state | Current state | External action required |
| --- | --- | --- | --- |
| Hosting/origin | Dedicated staging deployment and clearly distinct hostname, never the production domain. | **NOT CONFIGURED** | Provision an approved origin and record its deployment identifier. |
| Runtime identity | Server-injected `APP_ENV=staging`; no client-selected environment. | Shared resolver and regression coverage prepared. | Inject staging value through approved hosting configuration. |
| Database | Separate MySQL/TiDB service/database and distinct `DATABASE_URL`. | **NOT CONFIGURED** | Provision a non-production database with a least-privilege migration/application identity. |
| Storage | Separate private stage-only namespace/container and credentials. | **NOT CONFIGURED** | Provision stage-only storage and verify signed access against stage test assets only. |
| OAuth/session | Separate OAuth registration/callback and session/cookie scope where supported. | **NOT CONFIGURED** | Register a dedicated staging callback and inject separate credentials. |
| Notifications/payments | Disabled or sandbox-only; no external recipient or real charge path. | **NOT CONFIGURED** | Configure only after explicit provider approval and isolated test controls. |

## Runtime environment and configuration requirements

The shared `getRuntimeEnvironment()` helper now accepts only server-injected `APP_ENV` values of `development`, `staging`, or `production`, falling back to server `NODE_ENV` only when `APP_ENV` is absent or unsupported. It does not read client data, query input, database state, or browser storage. This preserves existing server-authoritative beta scoping while allowing staging to be declared explicitly.

| Variable or configuration group | Staging requirement | Secret handling |
| --- | --- | --- |
| `APP_ENV` | Set exactly to `staging`. | Not secret, but server-only configuration. |
| `NODE_ENV` | Use the hosting provider’s production-runtime value only for the staging deployment process. | Not secret. |
| `DATABASE_URL` | Stage-only MySQL/TiDB endpoint, database, and least-privilege account. | Secret; inject through provider secret management. |
| `JWT_SECRET` | Unique high-entropy staging value, never copied from production. | Secret; never commit, log, screenshot, or place in client code. |
| `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL` | Dedicated staging OAuth registration/callback values. | Treat client identifiers and server configuration separately; keep server credentials secret. |
| `OWNER_OPEN_ID`, `OWNER_NAME` | Staging-only authorized operational identity, if required by the platform. | Restrict to authorized operator configuration. |
| Built-in storage/Forge configuration | Separate staging identity/namespace where supported, otherwise do not run private-media tests. | Secret/provider-managed values only. |
| Future Sentry, payment, email, SMS, push, verification values | Omit until an approved sandbox configuration exists. | Never substitute production values. |

No `.env` template containing secret-shaped values is committed. Local `.env` variants remain ignored; approved staging values must be set through the selected hosting/provider configuration surface.

## Migration, storage, authentication, and RLS preparation

| Area | Required procedure before staging test execution |
| --- | --- |
| Drizzle migrations | Generate additive migration SQL, have a reviewer read it, apply it only using the dedicated staging `DATABASE_URL`, record migration IDs/UTC time/actor, and retain a rollback plan. |
| Storage | Keep private media private, use stage-only object namespaces, verify unauthenticated denial and controlled signed access with stage-only artifacts, and include media cleanup in the test-run record. |
| Authentication | Confirm separate callback/cookie behavior, no production session reuse, staff fresh-authentication behavior, and immediate session revocation testing using only approved fictional identities. |
| Authorization | Preserve application-server permission, IDOR, Family Circle, safety, and audit checks; test denial across controlled accounts before any role is granted broader scope. |
| RLS | **Not applicable to the current MySQL/Drizzle stack.** If Supabase is later adopted, design a separate migration with deny-by-default RLS, no service-role key in browser code, server-enforced tenant/relationship checks, and an independent RLS review before it handles any member data. |

## Staging-only synthetic-account matrix

Account records may be created only after isolation is proven, a named owner approves the run, and each record uses opaque fictional labels with no real name, phone, email, image, document, address, or personal information. These are **definitions, not created accounts**.

| Reference | Required scenario | Minimum stage-only condition | Purpose |
| --- | --- | --- | --- |
| `STG_MEMBER_INCOMPLETE` | Incomplete member | No completion-ready profile state. | Onboarding and recovery. |
| `STG_MEMBER_FIVE_PHOTO` | Five-photo complete member | Exactly five approved fictional test-photo artifacts. | Eligibility/readiness gates. |
| `STG_MEMBER_VERIFY_PENDING` | Verification pending | Controlled pending status only; no real document. | Pending guidance and privacy. |
| `STG_MEMBER_VERIFY_APPROVED` | Verification approved | Controlled reviewed status. | Approved-state display and gating. |
| `STG_MEMBER_VERIFY_REJECTED` | Verification rejected | Controlled rejection/recovery status. | Rejection language and retry boundary. |
| `STG_MEMBER_MARRIED` | Married declaration | Private staged declaration and consent lifecycle. | Declaration/withdrawal behavior. |
| `STG_MEMBER_FAMILY` | Family Circle member | Isolated staged participant relationship. | Permission, scope, and revocation. |
| `STG_MEMBER_MUTUAL_A` / `STG_MEMBER_MUTUAL_B` | Mutual connection pair | Two controlled eligible members only. | Discovery, mutual interest, messaging, voice, and blocking. |
| `STG_MEMBER_RESTRICTED` | Restricted member | Controlled safety/eligibility restriction. | Restricted guidance and denial. |
| `STG_MEMBER_REPORT_CASE` | Block/report scenario member | Controlled test case with no fabricated evidence payload. | Report/block override behavior. |
| `STG_STAFF_VERIFICATION` | Verification reviewer | Least-privilege verification role. | Review scope/fresh auth/audit. |
| `STG_STAFF_SAFETY` | Safety reviewer | Least-privilege safety role. | Queue/privacy controls. |
| `STG_STAFF_EDITORIAL` | Editorial reviewer | Least-privilege editorial role. | Consent and story review. |
| `STG_STAFF_PUBLICATION` | Publication approver | Independent approval role. | Four-eyes publishing rule. |
| `STG_STAFF_SUPPORT` | Support operator | Least-privilege support role. | Member support access limits. |
| `STG_ADMIN_OPERATIONS` | Operations administrator | Separate approved admin identity. | Beta/release/access-control boundaries. |

## Least-privilege staging access

| Access role | Permitted scope | Revocation and evidence |
| --- | --- | --- |
| Developer | Stage deployment configuration and application logs without private payloads. | Remove provider/hosting role and record UTC revocation. |
| Tester | Only assigned synthetic member/family accounts and test case evidence. | Expire/revoke credentials at end of the run. |
| Safety reviewer | Only controlled safety artifacts and aggregate safe metrics. | Remove scoped staff permission and revoke session. |
| Editorial reviewer | Only controlled voluntary story lifecycle artifacts. | Remove scoped staff permission and revoke session. |
| Administrator | Stage-only beta/access controls; no production resource access. | Dual review where available, revoke session, and preserve safe audit metadata. |

## Required external provisioning checklist

> **BLOCKED — EXTERNAL ACTION REQUIRED:** A named owner must authorize and provision the isolated hosting origin, database, storage namespace, OAuth application, staging secrets, account-management method, and provider account scopes. Only then may the defined synthetic accounts, migrations, test data, or smoke tests be executed.
