# BANTABATO — Staging Operations Runbook

**Status:** Preparation only. **STAGING ENVIRONMENT REQUIRED.** None of the monitoring, alerts, backups, restores, accounts, providers, legal approvals, security approvals, or named owner assignments in this document is active or verified.

## Privacy-safe Sentry and monitoring preparation

The Sentry connector is present but disabled. A staging Sentry project must not be described as active until an authorized owner enables the connector or otherwise configures the selected vendor, completes a safe synthetic event, and records the resulting evidence. The existing `/api/healthz` endpoint is liveness-only; it is not a claim about database, storage, provider, worker, or member health.

| Category | Permitted staging signal | Prohibited event content | Proposed threshold | Proposed recipient | Current status |
| --- | --- | --- | --- | --- | --- |
| Availability | Health-route status, latency, UTC timestamp. | Cookies, bearer tokens, request body, account data. | Consecutive configured health failures. | Technical operations owner and backup. | **NOT CONFIGURED** |
| Application/API error | Route class, status, safe error code, redacted correlation ID. | Private messages, form values, headers, stack data visible to members, tokens. | New high-severity unhandled error or sustained error-rate increase. | Technical operations owner. | **NOT CONFIGURED** |
| Authentication | Aggregate failure reason and count. | Session token, OAuth state, email where avoidable, password. | Rate materially above approved baseline. | Technical and security owners. | **NOT CONFIGURED** |
| Database/storage | Provider health, latency, capacity, safe operation category. | Connection strings, object keys, signed URLs, private media/documents. | Provider critical status or sustained operation failures. | Technical operations owner. | **NOT CONFIGURED** |
| Jobs/providers | Aggregate backlog, failure category, retry count. | Provider payload, recipient, private content, secret. | Any critical job failure after worker/provider exists. | Responsible provider/worker owner. | **NOT CONFIGURED** |
| Safety | Aggregate queue age/failure count, incident ID. | Report/evidence/message content, reporter or target identity. | Critical workflow failure or approved queue-age threshold. | Trust & Safety and security owners. | **NOT CONFIGURED** |

Before a Sentry staging project is used, configure environment tag `staging`, release/checkpoint tag, explicit data scrub rules, server-side sampling, retention setting, read-only event access for testers, no source maps containing secrets, test alert routing, a synthetic non-sensitive test error, and a removal/disable step. Do not add Sentry’s browser/server DSN until an owner approves the data-processing and privacy configuration.

## Backup, restore, and rollback preparation

| Area | Required staging preparation | Evidence required before readiness may be claimed | Current status |
| --- | --- | --- | --- |
| Database backup | Identify provider, scope, encryption, frequency, retention, owner, and immutable/accessible recovery artifact. | Redacted artifact identity, timestamp, checksum or provider confirmation. | **NOT VERIFIED** |
| Storage | Identify stage-only media/object backup and recovery boundaries separately for profile media, voice, verification, and safety artifacts. | Private-access review and recovery inventory. | **NOT VERIFIED** |
| Configuration | Record redacted stage configuration inventory and secret-rotation owner; never copy secret values into tickets or source. | Approved redacted comparison to production, without values. | **NOT CONFIGURED** |
| Restore test | Restore only non-production synthetic data into a new isolated recovery target. | UTC record, actor, target identity, table/object checks, findings, cleanup outcome. | **NOT EXECUTED** |
| Rollback | Use prior application checkpoint for code; review forward-fix versus restore for schema/data. | Incident record, decision owner, rollback/recovery validation. | **NOT EXECUTED** |

The first restore test must use only staging synthetic data. It must confirm application connection, migration consistency, test-account access, private-media denial, controlled signed media access, permissions, safety restrictions, and no outbound notification/payment path. It must then record cleanup and access revocation. Do not attempt a production restore merely to complete a checklist.

## Staging access-control matrix

