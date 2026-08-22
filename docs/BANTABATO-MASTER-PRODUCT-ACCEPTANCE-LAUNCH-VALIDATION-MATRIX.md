# BANTABATO — MASTER PRODUCT ACCEPTANCE & LAUNCH VALIDATION MATRIX

## Executive summary

**Authoritative status date:** 22 August 2026. Bantabato is **frozen for validation**. Internal automated quality is verified: **259 tests across 59 files**, TypeScript, production build, and production dependency audit passed. Read-only desktop and mobile reviews were completed. The product has documented browser, accessibility, media, security, recovery, and multi-account validation packages, but those workflows have **not** been executed because an isolated authorized fictional-account environment is unavailable.

> This document is the acceptance authority going forward. A design, source contract, or workflow specification is never treated as execution evidence. Browser, provider, independent-security, accessibility-assistive-technology, infrastructure, backup/restore, owner-signoff, and legal outcomes stay blocked until the required actual evidence exists.

## Frozen product baseline

| Baseline item | Verified result | Evidence |
| --- | --- | --- |
| Automated quality | PASS — 259 tests across 59 files | `product_orchestration_final_validation.txt`; `browser_validation_package_final_validation.txt` |
| TypeScript | PASS | `pnpm check` result in final validation logs |
| Production build | PASS | `pnpm build` result in final validation logs |
| Dependency audit | PASS — no known vulnerabilities found | `pnpm audit --prod --audit-level=high` result in final validation logs |
| Desktop review | PASS — read-only presentation review | `controlled-browser-validation-freeze-visual-review.md` |
| Mobile review | PASS — read-only presentation review | `controlled-browser-validation-freeze-visual-review.md` |
| Product feature freeze | PASS — no freeze-blocking defect found | `controlled-browser-validation-package-final-freeze-report.md` |
| Browser execution | BLOCKED — EXTERNAL ACTION REQUIRED | `controlled-browser-validation-package.md` |
| Launch | BLOCKED | Objective launch gates below |

## Status and evidence rules

| Status | Meaning |
| --- | --- |
| PASS | Required evidence was actually obtained and reviewed. |
| FAIL | A required test was actually run and did not meet its pass condition. |
| BLOCKED | Execution cannot begin without an external prerequisite, authorization, account, provider, or specialist. |
| NOT STARTED | The test is not yet prepared or run. |
| NOT APPLICABLE | The capability is intentionally outside the product boundary. |

| Evidence type | Acceptable when |
| --- | --- |
| Automated result | Named suite and passing result prove the stated deterministic/server/client contract. |
| Browser result | An authorized fictional account completed the procedure and a pass/fail record exists. |
| Screenshot or recording | Captured against the stated route/state; visual evidence alone never proves protected mutation. |
| Audit event or database assertion | Captured from authorized isolated testing and privacy-minimized. |
| Accessibility result | Actual keyboard/assistive-technology procedure with result, not source inspection alone. |
| Security assessment | Independent completed assessment with findings disposition. |
| Provider, backup, monitoring, owner evidence | Actual sandbox/restore/alert/sign-off evidence from an authorized environment. |

## Master acceptance matrix

**Matrix convention:** Every listed Test ID adopts the row’s preconditions, procedure, expected result, boundary, evidence, role, status, blocking condition, and notes. IDs are grouped only where the same atomic acceptance procedure applies.

### A. Public website

| Capability | Area | Requirement and Test ID | Type | Preconditions and procedure | Expected result and security/privacy boundary | Evidence required | Responsible role | Status | Blocking condition | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Home; About; How It Works | Public | A-001 Home; A-002 About; A-003 How It Works | Read-only visual | Open public entry and informational sections at desktop/mobile | Clear marriage-first information; no private member data or provider promise | Desktop/mobile screenshots | Founder/product | PASS | — | Public visual review completed. |
| Membership; Success Stories; FAQ; Contact/support | Public | A-004 Membership; A-005 Success Stories; A-006 FAQ; A-007 Contact/support | Visual/content | Open pages/entry points | Truthful membership and consent-scoped-story boundary; support channel does not expose private case data | Visual review; source contracts | Founder/product; Support | PASS | — | Contact operations itself remains external. |
| Privacy/legal; Registration | Public | A-008 Privacy/legal entry points; A-009 Registration entry | Visual/security | Open public links and registration CTA | Legal entry points and approved sign-in entry are present; no client-built auth URL | Screenshot; auth contract | Founder/product; Security | PASS | — | Browser account creation remains blocked. |
| Mobile/nav/states/brand | Public | A-010 Mobile public experience; A-011 Responsive navigation; A-012 Loading/error/empty states; A-013 Branding/logo | Visual | Read-only desktop/mobile routes | Branded responsive navigation and clear state surfaces; no overflow observed | Freeze visual review | Founder/product | PASS | — | 1280×720 and 375×812 reviewed. |
| Accessibility/motion/data mode | Public | A-014 Accessibility; A-015 Reduced-motion behavior; A-016 Low-bandwidth behavior | Mixed | Run automated contracts; execute assistive-tech browser procedure when available | Native controls/state semantics; nonessential motion/data effects suppressed | Automated contracts; browser result | Accessibility tester | BLOCKED | Isolated browser/assistive-tech environment | Automated/source evidence passes; manual execution remains blocked. |

