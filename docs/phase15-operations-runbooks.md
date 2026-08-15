# Phase 15 Operations, Controlled Beta, and Incident Runbooks

## Operating principle

These procedures are ready to be adopted, but they are not evidence that staffing, monitoring, backups, providers, or legal review already exist. Every function below is **OWNER REQUIRED** until a named person accepts the responsibility and appropriate staff permissions are issued through the existing Operations Center.

## Controlled beta plan

The beta is deliberately staged. No stage automatically advances; the responsible owner must record the decision, test evidence, incidents, remediation, and safety/support capacity.

| Stage | Intended participants | Entry requirements | Exit requirements | Current state |
| --- | --- | --- | --- | --- |
| 1. Founder/internal | Named founders and authorized internal testers | Gate 1 infrastructure evidence, support owner, safety owner, approved test accounts | Core smoke tests complete; no unresolved critical privacy, security, or safety issue | **NOT READY** |
| 2. Closed beta | Small, consented invited group | A verified enrollment-control method, member-support route, report/block/verification checks, incident process | Support and safety response capacity evidenced; blockers resolved or accepted by authorized owner | **NOT READY** |
| 3. Expanded controlled beta | Larger controlled cohort | Stage 2 evidence, capacity review, monitoring and backup confirmation | Measured operational review; public-launch gate decision | **NOT READY** |

Every beta issue must be logged as a support ticket or operational incident, assigned, classified, resolved, retested, and closed. Feedback categories are onboarding, profiles, discovery, compatibility, messaging, voice notes, Family Circle, recommendations, billing, notifications, safety, performance, accessibility, and support. Feedback must not be transformed into engagement, popularity, or matchmaking signals.

## Member support runbook

| Step | Procedure | Scope and privacy rule |
| --- | --- | --- |
| Intake | Create or locate the support ticket, classify it, set severity, and assign only staff with `support` access. | Record the minimum information needed. Do not copy private messages, documents, or safety evidence into general tickets. |
| Triage | Identify whether the issue is account access, profile, verification, membership, payment, notification, Family Circle, technical, or safety. | Safety, fraud, document, or private-data concerns are escalated; they are not resolved in ordinary support notes. |
| Resolve | Use the least-privilege service path; record a member-safe outcome. | Do not promise provider action, refund, or legal result without authorized review. |
| Close | Confirm the issue is resolved or state the next member-safe step; log resolution and close. | Maintain audit history without exposing internal reasoning. |

Account-recovery requests require identity and session safeguards; staff may not disclose or reset sensitive account information outside the approved authentication process. Billing requests require finance scope. Verification requests require verification scope. Safety concerns are immediately routed to the Trust & Safety runbook.

## Trust & Safety and escalation runbook

1. Receive a member report, block-related concern, verification concern, integrity signal, or staff escalation.
2. Create or locate the scoped case and review only the minimal authorized information.
3. Assess urgency, potential member safety, current restrictions, evidence references, and applicable policy; do not use opaque scores or protected-characteristic inputs.
4. Apply only a reversible, scoped, policy-supported action within the staff member’s permissions. High-impact actions require fresh authentication and independent approval where policy requires it.
5. Send a member-safe outcome; do not disclose reporter identity, private evidence, reviewer notes, thresholds, or internal reasoning.
6. Record the audit event. Offer the existing appeal route where policy makes an appeal available.
7. Escalate potential critical security, private-data, payment, provider, or immediate-safety incidents to an operational incident with a named incident lead.

Permanent sanctions remain human-reviewed and must not be automated. Family participants do not receive internal safety data. Ordinary support staff, finance staff, and unrelated operational roles do not receive safety evidence or private communication access.

## Staff onboarding and offboarding

| Lifecycle event | Required action | Evidence |
| --- | --- | --- |
| Onboarding | Create a staff identity only after a named manager approves the role; issue the smallest permission template and recorded expiry/freshness controls. | Staff invitation, accepted role, permission inventory, and audit entry. |
| Role change | Propose a documented change and use independent approval when required. | Approval record and resulting audit entry. |
| Periodic review | Review active staff, roles, overrides, expired invitations, session controls, and high-impact access. | Review date, owner, findings, remediation. |
| Offboarding | Immediately revoke staff sessions and invitations, suspend/disable the staff identity, remove overrides, review recent high-impact audit actions, and transfer tickets/incidents. | Revocation and offboarding audit evidence. |