| Role | Permitted staging access | Not permitted | Credential protection and revocation | Status |
| --- | --- | --- | --- | --- |
| Developer | Stage source, build, deployment configuration, and scrubbed application logs. | Production data, production secrets, unsupervised member/staff action. | Least-privilege role, time-bounded access if available, remove at task end. | **OWNER REQUIRED** |
| Tester | Assigned fictional member/family accounts and test evidence. | Real-member interaction, staff queues unless separately assigned, secrets. | Controlled account register, session revoke, deactivate/cleanup after test. | **OWNER REQUIRED** |
| Safety reviewer | Controlled safety records only, aggregate staging monitoring category. | Real evidence, unrelated member content, production safety data. | Scoped permission, fresh authentication, audit review, revoke session. | **OWNER REQUIRED** |
| Editorial reviewer | Controlled voluntary story lifecycle artifacts only. | Private source drafts/media outside assigned test scenario. | Scoped permission, independent approval where required, revoke session. | **OWNER REQUIRED** |
| Administrator | Stage-only beta and operations controls. | Production infrastructure, unapproved provider activation, self-approval where prohibited. | Separate identity, fresh authentication, four-eyes record, revoke session. | **OWNER REQUIRED** |

## Ownership matrix

No names are assigned. Each primary and backup is **UNASSIGNED — USER ACTION REQUIRED**.

| Ownership area | Primary | Backup | Required responsibility |
| --- | --- | --- | --- |
| Technical operations | UNASSIGNED | UNASSIGNED | Hosting, environment, health, incident coordination. |
| Backup/restore | UNASSIGNED | UNASSIGNED | Backup source, recovery target, restore validation, evidence. |
| Monitoring | UNASSIGNED | UNASSIGNED | Tool configuration, scrub rules, routing, testing, retention. |
| Security | UNASSIGNED | UNASSIGNED | Incident containment, access review, threat/security findings. |
| Trust & Safety | UNASSIGNED | UNASSIGNED | Controlled safety review, escalations, restricted workflow policy. |
| Verification | UNASSIGNED | UNASSIGNED | Controlled verification scope, fresh-auth review, member-safe outcomes. |
| Editorial | UNASSIGNED | UNASSIGNED | Consent-scoped story review and publication separation. |
| Support | UNASSIGNED | UNASSIGNED | Test support handling and safe escalation. |
| Incident response | UNASSIGNED | UNASSIGNED | Severity, communications decision, post-incident review. |
| Beta testing | UNASSIGNED | UNASSIGNED | Synthetic-account approval, test register, reset and cleanup. |
| Release management | UNASSIGNED | UNASSIGNED | Candidate checkpoint, approval, migration decision, rollback. |

## Authenticated staging smoke-test matrix

Every row requires a staging origin, named tester, named owner, approved account reference, checkpoint/release, UTC time, expected/actual result, evidence location, issue/remediation reference, and cleanup result. No row may begin until staging isolation and fictional accounts are verified.