### B. Registration and onboarding

| Capability | Area | Requirement and Test ID | Type | Preconditions and procedure | Expected result and security/privacy boundary | Evidence required | Responsible role | Status | Blocking condition | Notes |
| Registration/account/welcome | Onboarding | B-001 Registration; B-002 Account creation; B-003 Welcome experience | Browser | Member A fictional account begins approved sign-in flow | Server-authenticated account and welcome state; no real user or client-side auth bypass | Browser record; safe audit | Founder/product; Technical operations | BLOCKED | Authorized fictional account environment | Entry UI/contract exists. |
| Voice-first/progressive/form flow | Onboarding | B-004 Voice-first onboarding; B-005 Progressive onboarding; B-006 Form validation | Mixed | Test progressive steps, required errors, focus recovery | Completion is required before eligibility; no forced voice action or private field disclosure | Automated contract; browser result | Founder/product; Accessibility tester | BLOCKED | Browser account | Voice-first is a prepared workflow only. |
| Draft/recovery/offline | Onboarding | B-007 Draft preservation; B-008 Recovery after interruption; B-009 Offline-safe submission | Mixed | Interrupt draft/submission under controlled network | Safe local draft/retry; no duplicate profile mutation | Source/automated evidence; browser result | Technical operations | BLOCKED | Controlled browser/network harness | Browser execution required. |
| Completion/photos/privacy | Onboarding | B-010 Profile completion; B-011 Five-photo requirement; B-012 Privacy controls | Automated/browser | Apply incomplete/five-photo/privacy states | Incomplete or restricted profile stays ineligible; private-by-default choices persist | Eligibility/photo tests; browser result | Founder/product | BLOCKED | Browser account for end-to-end | Deterministic policy tests PASS. |
| Life-intention and country choices | Onboarding | B-013 Married-member flow; B-014 Children/preferences; B-015 Marriage-intention flow; B-016 Country preferences; B-017 Diaspora preference | Automated/browser | Exercise supported profile fields with fictional data | Values affect only stated deterministic policy; no stereotype/rank/immigration claim | Domain tests; browser result | Founder/product; Country operator | BLOCKED | Browser account | Policy automation PASS. |

### C. Member profile

| Capability | Area | Requirement and Test ID | Type | Preconditions and procedure | Expected result and security/privacy boundary | Evidence required | Responsible role | Status | Blocking condition | Notes |
| Create/edit/completion | Profile | C-001 Profile creation; C-002 Profile editing; C-009 Profile completion state | Browser | Member A edits own profile | Scoped own-profile update and accurate eligibility state | Browser result; state assertion | Founder/product | BLOCKED | Browser account | UI/read recovery reviewed. |
| Photos/capacity/privacy | Profile | C-003 Five approved photos; C-004 Photo replacement; C-005 Photo deletion; C-006 Photo capacity enforcement; C-007 Private photo handling | Automated/browser | Use fictional media and concurrent/retry scenarios | Exactly five active approved profile photos; private storage/signed access; no duplicate media | Photo/concurrency tests; browser/media record | Technical operations; Verification | BLOCKED | Isolated private media and browser account | Deterministic policy/serialization contracts PASS. |
| Visibility/life/international | Profile | C-008 Visibility controls; C-010 Married status; C-011 Children preferences; C-012 International settings | Automated/browser | Change own controls/fields | Visibility and supported preferences enforce deterministic policy; no private location leak | Domain tests; browser result | Founder/product; Country operator | BLOCKED | Browser account | Policy evidence PASS. |

### D. Verification