No staff role gains authority solely from its title. Staff must not receive passwords, private messages, verification documents, safety evidence, payment credentials, or raw production secrets unless a separately scoped and auditable procedure explicitly permits the minimum required access.

## Incident response

| Severity | Meaning | Initial response expectation | Escalation |
| --- | --- | --- | --- |
| Critical | Confirmed or likely authentication bypass, private-data exposure, safety restriction bypass, critical database integrity failure, active account compromise, or comparable material risk | Open incident, stop affected capability if safe, preserve minimal evidence, page the incident owner immediately | Infrastructure, security, Trust & Safety, legal review where applicable |
| High | Significant degradation, provider failure, high-risk staff error, or serious but contained safety/privacy concern | Assign owner promptly, mitigate, assess member impact, retest before closure | Operations lead plus specialty owner |
| Medium | Bounded functional issue with workaround and no material privacy/safety compromise | Triage during defined operations window, track through support/incident system | Functional owner |
| Low | Cosmetic, documentation, or low-risk usability issue | Log and prioritize in routine release planning | Functional owner |

For every incident: record detection time, owner, affected function, privacy/safety assessment, containment, status, decision trail, recovery verification, member communication decision, and follow-up. Do not add passwords, tokens, full messages, documents, or unnecessary evidence payloads to the incident record.

## Disaster-recovery procedures

| Scenario | Immediate containment | Recovery prerequisite | Verification | State |
| --- | --- | --- | --- | --- |
| Database failure | Stop dangerous writes if necessary; declare incident | Verified backup source, restore owner, isolated destination, recovery procedure | Integrity checks, authorization smoke tests, reconciled migrations | **BACKUP INFRASTRUCTURE REQUIRED** |
| Storage failure | Stop/limit uploads, preserve private access rules, record incident | Managed storage status and recovery owner | Authorized signed-media access and denial checks | **NOT VERIFIED** |
| Authentication failure | Maintain restricted access; do not bypass OAuth/session checks | OAuth configuration owner and provider status | Login/logout/session-revocation checks | **NOT VERIFIED** |
| Hosting failure | Use provider status and checkpoint rollback route | Hosting owner and communication process | Public route, health route, authorized smoke checks | **READY WITH CONDITIONS** |
| Payment/notification provider outage | Mark provider unavailable, avoid false delivery/charge claims, keep core safety/privacy rules active | Provider owner and documented disable/retry behavior | Provider-specific sandbox/controlled verification | **NOT CONFIGURED** |

A controlled restore test must identify the backup source, restore destination, executor, expected dataset and timestamp, integrity checks, security checks, rollback plan, and outcome. No restore test has been performed in this phase.

## Data governance and account lifecycle

| Data category | Purpose | Access boundary | Member control / lifecycle |
| --- | --- | --- | --- |
| Profile and preferences | Deliberate discovery, compatibility, privacy controls | Member-scoped and field-visibility rules | Member edit, visibility control, deactivation/deletion workflow where implemented |
| Messages and voice notes | Mutual-match communication | Conversation participation, block/restriction, signed private media | Member report/block/delete behavior; retention requires legal/policy decision |
| Verification documents | Manual verification | Scoped verification review and short-lived access | Resubmission/workflow controls; storage retention requires owner/legal policy |
| Safety evidence | Human-reviewable case assessment | Scoped Trust & Safety only | Member-safe outcome and appeal path; internal evidence retention requires policy |
| Billing records | Entitlement, reconciliation, refund boundaries | Member/finance scope | Provider and legal retention decision required before live payments |
| Staff/audit records | Least privilege, incident and operational accountability | Staff-scope and audit permission | Retention period requires operations/legal decision |

Before processing real member data in beta, the operator must verify the account lifecycle: deactivation/deletion request, session revocation, discovery/recommendation exclusion, Family Circle revocation, communication handling, notification behavior, and retention decision. Real identity documents must not be used for development testing unless securely required by an approved operational procedure.

## Member, outage, and privacy-incident communication

Member messages must be truthful, specific to the member’s action, and free of internal system details. Prepare approved templates for welcome/onboarding, verification result, safety action, appeal acknowledgement, billing state, account security, and service outage. Providers remain unavailable until configured; do not imply an email, SMS, push, or call was sent unless a delivery record verifies it.

For significant outage or suspected privacy incidents, the incident lead determines whether member communication is needed, what facts are confirmed, and when legal/privacy review is required. Do not invent statutory notification obligations. Keep internal investigation details, evidence, attacker information, and other members’ information out of member communications.
