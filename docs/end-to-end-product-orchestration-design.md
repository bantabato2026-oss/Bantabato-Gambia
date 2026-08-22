# BANTABATO — End-to-End Product Orchestration Design

## Deterministic orchestration model

The automated pass composes real policy gates and existing service-flow guarantees into fictional-only journeys. It does not create a database row, OAuth session, browser account, provider delivery, payment, document, or voice recording. A journey becomes **eligible** only when every required policy gate is true; any revocation signal is represented as a real policy input that makes dependent access false.

| Journey | Cross-module transition matrix | Automated assertion |
| --- | --- | --- |
| New member to discovery | Core profile → five approved active profile photos → active visibility → optional verification state → eligibility → discovery | Incomplete, review, paused, hidden, blocked, suspended, deleted, or photo-withdrawn paths never become discovery eligible. |
| Discovery to communication | Eligible profile → policy-safe discovery → deterministic compatibility → mutual interest → active conversation | No AI, trust score, popularity, engagement, or Premium value participates; a non-mutual/restricted/blocked conversation cannot send. |
| Communication to readiness | Mutual conversation → reciprocal text/voice signals → separate voice/video consent → readiness result | A block, report/restriction, suspension, hard incompatibility, integrity hold, or consent withdrawal sets readiness to restricted/revoked and removes sendability where appropriate. |
| Family Circle | Member → Parent/Wali invite → accept → scoped permission → selective share → feedback → revoke | Permission loss removes the share; family roles remain unable to access messages, documents, readiness, account control, safety data, or relationship decisions. |
| Verification and editorial | Unverified → submitted/reviewed → approved or rejected/resubmission; success declaration → fresh auth → consent → editorial → independent approval → published → withdrawal | Verification follows protected review; public story publication needs consent plus independent approval and withdrawal removes public eligibility. |
| Safety, billing, notifications | Report/restriction → visibility/conversation/readiness/recommendation effects; plan/subscription/entitlement lifecycle; trusted module event → safe in-app/delivery state | Safety changes do not restore unrelated privileges; Premium cannot override safety/matching/privacy; notification copy is idempotent and content-minimized. |
| Country and staff operations | Gambia/Senegal/diaspora locale/timezone/location/preferences; scoped staff action → independent approval → safe audit → member-safe state | Country remains neutral; staff roles are least-privilege and a proposer cannot decide their own protected request. |

## Browser-level test preparation matrix

| Test-only persona | Required initial state | Controlled browser scenarios | Execution status |
| --- | --- | --- | --- |
| Member A | Core profile and five approved photos | Onboarding, discovery, interest, message/retry, readiness, billing boundary, notifications | **BLOCKED — EXTERNAL ACTION REQUIRED** |
| Member B | Compatible active counterpart | Mutual interest, communication, consent/revocation, block/report effect | **BLOCKED — EXTERNAL ACTION REQUIRED** |
| Parent | Accepted Family Circle participant | Permissioned share, acknowledgement, feedback, revocation | **BLOCKED — EXTERNAL ACTION REQUIRED** |
| Wali/Guardian | Accepted then verification-controlled participant | Invite acceptance, scoped identity state, selective share | **BLOCKED — EXTERNAL ACTION REQUIRED** |
| Verification reviewer | Scoped staff access | Queue, safe document review, decision/resubmission | **BLOCKED — EXTERNAL ACTION REQUIRED** |
| Trust & Safety reviewer | Scoped staff access | Restriction proposal, scope/revocation, appeal boundary | **BLOCKED — EXTERNAL ACTION REQUIRED** |
| Independent approver | Fresh scoped session | No-self approval, decision/expiry, audit/minimized state | **BLOCKED — EXTERNAL ACTION REQUIRED** |
| Editorial reviewer | Scoped editorial access | Consent/recent sign-in/publication/withdrawal path | **BLOCKED — EXTERNAL ACTION REQUIRED** |
| Support operator | Support-only scope | Ticket lifecycle without private safety/billing authority | **BLOCKED — EXTERNAL ACTION REQUIRED** |
| Finance operator | Finance-only scope | Provider-neutral refund/reconciliation/entitlement boundary | **BLOCKED — EXTERNAL ACTION REQUIRED** |

All personas are identifiers for a future isolated fictional-account environment. They are not accounts in the current environment.