| Capability | Area | Requirement and Test ID | Type | Preconditions and procedure | Expected result and security/privacy boundary | Evidence required | Responsible role | Status | Blocking condition | Notes |
| Submission/private upload/pending | Verification | D-001 Submission; D-002 Private document upload; D-003 Pending review | Browser/security | Member A submits authorized fictional document | Private document storage/access; pending is not a badge | Browser/media audit; reviewer check | Verification Owner — UNASSIGNED | BLOCKED | Owner, fictional document/account | UI/manual-review boundary reviewed. |
| Decision/resubmission/permissions | Verification | D-004 Approval; D-005 Rejection; D-006 Resubmission; D-007 Reviewer permissions | Service/browser | Reviewer applies valid outcome; member resubmits | Server scope and state transitions enforce manual review | Operations workflow tests; browser result | Verification Owner — UNASSIGNED | BLOCKED | Reviewer ownership/account | Deterministic flow PASS. |
| Privacy/eligibility/audit | Verification | D-008 Private document access; D-009 Verification state affecting eligibility; D-010 Audit evidence | Mixed | Attempt unauthorized access and eligibility transition | Documents stay private; approved/revoked state changes stated eligibility only; audit is minimized | Security/state test; browser audit | Security Owner; Verification Owner — UNASSIGNED | BLOCKED | Isolated document workflow | Automated policy evidence PASS. |

### E. Discovery and compatibility

| Capability | Area | Requirement and Test ID | Type | Preconditions and procedure | Expected result and security/privacy boundary | Evidence required | Responsible role | Status | Blocking condition | Notes |
| Eligibility/discovery/profile/explanation | Discovery | E-001 Eligibility; E-002 Discovery; E-003 Profile viewing; E-004 Compatibility explanation | Automated/browser | Use two eligible fictional profiles; open discovery/explanation | Eligible-only, privacy-safe, deterministic explanation; no opaque score | Discovery/compatibility tests; browser result | Founder/product | BLOCKED | Two browser accounts | Deterministic tests PASS. |
| Deterministic recommendation lifecycle | Discovery | E-005 Deterministic recommendation; E-006 Recommendation withdrawal; E-007 Recommendation freshness | Service/browser | Generate/withdraw/refresh recommendation | No AI, Trust Score, popularity, engagement, or Premium match advantage | Recommendation tests; browser state | Founder/product | BLOCKED | Two browser accounts | Policy/service evidence PASS. |
| Exclusion consistency | Discovery | E-008 Block exclusion; E-009 Hidden exclusion; E-010 Restricted exclusion; E-011 Hard incompatibility exclusion; E-012 Integrity-hold exclusion | Automated/browser | Apply each exclusion state | Candidate is excluded under the correct dependent policy | Orchestration/state tests; browser state | Trust & Safety Owner — UNASSIGNED | BLOCKED | Scoped fictional accounts | Deterministic evidence PASS. |

### F. Mutual interest and communication

| Capability | Area | Requirement and Test ID | Type | Preconditions and procedure | Expected result and security/privacy boundary | Evidence required | Responsible role | Status | Blocking condition | Notes |
| Interest/conversation/text/read | Communication | F-001 Interest; F-002 Mutual interest; F-003 Conversation unlock; F-004 Text message; F-005 Read/unread | Service/browser | Member A/B create mutual interest then communicate | Mutual state is required; participant-only thread/read state | Messaging flow tests; browser result | Founder/product | BLOCKED | Two browser accounts | Deterministic flow PASS. |
| Text retry/duplicate/conflict | Communication | F-006 Message retry; F-007 Duplicate prevention; F-020 Network interruption; F-021 Concurrent duplicate request; F-022 Request-key conflict | Automated/browser | Same-key retry/concurrent request/conflicting reuse | One logical message; conflict rejects safely; content-free audit | Messaging concurrency tests; browser network capture | Technical operations | BLOCKED | Browser/network harness | Automated concurrency PASS. |
| Voice lifecycle/media | Communication | F-008 Voice recording; F-009 Voice preview; F-010 Voice playback; F-011 Voice upload; F-012 Voice retry; F-013 Microphone permission recovery; F-014 Delete; F-019 Signed media | Mixed | Record fictional voice, deny mic, retry/upload/play/delete | Private signed media, ownership, retry idempotency, no public URL/call | Contracts; browser/media result | Accessibility tester; Technical operations | BLOCKED | Microphone/private media/browser | UI/source/automation exists. |
| Safety communication controls | Communication | F-015 Block; F-016 Report; F-017 Mute/pause; F-018 Restriction | Service/browser | Apply each relevant state to active conversation | Sending/viewing follow server policy; report evidence remains private | Policy/service tests; browser state | Trust & Safety Owner — UNASSIGNED | BLOCKED | Scoped fictional accounts | Existing service/policy evidence PASS. |

### G. Connection readiness

