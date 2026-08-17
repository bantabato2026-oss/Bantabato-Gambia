# Infrastructure Checkpoint: Ownership and Operational Procedures

## Production ownership registry

No personal names have been assigned in this checkpoint. Each role remains **OWNER REQUIRED** until the project owner records an actual person and a separate backup person through an approved operational process.

| Role | Primary owner | Backup owner | Status | Responsibilities | Escalation path |
| --- | --- | --- | --- | --- | --- |
| Primary Technical/Infrastructure Owner | OWNER REQUIRED | OWNER REQUIRED | **NOT CONFIGURED** | Managed hosting, environment changes, health monitoring, infrastructure incidents | Security Incident Owner, then project owner |
| Backup Technical/Infrastructure Owner | OWNER REQUIRED | OWNER REQUIRED | **NOT CONFIGURED** | Recovery coverage, access review, release continuity | Primary Technical/Infrastructure Owner |
| Trust & Safety Owner | OWNER REQUIRED | OWNER REQUIRED | **NOT CONFIGURED** | Reports, cases, enforcement approvals, appeals, safety escalation | Security Incident Owner for critical product/security risk |
| Verification Owner | OWNER REQUIRED | OWNER REQUIRED | **NOT CONFIGURED** | Scoped verification workflow and safe member outcomes | Trust & Safety Owner |
| Support Owner | OWNER REQUIRED | OWNER REQUIRED | **NOT CONFIGURED** | Member-support intake, routing, support quality, escalation | Trust & Safety / Technical owner by category |
| Billing/Finance Owner | OWNER REQUIRED | OWNER REQUIRED | **NOT CONFIGURED** | Future provider reconciliation, refunds, billing escalation | Technical/Incident owner for provider failures |
| Security Incident Owner | OWNER REQUIRED | OWNER REQUIRED | **NOT CONFIGURED** | Containment, evidence handling, communications decision, post-incident review | Project owner and required specialist review |
| Deployment/Release Owner | OWNER REQUIRED | OWNER REQUIRED | **NOT CONFIGURED** | Release checklist, approval record, rollback decision, post-deploy checks | Technical owner and incident owner |

## Exact staging setup specification

Staging is **NOT CONFIGURED**. Before creating it, provision a distinct application deployment and use the following separation requirements.

| Boundary | Staging requirement | Production-protection safeguard |
| --- | --- | --- |
| Application and domain | Dedicated non-production URL and release designation | Do not reuse the production origin or its OAuth callback. |
| Database | Separate database and credentials | Staging credentials must not have production write, read, administrative, or migration access. |
| Object storage | Separate bucket/namespace and credentials | Staging cannot read, write, list, or sign production private media. |
| OAuth | Separate callback/origin registration and non-production application configuration where supported | Do not permit staging callback URLs in production identity configuration unless explicitly needed and reviewed. |
| Secrets | Distinct environment values, rotated separately | Never copy production secret values into source, test output, logs, or staging files. |
| Providers | Sandbox/test credentials only, isolated sender and merchant configurations | Disable external sends and real charges until provider sandbox tests pass. |
| Test data | Purpose-created test members and synthetic non-sensitive profile content only | Do not restore real member messages, documents, or safety evidence into staging without approved privacy/legal procedure. |
| Staff/operations | Staging-only test roles and test cases | Staging must not modify production staff permissions, safety records, or audit data. |

The staging gate is **BLOCKED** until these boundaries, a named owner, and a successful separation review are documented.

## Monitoring and critical-alert configuration plan

Monitoring is **NOT CONFIGURED**. When an approved service is selected, configure only the health, error, and metadata needed for operations. Start from the public health endpoint; do not attach a user cookie or bearer token to liveness checks.

| Alert | Signal | Required routing | Privacy restriction | Current state |
| --- | --- | --- | --- | --- |
| Application unavailable | Consecutive health-check failure | Technical owner and backup | Status, timestamp, route only | **NOT CONFIGURED** |
| Database unavailable | Managed database health/failure state | Technical owner and backup | No connection string or query payload | **NOT CONFIGURED** |
| Storage failure | Managed storage health or upload/signing failure metadata | Technical owner and backup | No object key, signed URL, document, or media content | **NOT CONFIGURED** |
| Queue stopped | Worker heartbeat/delay/failure metadata after a worker is approved | Worker owner | No notification payload or member content | **NOT CONFIGURED** |
| Authentication spike | Aggregated failure count/rate | Technical and Security Incident owners | No cookies, tokens, or raw account credentials | **NOT CONFIGURED** |
| Critical safety failure | Scoped operational incident state | Trust & Safety and Security Incident owners | No evidence, reporter identity, or private message content | **NOT CONFIGURED** |
| Payment webhook failure | Provider event metadata only after payment activation | Finance and Technical owners | No payment credentials or customer payment data | **NOT CONFIGURED** |

