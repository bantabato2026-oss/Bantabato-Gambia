# Closed-Beta Test-Account and Authenticated Smoke-Test Procedure

**Status:** **NOT EXECUTED.** This is a controlled test procedure, not evidence that production test accounts, beta users, providers, payments, or production smoke results exist.

## Controlled test-account safety

Before any authenticated production test, a named authorized operator must create or identify accounts marked in an operator-owned register as `TEST MEMBER`, `TEST STAFF`, and `TEST ADMINISTRATOR`. The register must contain only account reference, role, owner, approved scope, creation date, cleanup date, and active/inactive state. It must not store passwords, OAuth tokens, invitation codes, real identity documents, private messages, or safety evidence.

| Account category | Permitted use | Prohibited use | Required safeguards |
| --- | --- | --- | --- |
| Test member A / B | Controlled profile, mutual interest, message, block, report, Family Circle, readiness, discovery, and recommendation checks between test accounts | Contacting real or uninvolved members; real document upload; real payment; false report against real member | Non-real clearly labeled profile data; hidden/discovery-isolated until paired test; test-case cleanup record |
| Test staff | Permission/queue/support/safety/verification/audit workflow checks against only test artifacts | Reviewing non-test member content; changing real staff; production-wide actions | Minimum permission; fresh reauthentication; audit review; immediate revoke after testing |
| Test administrator | Controlled beta invitation, pause/shutdown, access-control, and rollback verification | Using real member emails without consent; opening enrollment; modifying real operational records | Separate authorization; one-time code delivered securely; event/audit review; cleanup |

## Beta data-isolation decision

The current beta control is designed for **invited members only**. No actual beta members have been enrolled by this procedure. Production test accounts must be excluded from unnecessary real-member discovery, messaging, reports, documents, and notifications. If future invited beta members can encounter real production members, the operator must document consent, profile visibility, escalation coverage, and an explicit risk decision before enabling enrollment.

## Beta lifecycle and offboarding procedure

| Test | Expected result | Execution state |
| --- | --- | --- |
| Disabled mode | Existing application behavior; no closed-beta restriction is asserted | **NOT EXECUTED** |
| Invite-only mode | Only matching, non-expired, pending email-bound invitation can enroll a signed-in account | **NOT EXECUTED** |
| Invalid/modified/replayed code | Server denies access; no enrollment/audit secret is exposed | **AUTOMATED REGRESSION PASSED** |
| Expired/revoked/used code | Server denies access; invitation state is unavailable | **AUTOMATED REGRESSION PASSED** |
| Pause | New enrollment stops; existing enrolled members remain subject to all ordinary safety/consent rules | **NOT EXECUTED** |
| Emergency shutdown | New enrollment and beta member access stop server-side without a frontend deployment | **AUTOMATED REGRESSION PASSED** for policy behavior |
| Suspend/remove enrollment | Server removes beta access and pauses profile discovery visibility; event/audit record created | **NOT EXECUTED** |

Only authorized staff with `beta.manage`, active staff identity, and fresh reauthentication may create or revoke invitations, change beta mode, suspend/remove enrollment, or trigger emergency shutdown. The server returns the raw invitation code once to the authorized creator; the code is hashed at rest and excluded from audit metadata.

## Authenticated production smoke matrix

All rows require approved controlled accounts, named tester, release/checkpoint identifier, and a recorded outcome. Any critical failure requires incident record, fix, and retest; no result may be inferred from this plan.

