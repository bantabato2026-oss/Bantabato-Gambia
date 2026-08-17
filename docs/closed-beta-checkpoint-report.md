# Closed-Beta Enrollment and Authenticated Smoke-Testing Checkpoint Report

**Checkpoint date:** 17 August 2026  
**Scope:** Server-enforced closed-beta control, invitation lifecycle, controlled test-account procedures, and evidence preparation. No new product phase, real beta user, test account, external provider, payment, identity document, fabricated safety record, or production authenticated smoke execution was created.

> **Final readiness decision: NOT READY.** The closed-beta control is implemented and regression-tested, but the infrastructure, ownership, staging, monitoring, backup/restore, legal, assessment, controlled-account, and authenticated production-smoke prerequisites remain unresolved.

## What was implemented

The application now has an additive, environment-scoped beta control with `disabled`, `invite_only`, `paused`, and `shutdown` modes. It defaults to disabled. Invite-only enrollment requires a signed-in account with the matching invited email and a valid one-time code. Codes are random, returned only once to the authorized staff creator, hashed at rest, expiration-aware, revocable, and absent from operational audit metadata.

Beta enrollment has explicit `enrolled`, `suspended`, and `removed` states. Staff suspension/removal pauses member discovery visibility and records metadata-only beta/audit events. Pause stops new enrollment while existing enrolled members remain subject to ordinary controls. Emergency shutdown blocks both enrollment and beta member access server-side without requiring a frontend release.

The Operations Center now has a permission-aware **Closed beta** workspace. It exposes only authorized beta metadata and supports environment mode changes, one-time invitation creation, invitation revocation, and enrollment suspension/removal. Only active permissioned staff with `beta.manage` and fresh reauthentication can make state-changing beta actions. Ordinary members and unscoped administrators are denied the new operations endpoints.

## Server enforcement and preservation of existing protections

`requireBetaMemberAccess` now guards profile/dashboard entry and all profile-derived member APIs. A shared beta procedure also guards residual self-scoped billing metadata, safety center/appeal, and notification procedures. This means client route changes, local storage/cookie manipulation, direct tRPC invocation, and direct URLs cannot confer member beta access. Authentication itself remains available so an invitee can redeem a server-validated invitation; staff and Family Circle participant routes retain their own existing authorization boundaries.

Beta status grants no exception from verification, safety, blocks, reports, consent, Family Circle permissions, connection readiness, incompatibility, staff restrictions, billing policy, or private-media authorization.

## What was already present and verified

The existing project already had server-derived authentication, granular staff authorization, request-bound staff-session revocation, scoped operations, private media signing, mutual-match messaging controls, Family Circle isolation, safety/integrity precedence, PWA private-cache exclusion, error minimization, rate controls, and broad authorization/IDOR regressions. Those controls were preserved; no existing test was removed.

## What was tested

New automated beta tests cover disabled/invite-only/paused/shutdown policy, invalid/modified code, expiry, revocation, already-used code, replay, email mismatch, direct unenrolled member denial, emergency shutdown denial, metadata-only successful enrollment handling, and Operations Center denial for ordinary/unscoped administrative callers.

The beta acceptance page and staff control workspace were visually reviewed on desktop. The beta acceptance page was also reviewed at a 375×812 phone viewport. These are local visual checks only, not authenticated production smoke tests.

## Test results

| Validation | Result |
| --- | --- |
| Previous baseline | 178 tests across 35 files |
| New regression tests | 9 tests across 2 new beta-focused files; existing authorization assertions extended |
| Final regression suite | **187 tests across 37 files passed; 0 failures** |
| TypeScript | `pnpm check` passed |
| Production build | `pnpm build` passed |
| Dependency audit | `pnpm audit --prod` reported **No known vulnerabilities found** |
| Beta focused tests | 11 beta/authorization assertions passed in the focused run |

## Final beta matrix

| Capability | Status | Evidence | Blocker |
| --- | --- | --- | --- |
| Beta enrollment | **READY WITH CONDITIONS** | Server control, email-bound acceptance, enrollment table, router guard, tests | Runtime remains disabled by default; no real enrollment executed |
| Invitation | **READY WITH CONDITIONS** | Random one-time code, hash-at-rest, bound email, secure creator-only return | No authorized operator or real invitee assigned |
| Invitation expiry | **READY WITH CONDITIONS** | Expiry checks, explicit expired state, focused regression | No production invite lifecycle executed |
| Invitation revocation | **READY WITH CONDITIONS** | Staff `beta.manage` revoke control and regression rejection | No production revoke exercised |
| Server enforcement | **READY WITH CONDITIONS** | Profile/dashboard/member API guard and direct-service denial regression | No authenticated production test account |
| Admin controls | **READY WITH CONDITIONS** | Permission-aware staff page/API, fresh reauthentication, authorization regression | No named operational owner |
| Audit trail | **READY WITH CONDITIONS** | Metadata-only beta events and audit logs | No production audit review executed |
| Beta pause | **READY WITH CONDITIONS** | `paused` mode blocks enrollment policy | No production control change executed |
| Emergency shutdown | **READY WITH CONDITIONS** | `shutdown` mode blocks enrollment/member access, audit action, policy regression | No operator runbook exercise |
| Member smoke test | **NOT EXECUTED** | Controlled procedure prepared | No authorized controlled production test accounts |
| Staff smoke test | **NOT EXECUTED** | Controlled procedure prepared | No authorized controlled staff/admin test account |
| Authorization | **READY WITH CONDITIONS** | Existing and expanded automated denial coverage | Production cross-account execution absent |
| IDOR | **READY WITH CONDITIONS** | Existing object-access coverage plus invitation tamper/replay/email tests | Production controlled-ID execution absent |
| Session revocation | **READY WITH CONDITIONS** | Existing request-bound staff session revocation regression | Production member/staff revoke smoke absent |
| Messaging | **READY WITH CONDITIONS** | Existing mutual, ownership, block/report, media tests preserved | Controlled production execution absent |
| Family Circle | **READY WITH CONDITIONS** | Existing invitation/permission/isolation tests preserved | Controlled production execution absent |
| Safety | **READY WITH CONDITIONS** | Existing safety/integrity override tests; beta does not change their services | Controlled production execution absent |
| Billing | **READY WITH CONDITIONS** | Provider-independent controls remain; beta guard applies to metadata | Payment provider not configured; no charge attempted |
| Notifications | **READY WITH CONDITIONS** | Existing in-app/privacy tests; beta guard applies | External provider not configured |
| Mobile | **READY WITH CONDITIONS** | Beta invitation screen visually checked at phone viewport | Authenticated production mobile smoke absent |
| PWA | **READY WITH CONDITIONS** | Existing PWA privacy/cache tests preserved | Production install/update smoke absent |
| Low bandwidth | **NOT EXECUTED** | Safe procedure prepared | No controlled network-condition run |