| Capability | Area | Requirement and Test ID | Type | Preconditions and procedure | Expected result and security/privacy boundary | Evidence required | Responsible role | Status | Blocking condition | Notes |
| Readiness and consent | Readiness | G-001 Eligibility; G-002 Voice consent; G-003 Video consent; G-004 Readiness activation | Automated/browser | Build reciprocal evidence and choose separate consents | Participation, safety, compatibility, verification, and consent gate readiness; no live call | Readiness tests; browser record | Founder/product | BLOCKED | Two browser accounts | Policy automation PASS. |
| Revocation | Readiness | G-005 Block revocation; G-006 Report revocation; G-007 Restriction revocation; G-008 Suspension revocation; G-009 Hard incompatibility revocation; G-010 Integrity-hold revocation; G-011 Consent withdrawal | Automated/browser | Apply each signal after readiness candidate state | Dependent readiness is unavailable immediately; scope distinction remains accurate | Orchestration/readiness tests; browser state | Trust & Safety Owner — UNASSIGNED | BLOCKED | Scoped fictional accounts | Automated evidence PASS. |
| Authorized restoration | Readiness | G-012 Restoration after authorized resolution | Service/browser | Resolve only the applicable scoped action | Only entitled capability is restored; unrelated privilege remains unchanged | Service audit; browser state | Trust & Safety Owner — UNASSIGNED | BLOCKED | Owner/account | Requires actual controlled state evidence. |

### H. Family Circle

| Capability | Area | Requirement and Test ID | Type | Preconditions and procedure | Expected result and security/privacy boundary | Evidence required | Responsible role | Status | Blocking condition | Notes |
| Invite/accept/expiry/revocation | Family Circle | H-001 Parent invitation; H-002 Wali/Guardian invitation; H-003 Acceptance; H-004 Expiry; H-005 Revocation | Service/browser | Invite Parent/Wali, accept/expire/revoke code | Hashed, time-bound participant link; no duplicate/reused link | Family flow tests; browser state/audit | Founder/product; Support | BLOCKED | Multi-account environment | Deterministic flows PASS. |
| Permissions/sharing/feedback | Family Circle | H-006 Per-person permissions; H-007 Selective sharing; H-008 Acknowledgement; H-009 Advisory feedback; H-010 Wali verification state; H-011 Permission recovery | Service/browser | Grant/revoke scoped share and feedback | Participant sees only granted data; no messages/docs/accounts/call consent/safety/decisions | Family tests; browser state | Trust & Safety Owner — UNASSIGNED | BLOCKED | Multi-account environment | Service evidence PASS. |

### I. Safety and trust

| Capability | Area | Requirement and Test ID | Type | Preconditions and procedure | Expected result and security/privacy boundary | Evidence required | Responsible role | Status | Blocking condition | Notes |
| Report/block/case/evidence/notes/escalation | Safety | I-001 Report; I-002 Block; I-003 Restriction; I-004 Safety case; I-005 Evidence reference; I-006 Staff notes; I-007 Escalation | Service/browser | Member reports/blocks; scoped staff creates/reviews case | Privacy-minimized evidence and restricted staff scope; no private disclosure | Integrity/operations tests; browser audit | Trust & Safety Owner — UNASSIGNED | BLOCKED | Owner and scoped accounts | Deterministic boundary evidence PASS. |
| Decision/approval/appeal/lifecycle | Safety | I-008 Decision; I-009 Four-eyes approval; I-010 Appeal; I-011 Expiration; I-012 Reversal; I-013 Audit trail; I-014 Privacy-safe notification | Service/browser | Proposal → independent decision → expiry/reversal/appeal | No automatic permanent sanction/Trust Score/protected-characteristic or Premium advantage; safe notice | Approval/integrity tests; browser audit | Trust & Safety Owner — UNASSIGNED; Independent approver | BLOCKED | Owners and accounts | Server guards PASS; workflow execution blocked. |

### J. Operations Center

| Capability | Area | Requirement and Test ID | Type | Preconditions and procedure | Expected result and security/privacy boundary | Evidence required | Responsible role | Status | Blocking condition | Notes |
| Identity/permissions/invitation/session | Operations | J-001 Staff identity; J-002 Least-privilege permissions; J-003 Staff invitation; J-004 Session revocation | Automated/browser | Attempt valid and invalid role/invite/session paths | Server rejects unavailable/expired/revoked scope; no role escalation | Admin authorization/session tests; browser log | Technical operations | BLOCKED | Isolated staff identities | Automated guards PASS. |
| Member/support/incident/approval/audit/config | Operations | J-005 Member lookup; J-006 Support ticket; J-007 Incident; J-008 Approval; J-009 Audit history; J-010 Configuration metadata | Service/browser | Use role-scoped operations modules | Least privilege, safe audit, no secret/private-message exposure | Service tests; browser audit | Support; Finance; Technical operations | BLOCKED | Scoped accounts/owners | UI/state surfaces reviewed. |
| Navigation/states | Operations | J-011 Permission-aware navigation; J-012 Staff state surfaces | Visual/automated | Open scoped/unscoped staff routes | Shared loading/error/empty/retry and permission language; UI does not replace server checks | Admin contracts; screenshot | Technical operations; Accessibility tester | PASS | — | Read-only admin review complete. |