| ID | Area / route | Synthetic account(s) | Preconditions | PASS criteria | Evidence / owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| STG-01 | Account: sign-in, OAuth callback, logout | `STG_MEMBER_INCOMPLETE` | Stage OAuth and cookies isolated. | Session is server-side; logout/revocation deny access. | Redacted request/result and tester. | **BLOCKED — EXTERNAL ACTION REQUIRED** |
| STG-02 | Onboarding: `/app/onboarding` | `STG_MEMBER_INCOMPLETE` | Account enrolled in stage. | Progress recovers safely; no hidden eligibility bypass. | Screenshot/state result and tester. | **BLOCKED — EXTERNAL ACTION REQUIRED** |
| STG-03 | Photos: `/app/profile/media` | `STG_MEMBER_FIVE_PHOTO` | Five stage-only fictional artifacts. | Five-photo limit/order/review/private access enforced. | Redacted media metadata/result. | **BLOCKED — EXTERNAL ACTION REQUIRED** |
| STG-04 | Verification | Pending/approved/rejected verification members + reviewer. | Controlled statuses, no real document. | Correct member guidance, reviewer scope, recovery, audit. | Status-only evidence and reviewer. | **BLOCKED — EXTERNAL ACTION REQUIRED** |
| STG-05 | Profile/privacy/settings | `STG_MEMBER_FIVE_PHOTO` | Eligible profile state. | Self-scoped updates and privacy controls persist. | Redacted state and tester. | **BLOCKED — EXTERNAL ACTION REQUIRED** |
| STG-06 | Discovery/recommendations | Mutual pair + restricted member. | Controlled eligibility/match data. | Only eligible controlled profiles; restrictions override. | Pair identifiers/result. | **BLOCKED — EXTERNAL ACTION REQUIRED** |
| STG-07 | Mutual connection/messaging | `STG_MEMBER_MUTUAL_A/B` | Prior mutual interest. | Only mutual pair can message; read/retry/block behavior works. | Non-content event/result only. | **BLOCKED — EXTERNAL ACTION REQUIRED** |
| STG-08 | Voice notes | Mutual pair. | Stage-only non-sensitive temporary audio. | Authorization, preview, delete, private storage boundaries. | Non-content authorization evidence. | **BLOCKED — EXTERNAL ACTION REQUIRED** |
| STG-09 | Family Circle | Family member + controlled participant. | Explicit test invitation. | Permission/revocation; no message/document/evidence access. | Scope/denial results. | **BLOCKED — EXTERNAL ACTION REQUIRED** |
| STG-10 | Safety/block/report | Report scenario member + safety reviewer. | Test-only case; no fabricated evidence payload. | Block/restriction overrides; queue access scoped. | Case ID/status only. | **BLOCKED — EXTERNAL ACTION REQUIRED** |
| STG-11 | Notifications | Member test account. | External sends disabled. | In-app preferences; no email/SMS/push delivery. | Preference result. | **BLOCKED — EXTERNAL ACTION REQUIRED** |
| STG-12 | Membership/billing | Member test account. | Payment provider unavailable or sandbox-only. | Honest unavailable/provider-ready state; no live charge. | UI state/result. | **BLOCKED — EXTERNAL ACTION REQUIRED** |
| STG-13 | Success stories | Married member + editorial/publication roles. | Controlled consent lifecycle. | Consent, independent review, publication/withdrawal, public privacy. | Status/audit metadata. | **BLOCKED — EXTERNAL ACTION REQUIRED** |
| STG-14 | Staff operations/permissions/audit | All stage staff roles. | Scoped roles and fresh-auth setup. | Least privilege, denial, four-eyes, revocation, safe audit. | Permission matrix result. | **BLOCKED — EXTERNAL ACTION REQUIRED** |
| STG-15 | Recovery/offline/low bandwidth | Controlled member accounts. | Controlled network conditions. | Safe drafts only; no private cache or unsafe retry. | Browser/device/network record. | **BLOCKED — EXTERNAL ACTION REQUIRED** |

## Accessibility testing preparation

| Test area | Required environment and method | Required result | Status |
| --- | --- | --- | --- |
| Keyboard-only | Desktop browser; Tab, Shift+Tab, Enter, Space, Escape; visible focus capture. | Logical order, no trap, expected dialog escape/return focus. | **BLOCKED — EXTERNAL ACTION REQUIRED** |
| Screen reader | NVDA on Windows or an approved equivalent; named tester. | Correct landmark, label, error/loading/success announcement behavior. | **BLOCKED — EXTERNAL ACTION REQUIRED** |
| Mobile accessibility | Approved phone/browser assistive technology where available. | Reachable controls, readable errors, no horizontal overflow, mobile dialogs fit. | **BLOCKED — EXTERNAL ACTION REQUIRED** |
| Focus/form/error states | Five-photo, verification, messaging, Family Circle, Safety Center, billing, and staff scenarios. | Labels, descriptions, required/error recovery, modal focus, state announcements. | **BLOCKED — EXTERNAL ACTION REQUIRED** |

## Legal and security handoff checklist

| Handoff area | Required external review / decision | Status |
| --- | --- | --- |
| Legal | Privacy policy, terms, consent, story publication, verification/document handling, Family Circle permissions, country-specific considerations, subscription/cancellation/refund terms. | **LEGAL REVIEW REQUIRED** |
| Security | Independent security assessment; authentication, authorization/IDOR, storage, API, rate-limit, session, audit, secrets, and any future RLS review. | **SECURITY REVIEW REQUIRED** |

No approval is claimed by this checklist. Any discovered critical unauthorized access, safety bypass, private-media exposure, session-revocation failure, or staging-to-production boundary failure requires testing to stop, the relevant access to be contained, and a scoped incident record before retesting.
