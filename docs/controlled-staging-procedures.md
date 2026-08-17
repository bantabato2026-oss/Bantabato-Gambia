# Controlled Staging, Synthetic Test Accounts, Monitoring, and Recovery Procedures

**Status:** Procedures only. They are not evidence that staging, monitoring, alerts, backups, restores, test accounts, production access, or external providers have been configured or exercised.

## Isolated staging specification

Staging may be created only by an authorized infrastructure owner. It must have an isolated application deployment and origin, database, storage namespace, OAuth registration and callback, environment values, secrets, notification configuration, payment sandbox, and test-data register. A stage must never use the production database URL, production private-media location, production OAuth credentials/callback, production provider secret, or production payment/webhook endpoint.

| Boundary | Required separation | Current state | Verification before use |
| --- | --- | --- | --- |
| App/domain | Distinct staging deployment and origin | **NOT CONFIGURED** | Record origin and deployment identifier; verify it is not the production domain. |
| Database | Different database/service identity and `DATABASE_URL` | **NOT CONFIGURED** | Compare redacted connection identity only; attempt approved stage query; verify production is not reachable. |
| Storage | Different private namespace/container and service identity | **NOT CONFIGURED** | Verify unauthorized access denied; controlled stage signed URL succeeds only for stage asset. |
| OAuth | Separate app/callback/session scope as supported | **NOT CONFIGURED** | Verify staging callback and no production callback/cookie crossover. |
| Secrets | Separate environment injection and rotation records | **NOT CONFIGURED** | Verify values are absent from source/client/logs and do not equal production records through approved operator comparison. |
| Notifications | Disabled or sandbox-only configuration | **NOT CONFIGURED** | Verify no external recipient/delivery is possible. |
| Payments | Disabled or sandbox-only merchant/webhook configuration | **NOT CONFIGURED** | Verify no live charge/refund/webhook can occur. |

Any successful staging-to-production database, storage, API, credential, or private-media access outside an explicitly approved administrative maintenance channel is a **critical blocker**. Stop testing, create an incident, preserve minimum necessary evidence, revoke/rotate the affected credential as directed by the owner, and do not resume until independently reviewed.

## Synthetic test-account register and lifecycle

Create records only after staging exists and a named operator approves the scope. Use opaque account labels, not a real person’s name, address, photo, phone, document, or contact information. Mark the account/profile as test data in an operator-held register; do not add test marker fields to user-visible production profile content.

| Reference | Required role | Minimum data | Purpose | Lifecycle |
| --- | --- | --- | --- | --- |
| `TEST_MEMBER_A` | Member | Synthetic display label and non-real controlled values | Profile/privacy, discovery, mutual interest, messaging, block/report, readiness | Create, invite/enroll if relevant, test, suspend/logout, deactivate/remove as supported |
| `TEST_MEMBER_B` | Member | Synthetic display label and non-real controlled values | Compatibility, mutual interest, counterpart authorization, voice, recommendations | Create, test only with A, suspend/logout, deactivate/remove as supported |
| `TEST_FAMILY_PARTICIPANT` | Family participant | Controlled account and purpose-specific link | Family permission/isolation/revocation | Invite, test only A’s link, revoke/remove |
| `TEST_STAFF` | Least-privilege staff role | Authorized staff identity only | Support/safety/verification/audit scope checks | Invite/accept, test, revoke session/deactivate |
| `TEST_ADMIN` | Approved administrator | Separate authorized admin identity only | Beta controls, four-eyes, access review | Separate approval, test, revoke/deactivate |

Test accounts must never contact uninvolved real members, create a real charge, send external notifications, upload a real verification document, create fictional safety evidence, or be used for marketing. If staging cannot prove isolation, do not create accounts there.

## Safe staging test-data reset

There is **no production reset mechanism**. A staging reset requires a named staging owner, incident/ticket or approved test-run reference, confirmation of isolated database and storage identity, test-account register review, and audit note. It may remove only records created by documented test account identifiers and their dependent stage-only test artifacts. It must not use broad unscoped deletion, run against production, purge application audits without a retention decision, or delete unknown media. A reset plan must be dry-run/reviewed, execute with a row/object count, validate no non-test records were affected, and create a completion/exception record.

## Privacy-safe monitoring and alerting plan