### K. Editorial and success stories

| Capability | Area | Requirement and Test ID | Type | Preconditions and procedure | Expected result and security/privacy boundary | Evidence required | Responsible role | Status | Blocking condition | Notes |
| Submission/consent/authentication | Editorial | K-001 Submission; K-002 Recent sign-in requirement; K-003 Consent; K-004 Reauthentication | Automated/browser | Member submits voluntary story with fresh sign-in | No public processing without consent/fresh auth | Success-story contracts; browser record | Editorial Owner — UNASSIGNED | BLOCKED | Owner/account | Policy/contracts PASS. |
| Screen/publication/withdrawal/privacy | Editorial | K-005 Screening; K-006 Presentation copy; K-007 Independent approval; K-008 Publication; K-009 Withdrawal; K-010 Immediate public removal; K-011 Private source protection | Service/browser | Screen copy, independent approval, publish then withdraw | Only consented screened text; withdrawal removes public result; source/media private | Public presentation contract; browser audit | Editorial Owner — UNASSIGNED; Independent approver | BLOCKED | Owners/accounts | Automated projection PASS. |

### L. Notifications

| Capability | Area | Requirement and Test ID | Type | Preconditions and procedure | Expected result and security/privacy boundary | Evidence required | Responsible role | Status | Blocking condition | Notes |
| In-app/prefs/quiet/idempotency/template | Notifications | L-001 In-app notification; L-002 Preferences; L-003 Quiet hours; L-004 Idempotency; L-005 Template version | Service/browser | Trigger supported synthetic event and preference state | Correct recipient, safe fixed copy, preference/quiet-hours/idempotency behavior | Notification tests; browser record | Technical operations; Support | BLOCKED | Browser accounts for UI | Service tests PASS. |
| Delivery/retry/expiry/privacy | Notifications | L-006 Delivery record; L-007 Queue state; L-008 Retry; L-009 Expiry; L-010 Privacy boundary | Service/provider | Mock delivery failure/expiry; later run sandbox where approved | Bounded retry/expiry and no private content in payload | Notification flow tests; provider sandbox record | Provider owner — UNASSIGNED | BLOCKED | Provider sandbox/owner | Mocked automation PASS; external delivery blocked. |

### M. Billing

| Capability | Area | Requirement and Test ID | Type | Preconditions and procedure | Expected result and security/privacy boundary | Evidence required | Responsible role | Status | Blocking condition | Notes |
| Plan/price/subscription/transaction/refund | Billing | M-001 Plans; M-002 Versioned pricing; M-003 Subscription; M-004 Transaction state; M-005 Refund state | Automated/browser | Exercise provider-neutral internal state transitions | Valid state transitions, no credential exposure/real payment claim | Billing tests; browser state | Finance; Provider owner — UNASSIGNED | BLOCKED | Browser account/provider sandbox where relevant | Internal state tests PASS. |
| Entitlement/expiry/cancel/reconcile/privacy/status | Billing | M-006 Entitlement; M-007 Expiry; M-008 Cancellation; M-009 Reconciliation; M-010 Billing privacy; M-011 Provider-status transparency | Automated/browser | Apply active/cancelled/expired/reconciliation/config states | Premium cannot bypass protected controls; transparent NOT CONFIGURED state | Billing/payment-policy tests; screenshot | Finance; Technical operations | BLOCKED | Browser account for UI; provider sandbox for external state | Provider transparency UI PASS. |

### N. Country and international

| Capability | Area | Requirement and Test ID | Type | Preconditions and procedure | Expected result and security/privacy boundary | Evidence required | Responsible role | Status | Blocking condition | Notes |
| Country/locale/currency/timezone | International | N-001 The Gambia; N-002 Senegal; N-003 Diaspora; N-004 Locale; N-005 Currency; N-006 Timezone | Automated/browser | Apply supported country and locale metadata | Neutral availability and valid locale/timezone/currency metadata; no legal/exchange-rate claim | International tests; browser record | Country operator; Founder/product | BLOCKED | Country operator/account | Policy automation PASS. |
| Location/distance/discovery/privacy | International | N-007 Coarse location; N-008 Long-distance preference; N-009 Cross-border discovery; N-010 Location privacy | Automated/browser | Change permitted preference/visibility | Coarse/private display and deterministic filtering only | International/orchestration tests; browser state | Country operator | BLOCKED | Browser accounts | Policy automation PASS. |

### O. PWA and mobile