| Test ID | Area | Expected result | Actual result | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| M-01 | Landing page | HTTPS public route renders without member data | Not executed | **NOT EXECUTED** | Required screenshot/release reference |
| M-02 | Signup/login/session/logout | Authorized test account can sign in/out; session exists only server-side; revocation denies protected access | Not executed | **NOT EXECUTED** | Test account and timestamp |
| M-03 | Beta invitation | Matching invite enrolls once; invalid/expired/revoked/replayed use is denied | Automated code paths pass; production execution not run | **PARTIAL** | Regression output plus future operator record |
| M-04 | Profile/privacy | Test profile saves and field privacy is enforced server-side | Not executed | **NOT EXECUTED** | Controlled account result |
| M-05 | Discovery/compatibility/recommendations | Only eligible test profiles appear; deterministic/explainable/no premium or protected-characteristic ranking | Not executed | **NOT EXECUTED** | Controlled account result |
| M-06 | Mutual interest/messaging/read state | Only controlled mutual accounts communicate; ownership, block, report, retry and unread/read behavior remain enforced | Not executed | **NOT EXECUTED** | Controlled account result |
| M-07 | Voice note | Controlled voice file preview/send/access/delete honors conversation authorization; no public media exposure | Not executed | **NOT EXECUTED** | Controlled account result without retaining media |
| M-08 | Connection readiness | Separate voice/video consent and immediate block/report/safety/hard-incompatibility revocation remain enforced; beta does not bypass | Not executed | **NOT EXECUTED** | Controlled account result |
| M-09 | Family Circle | Controlled invitation, acknowledgment, selective sharing, revocation, and participant isolation work; no participant access to messages/documents/evidence/decisions | Not executed | **NOT EXECUTED** | Controlled account result |
| M-10 | Safety Center | Test-account safety view/report workflow is scoped; no real-user report or fabricated evidence | Not executed | **NOT EXECUTED** | Controlled account result |
| M-11 | Settings/notifications | In-app preferences and self-scoped notifications work; no email/SMS/push delivery asserted | Not executed | **NOT EXECUTED** | Controlled account result |
| M-12 | Billing | Page, plan metadata, subscription/entitlement/refund controls, and provider-not-configured state load; no real charge | Not executed | **NOT EXECUTED** | Controlled account result |
| S-01 | Staff login/Operations Center | Test staff reaches only permitted queues/workflows | Not executed | **NOT EXECUTED** | Staff permission result |
| S-02 | Member lookup/support/safety/verification/audit | Least-privilege and scope are enforced; no irrelevant content is exposed | Not executed | **NOT EXECUTED** | Staff permission result |
| S-03 | Staff session revocation | Revoked test staff session is denied on subsequent privileged request | Automated regression passes; production execution not run | **PARTIAL** | Regression output plus future operator record |
| X-01 | Cross-account authorization/IDOR | Modified controlled member/message/media/invitation/ticket/case IDs receive access denial | Automated regression coverage passes; production execution not run | **PARTIAL** | Regression output plus future operator record |
| X-02 | Block/report/safety | Block/restriction/report conditions override recommendation, readiness, and communication; beta does not override | Automated service coverage passes; production execution not run | **PARTIAL** | Regression output plus future operator record |
| D-01 | Mobile | Test member login, beta access, onboarding, profile, discovery, messaging, voice, Family Circle, safety, and settings at phone viewport | Not executed | **NOT EXECUTED** | Device/browser/result |
| D-02 | Low bandwidth/offline | Slow/intermittent/offline/recovery behavior has no unsafe fallback or private cache | Not executed | **NOT EXECUTED** | Network condition/result |
| D-03 | PWA | Install, launch, authentication, update, and private API/media cache exclusion | Not executed | **NOT EXECUTED** | Device/browser/result |

## Required smoke-test evidence record

For every executed test, record: **Test ID, area, controlled account reference, expected result, actual result, pass/fail status, evidence location, UTC date/time, tester, release/checkpoint, issue reference, remediation, and retest result**. Never record a password, token, raw invitation code, private conversation, voice note, verification document, safety evidence, or payment credential.

## Failure handling and emergency beta shutdown

If a critical beta bypass, unauthorized member/staff/private-media/private-message access, safety bypass, session-revocation failure, IDOR issue, or production authentication failure is found, immediately set the current environment beta mode to `shutdown` through the authorized Operations Center control, preserve only minimum necessary incident evidence, revoke/contain affected test access, and create an operational incident. Recovery requires a verified fix, regression test, authorized review, retest, member-safe communication decision, and a deliberate mode change. No frontend deployment is required to stop new beta enrollment or beta member access.