## Backup, restore, and storage procedure

Database and storage backup status remains **NOT VERIFIED**. The following procedure is prepared but not executed.

1. Detect a database or storage failure and create a scoped operational incident.
2. Stop harmful writes or affected upload actions if that can be done safely; do not bypass authentication or privacy controls.
3. Identify the latest verified backup only after confirming provider, timestamp, encryption/access condition, and restoration owner.
4. Prepare an isolated, non-production recovery target with restricted operator access. Never overwrite production during a test.
5. Restore database content and schema, then verify critical tables, migration state, integrity relationships, authorization-sensitive records, and authentication-related consistency.
6. Verify application connectivity using non-production settings; do not connect a restore target to production notification, payment, storage, or identity-provider writes.
7. Verify security: private-media denial, staff scope, session boundaries, and no accidental outward notifications.
8. Record results, gaps, timing, owner, follow-up, and whether production service may safely resume.

Critical media requires a separate policy decision because profile photos, voice notes, verification documents, and safety evidence have different retention, recovery, cost, and privacy requirements. Do not copy them merely to satisfy a backup checklist. Database backup, critical-media backup, audit-record retention, and log retention all require privacy/legal review; no retention period is asserted here.

## Production access and deployment procedure

| Access class | Required controls | Current state |
| --- | --- | --- |
| Production application | Named operational role, least privilege, session revocation, auditability | **READY WITH CONDITIONS** |
| Database | Named approver, ticket/incident justification, time-bounded access where possible, query/change record, no casual direct writes | **NOT VERIFIED** |
| Storage | Named approved operator, private-object boundary, no broad listing/download, audited emergency access | **NOT VERIFIED** |
| Secrets | Managed environment only, named access, rotation process, no source/log exposure | **NOT VERIFIED** |
| Monitoring | Named read-only operational access and scrubbed event visibility | **NOT CONFIGURED** |
| Deployment | Named deploy owner, independent approval where practical, release evidence, rollback authority | **READY WITH CONDITIONS** |

Before a production configuration change, record release/checkpoint version, change owner, approver, expected impact, tests/type/build/audit results, backup status, monitoring status, rollback version, and post-change smoke outcome. If one person performs deploy, approve, and rollback, record the single-person risk and assign a backup before controlled beta.

## Incident record template

| Field | Required entry |
| --- | --- |
| Incident ID | Unique internal identifier |
| Date/time | Detection and major decision timestamps in UTC |
| Severity | Critical, high, medium, or low |
| Detected by | Authorized user, approved monitor, or service identifier |
| Affected system | Application, database, storage, authentication, provider, worker, or safety workflow |
| Impact | Member-safe description and scope; avoid private content |
| Actions | Containment and recovery actions with timestamps |
| Owner / escalation | Named owner and backup once assigned |
| Resolution / recovery | Verified recovery evidence and remaining risk |
| Post-incident review | Root cause category, follow-up owner, due date, completion record |

## Tabletop recovery exercise

The exercise is **NOT PERFORMED**. Before beta, convene the owners and walk through database failure, storage failure, application failure, and authentication failure. For each scenario, record detection path, decision authority, containment, dependency map, communication decision, restore/rollback path, validation steps, time observations, and corrective actions. A tabletop does not replace a controlled restore test.

## Authenticated production smoke-test preparation

Production smoke tests are **NOT CONFIGURED** because approved test accounts and named testers were not supplied. When authorized, execute only with clearly identified accounts that cannot contact real members, send unnecessary notifications, create real charges, upload sensitive identity documents, or generate misleading safety records.

| Test area | Required safe check |
| --- | --- |
| Authentication | Signup boundary, sign-in, sign-out, expired/revoked session denial |
| Member journey | Profile, discovery, compatibility, mutual interest, messaging, voice, Family Circle, recommendations, safety, settings |
| Provider boundaries | Billing and notifications present honest unavailable/provider-ready state; no real payment or external send |
| Staff | Authorized staff access, permission denial, revoked staff session, Operations Center scope |
| Security | Unauthorized API/media, cross-member access, cross-role access, blocks/restrictions |
| Mobile/PWA | Privacy-safe offline behavior and recovery; no private cache review by test accounts |

Record only release/version, tester, test-account identifier, result, issue reference, remediation, and retest result. Do not store real member data, private conversations, documents, payment credentials, or safety evidence in smoke-test artifacts.