| Capability | Area | Requirement and Test ID | Type | Preconditions and procedure | Expected result and security/privacy boundary | Evidence required | Responsible role | Status | Blocking condition | Notes |
| Install/nav/responsive/touch | Mobile | O-001 Installability; O-002 Mobile navigation; O-003 Responsive layouts; O-009 Keyboard behavior; O-010 Touch targets | Visual/browser | Review supported mobile routes/device install path | Responsive navigation/controls without overflow; PWA scope stays static/safe | Mobile contracts; screenshots; device result | Accessibility tester; Technical operations | BLOCKED | Actual device/PWA harness | Read-only mobile visual PASS. |
| Data/recovery/media/motion | Mobile | O-004 Low-bandwidth mode; O-005 Offline-safe behavior; O-006 Recovery; O-007 Photo upload retry; O-008 Voice-note states; O-011 Reduced motion | Mixed | Toggle preference/throttle network/run media states | Safe recovery, reduced nonessential motion, no duplicate media | Source contracts; browser/device evidence | Accessibility tester | BLOCKED | Device/network/microphone harness | Automated/source evidence PASS. |

### P. Accessibility

| Capability | Area | Requirement and Test ID | Type | Preconditions and procedure | Expected result and security/privacy boundary | Evidence required | Responsible role | Status | Blocking condition | Notes |
| Automated foundation | Accessibility | P-001 Keyboard focus; P-002 Labels; P-003 Form errors; P-004 Loading announcements; P-005 Error announcements; P-006 Dialog focus; P-007 Navigation; P-008 Progress indicators; P-009 Touch targets; P-010 Reduced motion | Automated/manual | Run source/UI contracts; then actual keyboard procedure | Focus/labels/state semantics and motion policy remain present | Contracts; browser accessibility result | Accessibility tester — UNASSIGNED | BLOCKED | Authorized browser/assistive-tech test | Automated contracts PASS; actual acceptance blocked. |
| Required manual flows | Accessibility | P-011 Screen reader; P-012 Keyboard-only authenticated workflows; P-013 Microphone permission; P-014 Voice recording; P-015 Voice playback; P-016 Message retry; P-017 Multi-account workflow | Manual browser | Execute prepared fictional workflows | Actual assistive-technology and device interaction meets package pass criteria | Screen-reader/browser recording | Accessibility tester — UNASSIGNED | BLOCKED | Accounts/device/assistive-tech harness | No execution claimed. |

### Q. Security and privacy

| Capability | Area | Requirement and Test ID | Type | Preconditions and procedure | Expected result and security/privacy boundary | Evidence required | Responsible role | Status | Blocking condition | Notes |
| Auth/authz/session/IDOR | Security | Q-001 Authentication; Q-002 Authorization; Q-003 Session expiry; Q-004 Session revocation; Q-005 IDOR protection | Automated/browser | Attempt protected access with no/expired/revoked/wrong identity | Server rejects unauthorized request safely | Security/admin/session tests; browser record | Security Owner | BLOCKED | Browser accounts for full workflow | Automated security tests PASS. |
| Media/docs/rate/headers/cache/errors/input | Security | Q-006 Private media; Q-007 Signed media; Q-008 Verification-document protection; Q-009 Rate limits; Q-010 Secure headers; Q-011 No-store API behavior; Q-012 Safe error handling; Q-013 Input handling | Automated/security assessment | Run contracts and later independent assessment | Authorized private access only; safe errors/no-store/input/rate policy | Security tests; independent assessment | Security Owner; Independent security reviewer — UNASSIGNED | BLOCKED | Independent assessment/isolated media | Internal tests PASS. |
| Permission/four-eyes/audit privacy | Security | Q-014 Permission boundaries; Q-015 Four-eyes enforcement; Q-016 Audit privacy | Automated/browser | Attempt escalation/self approval; inspect safe audit | Server scopes and independent decision enforced; audit excludes private payloads | Approval/operations tests; browser audit | Security Owner; Independent approver | BLOCKED | Scoped browser accounts | Automated contracts PASS. |

### R. Performance and recovery

| Capability | Area | Requirement and Test ID | Type | Preconditions and procedure | Expected result and security/privacy boundary | Evidence required | Responsible role | Status | Blocking condition | Notes |
| Loading/splitting/mobile/data | Recovery | R-001 Route loading; R-002 Code splitting; R-003 Mobile performance; R-004 Low bandwidth | Build/visual/browser | Inspect build route chunks and state surfaces; run device/network test later | Route-level recovery and lazy chunks; low-data preference limits nonessential work | Build output; contracts; device result | Technical operations; Accessibility tester | BLOCKED | Device/network harness | Build and source evidence PASS. |
| Retry/expiry | Recovery | R-005 Offline recovery; R-006 Message retry; R-007 Voice retry; R-008 Photo retry; R-009 Notification retry; R-010 Expiry processing behavior | Automated/browser | Trigger synthetic retry/expiry cases | Member-controlled safe retry, no corruption/duplicate, correct expiry behavior | Flow/concurrency tests; browser result | Technical operations | BLOCKED | Browser/network/media harness | Deterministic tests PASS. |