## Final smoke-test matrix

| Test | Expected | Actual | Status | Evidence |
| --- | --- | --- | --- | --- |
| Public landing | HTTPS route renders | Not executed in this checkpoint | **NOT EXECUTED** | Existing production verification is outside this beta test record |
| Invitation redemption | Matching invite enrolls once; invalid/revoked/expired/replay denied | Automated service regression passed; no production account used | **PARTIAL** | `betaService.test.ts` |
| Member workflow | Authenticated profile through account lifecycle | Not executed | **NOT EXECUTED** | Controlled procedure only |
| Staff workflow | Staff login through Operations Center/session revocation | Existing automated authorization/session tests pass; no production staff account used | **PARTIAL** | Existing staff authorization/session tests |
| Billing | Metadata/entitlement/provider state only; no charge | Not executed | **NOT EXECUTED** | Controlled procedure only |
| Notifications | In-app only; no external delivery claim | Not executed | **NOT EXECUTED** | Controlled procedure only |
| Family Circle | Invite, sharing, revocation, isolation | Not executed | **NOT EXECUTED** | Controlled procedure only |
| Messaging/voice | Controlled-only ownership/access/block/report | Not executed | **NOT EXECUTED** | Controlled procedure only |
| Mobile/PWA/low bandwidth | Safe beta/mobile/offline behavior | Local invitation UI visual checks only | **PARTIAL** | Desktop/mobile screenshots; no authenticated production run |

## Final security matrix

| Control | Test | Result | Status |
| --- | --- | --- | --- |
| Authentication | Existing OAuth/session checks preserved | Automated tests pass; production smoke absent | **READY WITH CONDITIONS** |
| Authorization | Staff/admin beta endpoints denied to member/unscoped admin | Passed | **READY WITH CONDITIONS** |
| IDOR | Invitation tamper, email mismatch, replay, and existing cross-object regressions | Passed | **READY WITH CONDITIONS** |
| Session revocation | Existing request-bound staff-revocation regression | Passed | **READY WITH CONDITIONS** |
| Private media | Existing signed-link/ownership/cache regressions | Passed previously and suite remains green | **READY WITH CONDITIONS** |
| Private messages | Existing participant/ownership/block regressions | Passed previously and suite remains green | **READY WITH CONDITIONS** |
| Family Circle | Existing participant-isolation regressions | Passed previously and suite remains green | **READY WITH CONDITIONS** |
| Staff permissions | New beta endpoint denial regression | Passed | **READY WITH CONDITIONS** |
| Safety restrictions | Existing safety/integrity/revocation regressions; beta does not alter those paths | Suite green | **READY WITH CONDITIONS** |
| Beta enforcement | Disabled/invite-only/paused/shutdown and direct unenrolled denial | Passed | **READY WITH CONDITIONS** |

## Production smoke-test status

**NOT EXECUTED.** The required authenticated production test accounts were not created or identified, and no real member, document, payment, notification delivery, safety case, or provider was used. The plan explicitly prevents inadvertent contact with uninvolved members, real charges, fake safety reports, sensitive uploads, and misleading production records.

## Remaining blockers and operational risks

The application still cannot be declared ready for internal testing or closed beta because no actual primary/backup operational owner, staging environment, monitoring/alerts, verified backup/restore, authorized controlled production test account, executed authenticated smoke test, legal review, or independent assessment is evidenced. Beta mode remains disabled until an authorized operator deliberately changes it. The server-enforced beta control is a gate, not proof of real-world safety or operational capacity.

## Final readiness decision

**NOT READY.** This checkpoint improves the technical beta gate and its evidence but does not satisfy the unresolved operational launch requirements.

## References

- [Closed-beta smoke-test procedure](./closed-beta-smoke-test-plan.md)
- [Infrastructure checkpoint report](./infrastructure-checkpoint-final-report.md)
- [Phase 15 operations report](./phase15-final-report.md)