The health endpoint is a liveness check, not dependency health or active monitoring. If monitoring is later configured, use minimum necessary operational signals, restrict access, set retention, and document vendor, owner, scrub rule, routing, and a safe test event.

| Category | Permitted signal | Prohibited content | Alert readiness |
| --- | --- | --- | --- |
| Application availability | Health endpoint response/time/status | Request bodies, member records, credentials | **NOT CONFIGURED** |
| API errors | Route class, status, redacted correlation ID, safe error code | Private messages, form content, stack data sent to users, tokens | **NOT CONFIGURED** |
| Database/storage | Managed service status/latency/capacity from provider console | URLs, credentials, object keys, private assets | **NOT CONFIGURED** |
| Authentication | Aggregate failure rate and safe reason category | Session token, OAuth state, email where avoidable | **NOT CONFIGURED** |
| Jobs/queues/providers | Aggregate backlog/failure category and retry state | Provider payloads, recipient/private content, secrets | **NOT CONFIGURED** |
| Safety workflows | Aggregate queue age/failure count with staff-only access | Report details, evidence, internal notes, member identity in alert text | **NOT CONFIGURED** |

Required future alert categories are application/database/storage unavailable, authentication-failure spike, critical safety workflow failure, background-job failure, notification-provider failure, and payment-webhook failure only after relevant services exist. A safe synthetic event may be generated only after monitoring exists and must contain no private content or credential.

## Backup, integrity, restore, and storage recovery procedure

| Record field | Current value |
| --- | --- |
| Backup ID/timestamp/size/completion/checksum | **NOT VERIFIED** — no external backup artifact supplied |
| Backup provider/frequency/retention/encryption/location | **NOT VERIFIED** |
| Restore target/timestamp/result | **NOT EXECUTED** — no isolated staging target exists |
| Storage backup/recovery artifact | **NOT VERIFIED** |

When a real backup exists, an authorized recovery owner must identify a recent successful backup without exposing credentials; prepare a new isolated non-production target; restore database/schema/configuration references without overwriting production; validate critical tables, stage app connection, and synthetic account login/profile/discovery/messaging/Family Circle/safety/staff paths; secure the restore target; capture result/failures/corrective actions; and destroy or retain it under an approved policy. The recovery flow is detect, declare, identify backup, prepare target, restore, validate, secure, resume, monitor, close, and conduct post-incident review.

Private profile photos, voice notes, verification documents, and safety evidence need separate storage retention/recovery review. Access controls and legal retention remain in force before, during, and after recovery.

## Production access, secrets, and provider safety

Production database, storage, hosting, deployment, monitoring, secret, staff-administration, and provider access each require a named primary and backup owner, least privilege, time-bounded access where possible, audit/review procedure, and offboarding/revocation path. Current ownership is **OWNER REQUIRED**.

Secrets may not be stored in source, public configuration, browser bundles, client storage, diagnostics, screenshots, tickets, or logs. Environment separation must be reviewed by an authorized operator through approved redacted configuration comparison; do not paste secret values into this procedure or a test record. Payment, email, SMS, push, calling, and verification providers remain **NOT CONFIGURED** and must remain unavailable until separately approved, configured, tested, monitored, and supported.

## Authenticated smoke, cross-account, four-eyes, mobile/PWA, and performance preparation

The complete controlled-account smoke-test matrix remains in `closed-beta-smoke-test-plan.md`. Before execution, add environment, tester, account reference, release/checkpoint, expected result, actual result, UTC time, evidence, issue, remediation, and retest fields. Test unauthorized controlled access to profile-private fields, messages, media, Family Circle, safety data, recommendations, readiness, and staff resources; expected result is denial outside the authorized relationship/scope.

Do not execute a four-eyes scenario against a real member. Use only a controlled resource and confirm that requester and approver differ, self-approval is denied, expired/decided records cannot be reused, and audit records contain no private payload. Mobile/PWA checks require approved staged accounts at desktop and phone viewport/device, including login, profile, discovery, messaging, Family Circle, safety, settings, install/update/offline behavior, and private cache exclusions. Low-bandwidth testing must use controlled slow/intermittent/offline conditions and verify no unsafe private fallback occurs.

Performance work is non-destructive. Capture measured page/API/database/authentication response characteristics only from the approved isolated environment; state browser, network condition, time range, and sample size. Do not infer production scale, run destructive load tests, or call estimates measured results.