## External dependency register

| Service | Purpose | Current status | Required environment | Credential requirement | Owner | Security review | Compliance review | Test requirement | Launch blocker |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Payment provider | Checkout/payment/refund webhook | NOT CONFIGURED | Isolated sandbox then approved production | Merchant credentials/webhook secret | Finance/Provider owner — UNASSIGNED | Required | Required | Sandbox payment/refund/idempotency evidence | Yes |
| SMS/OTP provider | Phone verification/transactional SMS | NOT CONFIGURED | Isolated sender/sandbox | Sender/API credentials | Provider owner — UNASSIGNED | Required | Required | Sandbox send/opt-out/privacy evidence | Yes if enabled for launch |
| Email provider | Transactional email | NOT CONFIGURED | Isolated sender/sandbox | API/domain credentials | Provider owner — UNASSIGNED | Required | Required | Sandbox delivery/suppression/privacy evidence | Yes if enabled for launch |
| Push provider | Device notifications | NOT CONFIGURED | Isolated app/project | Provider credentials | Provider owner — UNASSIGNED | Required | Required | Device sandbox/permission evidence | Yes if enabled for launch |
| Calling provider | Voice/video calling | NOT CONFIGURED; intentionally unavailable | Isolated provider sandbox | Provider credentials | Provider owner — UNASSIGNED | Required | Required | Consent/identity/safety sandbox evidence | Yes only if calling is launched |
| Staging hosting | Isolated browser validation origin | NOT AVAILABLE | Non-production host/origin | Host/project access | Staging Owner — UNASSIGNED | Required | Required | Deployed isolated app evidence | Yes |
| Staging database | Isolated fictional data | NOT AVAILABLE | MySQL/TiDB stage database | Least-privilege DB credentials | Bubacarr Sillah | Required | Required | Migration/reset/isolation evidence | Yes |
| Private storage | Test photos/docs/voice | NOT AVAILABLE | Stage-only namespace | Scoped storage credentials | Bubacarr Sillah | Required | Required | Signed access/delete/isolation evidence | Yes |
| OAuth/authentication | Isolated fictional sessions | NOT AVAILABLE | Stage OAuth client/callback | Client/secret as applicable | Bubacarr Sillah | Required | Required | Session/revocation/role test evidence | Yes |
| Monitoring | Privacy-safe alerts/diagnostics | NOT AVAILABLE | Approved monitoring project | Project credentials | Bubacarr Sillah | Required | Required | Safe test alert/retention evidence | Yes |
| Backup/restore | Recovery assurance | NOT AVAILABLE | Stage backup source/restore target | Backup encryption/access credentials | Bubacarr Sillah | Required | Required | Successful restore/RTO evidence | Yes |
| DNS/TLS | Approved staged/public origin | REQUIRES USER ACTION | Approved hostname/TLS control | DNS/TLS authority | Staging Owner — UNASSIGNED | Required | Required | Hostname/certificate evidence | Yes |

## RACI-style responsibility matrix

| Area | Responsible | Accountable | Consulted | Informed | Current assignment status |
| --- | --- | --- | --- | --- | --- |
| Founder/product acceptance | Bubacarr Sillah; Salifu Marong | Bubacarr Sillah | Support/technical roles | All operators | ASSIGNED |
| Trust & Safety validation | Trust & Safety Owner — UNASSIGNED | Trust & Safety Owner — UNASSIGNED | Security Owner; Independent approver | Founder/product | UNASSIGNED |
| Verification validation | Verification Owner — UNASSIGNED | Verification Owner — UNASSIGNED | Security Owner | Founder/product | UNASSIGNED |
| Editorial validation | Editorial Owner — UNASSIGNED | Editorial Owner — UNASSIGNED | Independent approver | Founder/product | UNASSIGNED |
| Staging/technical operations | Bubacarr Sillah | Bubacarr Sillah | Salifu Marong | Founder/product | Staging Owner itself UNASSIGNED |
| Finance/provider validation | Finance operator/Provider owner — UNASSIGNED | Provider owner — UNASSIGNED | Bubacarr Sillah | Founder/product | UNASSIGNED |
| Support validation | Salifu Marong | Salifu Marong | Trust & Safety/technical operations | Founder/product | ASSIGNED |
| Security assessment | Independent security reviewer — UNASSIGNED | Bubacarr Sillah | Security Owner | Founder/product | UNASSIGNED reviewer |
| Accessibility validation | Accessibility tester — UNASSIGNED | Founder/product | Technical operations | Founder/product | UNASSIGNED |
| Provider ownership | Provider owner — UNASSIGNED | Founder/product | Finance/technical operations | Support | UNASSIGNED |
| Beta execution | Bubacarr Sillah; Salifu Marong | Bubacarr Sillah and Salifu Marong | Specialist owners | Founder/product | ASSIGNED, but environment blocked |

