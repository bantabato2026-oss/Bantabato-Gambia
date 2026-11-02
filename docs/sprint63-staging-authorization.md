# Bantabato Sprint 63 — Isolated Staging Authorization

**Status:** **AWAITING FOUNDER APPROVAL — NOT PROVISIONED**

## Recommended architecture

Use the existing WebDev-managed runtime pattern with a distinct staging deployment target and hostname, a separate MySQL/TiDB database, a private storage namespace, and a separate OAuth application/callback. This is the simplest compatible option because it preserves the current React 19, Express 5, tRPC 11, Drizzle, and managed deployment architecture without introducing a new paid platform.

No new platform, domain, recurring expense, or provider should be activated without explicit founder approval.

## Required authorization and resources

1. Hosting/deployment target and distinct staging hostname or approved subdomain.
2. Separate database resource with least-privilege staging identity.
3. Separate private storage bucket/namespace.
4. Separate OAuth client, callback URL, cookie scope, and fictional test accounts.
5. Approved secret-manager project, named technical owner, and access policy.
6. Staging environment identity values and a verification procedure that does not print secrets.
7. Staging-only monitoring destination with scrubbing, alert route, and incident owner.
8. Disposable backup/restore target and versioned rollback target.
9. Approval to seed deterministic fictional A–J accounts only.

## Controlled execution gates

Execution may begin only after the approval register contains an explicit approval for `STAGE-001`, all resource identities are available through secure channels, and a technical owner accepts the scope. The operator must then record the deployment version, environment identity, migration result, database/storage/auth isolation checks, no-send configuration, and health result.

## Stop conditions

Stop before configuration if approval is absent, a resource is shared with production, credentials are missing or exposed, environment identity cannot be proved, a provider could contact real users, or a required owner is not accepted. Never substitute the public deployment for staging.

## Current result

No staging target, domain, database, storage, OAuth client, secret-manager scope, or test account set was approved or provisioned in Sprint 63. Related gates remain blocked.
