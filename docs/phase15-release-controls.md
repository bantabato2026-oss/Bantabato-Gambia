# Phase 15 Release Controls and Production Procedure

## Purpose and status language

This document prepares controlled deployment and operational verification. It does **not** activate providers, scheduled work, public registration controls, or a public launch. Use the following terms exactly: **READY**, **READY WITH CONDITIONS**, **BLOCKED**, **NOT CONFIGURED**, **NOT VERIFIED**, and **NOT IMPLEMENTED**.

## Environment separation procedure

| Environment | Purpose | Required isolation | Current state |
| --- | --- | --- | --- |
| Development | Local engineering and automated regression work | Non-production database/media only; no real member documents, charges, or provider sends | **READY** |
| Staging | Authenticated pre-production validation and provider sandbox testing | Separate domain, database, storage namespace, OAuth callback, provider sandbox credentials, and non-production members | **STAGING ENVIRONMENT REQUIRED** |
| Production | Controlled real-world operation | Production-only OAuth callback, secret values, database, storage, providers, owners, backups, monitoring, and no test credentials | **DEPLOYED — NOT FULLY VERIFIED** |

Production secrets must be supplied only through the managed environment configuration. Required existing runtime values are the OAuth application identifier and URL, session secret, database URL, owner identity, and server-only managed-service credentials. Provider secrets must not be added until a provider is selected and its owner, data-processing review, sandbox test plan, and outage procedure are approved.

## Deployment and release checklist

Every release must have a version/checkpoint, concise change record, full test result, type-check result, production-build result, dependency-audit result, migration decision, rollback target, and a named operator. A release is **BLOCKED** when backup confirmation, monitoring confirmation, deployment ownership, or rollback access is missing.

| Step | Required evidence | State before any future production release |
| --- | --- | --- |
| Code validation | `pnpm check`, `pnpm test`, `pnpm build`, and `pnpm audit --prod` pass | Required for each release |
| Migration review | Schema and generated SQL reviewed; no destructive migration without explicit safety approval | Required if schema changes |
| Backup confirmation | Database and critical storage backup source, retention, restore owner, and latest successful backup confirmed | **BLOCKED — OWNER CONFIRMATION REQUIRED** |
| Monitoring confirmation | Privacy-safe health check, error tracking, alert routing, and on-call owner confirmed | **READY WITH CONDITIONS**: `/api/healthz` exists; monitoring destination is **NOT CONFIGURED** |
| Rollback target | Prior checkpoint/version and database/configuration impact documented | Managed checkpoint history is available; database rollback requires case-by-case review |
| Deployment check | Public route and required authenticated flows checked after deploy | Public landing route was checked; authenticated production test remains required |

## Safe health and monitoring boundary

`GET /api/healthz` now returns only process liveness, service name, and timestamp. It is intentionally a liveness endpoint, not a database, storage, payment, queue, provider, or safety health assertion. It may be safely polled after an operator configures monitoring. The endpoint must not be expanded to include member counts, credentials, provider tokens, database errors, internal queue payloads, private messages, evidence, or account data.

### Monitoring configuration required before Gate 1

| Signal | Required owner action | Privacy rule |
| --- | --- | --- |
| Liveness | Poll the public health route from an approved monitor and configure an alert after consecutive failures | Record status and request metadata only; do not attach cookies or tokens. |
| Application/API errors | Configure server-side error tracking with environment tagging and sampling | Scrub request bodies, cookies, bearer tokens, private message text, documents, safety evidence, payment information, and raw phone values. |
| Database/storage | Configure managed-service alerts or approved synthetic checks | Do not expose connection strings, object keys, or signed URLs in alert payloads. |
| Provider/queue | Enable only after a provider or worker is configured | Route failed state and identifier metadata to the owner; never provider payloads or member content. |
| Safety-critical operation | Use scoped operational incidents and escalation procedure | Keep member-safe and internal investigation information separate. |

## Provider activation control

No provider can move from **NOT CONFIGURED** to **CONFIGURED** merely by adding a secret. Before a provider is enabled, the responsible owner must record the purpose, data sent, geography, credentials, sandbox test results, failure behavior, retry/idempotency behavior, privacy/data-processing review, member-facing communication, support process, and rollback/disable step. Payment activation also requires signed-webhook verification, reconciliation, refund authority, and sandbox testing without real charges.

## Controlled beta release control

Existing Operations Center feature-flag records are auditable operational metadata. They are **not currently a verified global member-enrollment gate**. Therefore they must not be represented as an automatic closed-beta enrollment mechanism. Before Gate 3, the operator must select and verify one of the following controlled enrollment methods:

| Approach | Trade-off | Current state |
| --- | --- | --- |
| Manual, invitation-only onboarding by a named founder/operator group | Smallest scope; relies on disciplined operational access and documented consent | **NOT VERIFIED** |
| A separately implemented server-enforced beta allowlist and capacity limit | Stronger technical control; requires additive design, migration, tests, and review | **NOT IMPLEMENTED** |

Until a choice is implemented and verified, the beta gate is **BLOCKED**.

## Smoke-test procedure

Run the following only with authorized test accounts and no live payment charges. Capture date, release version, executor, result, issue link, and retest result in the operations log. A failed critical privacy, security, safety, or authorization check blocks progression.

| Area | Required smoke check |
| --- | --- |
| Public and authentication | Landing route, sign-in, registration boundary, OAuth callback, logout, expired/revoked session denial |
| Member core | Onboarding, profile privacy, discovery, compatibility, recommendations, mutual interest, message send/read, voice upload/playback, settings |
| Family and safety | Invitation/revocation, report, block, safety center, verification result/review boundaries, appeal where applicable |
| Billing and notifications | Honest unavailable/provider-ready state, entitlement boundary, in-app notification preferences; no unconfigured provider claim |
| Staff | Scoped staff sign-in, permissions, Operations Center, session revocation, approval separation, audit history |
| Security | Unauthorized route/API/media, cross-member conversation and report access, cross-role staff access, restricted/suspended-member boundaries |
| Mobile/PWA | Critical member journey, install truthfulness, offline/private-cache exclusion, low-bandwidth recovery |

## Rollback procedure

1. Declare a scoped operational incident and stop any affected release or provider capability using the approved control path.
2. Record the affected checkpoint, configuration change, migration status, and member-safety/privacy impact without adding private payloads to the incident.
3. Restore the last known stable application checkpoint when application code is implicated. Confirm the rendered public route and authorized smoke tests after restoration.
4. Do **not** blindly roll back a database schema. Review data written since the migration, database compatibility, backup availability, and a safe forward-fix or controlled restore plan.
5. Rotate or revoke credentials where an access-control or provider secret incident is suspected; document ownership and completion in the audit trail.
6. Communicate externally only through approved, member-safe outage or privacy-incident processes.

## Post-deployment check

Immediately after an approved release, verify the deployed HTTPS landing route, health route, OAuth redirection, authenticated member workspace, private-media denial without authorization, Operations Center denial without staff scope, Operations Center allowed flow with an authorized test staff account, PWA cache safety, and any newly enabled provider in its own sandbox or controlled test mode. The current Phase 15 deployment inventory has verified only the public landing route; this checklist remains **NOT EXECUTED** for authenticated production workflows.