## Browser, accessibility, security, provider, backup, and beta requirements

| Package | Mandatory evidence before gate can pass | Current status |
| --- | --- | --- |
| Browser-validation package | Authorized fictional accounts complete the prepared single/multi-account workflows with pass/fail records | BLOCKED |
| Accessibility-validation package | Keyboard and assistive-technology results, dialog/focus evidence, mobile/device controls, motion/data preference execution | BLOCKED |
| Security validation | Independent assessment, authorized route/IDOR/media/session/four-eyes evidence, findings disposition | BLOCKED |
| Provider validation | Required provider sandbox evidence for any provider-enabled launch capability | BLOCKED |
| Backup/restore validation | Approved backup artifact plus successful isolated restore and recovery evidence | BLOCKED |
| Controlled beta | Gated fictional/account authorization evidence, owner sign-off, support/incident/recovery evidence, approved entry/exit criteria | BLOCKED |

## Objective launch gates

| Gate | Objective pass criterion | Current status | Blocking condition |
| --- | --- | --- | --- |
| Gate 1 — Product | All documented core capabilities accepted or intentionally NOT APPLICABLE | PASS | — |
| Gate 2 — Automated quality | Tests, TypeScript, production build, and dependency audit pass | PASS | — |
| Gate 3 — Browser | Required authorized fictional browser workflows pass | BLOCKED | Isolated accounts/environment absent |
| Gate 4 — Accessibility | Required actual accessibility workflows pass | BLOCKED | Accessibility tester/harness/accounts absent |
| Gate 5 — Security | Independent assessment completed and findings disposition approved | BLOCKED | Independent reviewer absent |
| Gate 6 — Infrastructure | Isolated staging, monitoring, and backup/restore verified | BLOCKED | Resources/owners/evidence absent |
| Gate 7 — Providers | Required provider sandbox/integration tests pass | BLOCKED | Providers/owners/sandbox evidence absent |
| Gate 8 — Operations | Owners and incident/recovery procedures confirmed through controlled execution | BLOCKED | Specialist ownership and environment gaps |
| Gate 9 — Legal | Required legal/compliance review complete | BLOCKED | Review/owner evidence absent |
| Gate 10 — Controlled beta | Approved beta entry criteria and controlled evidence complete | BLOCKED | Earlier gates blocked |
| Gate 11 — Launch | Every mandatory preceding gate passes | BLOCKED | Gates 3–10 blocked |

## Current blockers

The critical blockers are the absence of an isolated fictional-account environment, stage storage/database/OAuth/origin, specialist Trust & Safety/verification/editorial/accessibility/provider ownership, independent security review, monitoring, backup/restore proof, legal/compliance review, and required provider sandbox evidence. These are not silently converted into product defects and no service is activated by this matrix.

## Final acceptance criteria

Acceptance requires a PASS evidence record for every mandatory applicable row, no unresolved FAIL row, an approved disposition for findings, and every objective launch gate above at PASS. The product cannot be labelled launch-ready until Gate 11 passes.

## Acceptance dashboard

| Dimension | Status | Basis |
| --- | --- | --- |
| PRODUCT COMPLETENESS | PASS | Frozen product audit found no missing core capability or genuine product defect. |
| AUTOMATED QUALITY | PASS | 259 tests/59 files, TypeScript, build, and dependency audit pass. |
| BROWSER VALIDATION | BLOCKED | Prepared but no authorized fictional browser accounts/environment. |
| ACCESSIBILITY | BLOCKED | Automated evidence exists; mandatory actual assistive-technology execution absent. |
| SECURITY | BLOCKED | Internal tests pass; independent assessment remains absent. |
| INFRASTRUCTURE | BLOCKED | Isolated staging, monitoring, and restore evidence absent. |
| PROVIDERS | BLOCKED | No provider sandbox/integration evidence. |
| OPERATIONS | BLOCKED | Specialist ownership and controlled operational execution incomplete. |
| LEGAL | BLOCKED | Required review not evidenced. |
| CONTROLLED BETA | BLOCKED | Preceding gates remain blocked. |
| LAUNCH | BLOCKED | Mandatory gates 3–10 are blocked. |

## Related authoritative internal artifacts

The prepared execution package is `controlled-browser-validation-package.md`; authenticated accessibility boundaries are in `authenticated-accessibility-matrix.md`; controlled workflow integrity evidence is in `controlled-workflow-verification-state-integrity-final-report.md`; cross-module evidence is in `end-to-end-product-orchestration-final-report.md`; and freeze visual evidence is in `controlled-browser-validation-freeze-visual-review.md`.
