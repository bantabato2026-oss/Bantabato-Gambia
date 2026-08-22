# BANTABATO — Controlled Browser Validation Package

## Execution rule

Every workflow below is an **executable specification**, not executed evidence. All listed identities are deterministic **TEST ONLY** `@example.test` fixture definitions. No identity has been provisioned in the current environment, and no browser workflow below has been run.

> **Current execution status for every workflow:** **BLOCKED — EXTERNAL ACTION REQUIRED.** An isolated environment, approved fictional accounts, proper role grants, private test media/documents, and explicit authorization are required before execution.

## Test-only persona register

| Persona | Required controlled initial state | Authority boundary |
| --- | --- | --- |
| Member A | Complete profile, five approved photos, verified, discoverable | Controls own profile, consent, interests, messages, family invitations, and voluntary declarations only. |
| Member B | Complete compatible profile, five approved photos, verified, discoverable | Separate member; no implied access to Member A data until the relevant mutual/consent state exists. |
| Parent | Accepted Family Circle participant | Permissioned shared profile/match context only; never account, messages, documents, call consent, safety, or relationship decision access. |
| Wali/Guardian | Accepted/verified Family Circle participant as required | Same deliberate scope boundary as Parent, with separate guardian-verification status. |
| Verification reviewer | Scoped verification role and fresh session when required | Verification queue/document decision scope only. |
| Trust & Safety reviewer | Scoped Trust & Safety role and fresh session when required | Safety case/restriction scope only; no unrelated finance/editorial authority. |
| Independent approver | Separate authorized approver and fresh session | May decide eligible approval requests but can never decide own proposal. |
| Editorial reviewer | Scoped content-policy role | Voluntary consented story review/presentation scope only. |
| Support operator | Scoped support role | Support ticket/member-safe context only; no safety, finance, private-message, or document decision authority. |
| Finance operator | Scoped finance role | Provider-neutral transaction/refund/reconciliation scope only. |
| Country operator | Existing platform-administration country-operations scope | Country policy/readiness configuration only; no country ranking, legal, immigration, or provider claim. |

## Single-account workflow matrix

| ID | Persona and starting state | Action | Expected result, security/audit boundary, recovery, and pass condition |
| --- | --- | --- | --- |
| A | Member A, no authenticated session | Register/sign in through the approved identity flow | Account entry begins securely without client-auth fabrication; account/auth audit follows existing server flow. Recover via the sign-in route. **Pass:** no account control appears before authenticated session. |
| B | Member A, newly authenticated draft profile | Complete progressive onboarding and interrupt/reload during draft work | Essentials → life/marriage → privacy progression validates required fields and restores only safe local draft data. **Pass:** incomplete foundation remains ineligible and field errors/focus are announced. |
| C | Member A, four approved profile photos | Select/upload/review fifth photo; try sixth/replacement/upload retry | Fifth approval completes photo threshold; sixth fails capacity; replacement cannot overwrite storage key; interrupted upload remains retryable. Audit contains photo state metadata, not bytes. **Pass:** exactly five active approved photos are required. |
| D | Member A, unverified | Submit fictional private document; reviewer acts approved, rejected, then resubmission/approval | Manual review status changes without public document exposure. Recover with resubmission guidance. **Pass:** a badge is never issued before protected reviewer approval. |
| E | Member A, eligible and active | Open deliberate discovery and apply supported filters | Only eligible, visible, unblocked, active candidates appear under deterministic filtering. **Pass:** hidden/restricted/incompatible candidates do not appear. |
| F | Member A, eligible candidate explanation available | Open compatibility explanation | Plain-language, privacy-safe explanation appears with no score, hidden input, AI claim, popularity, engagement, or Premium advantage. **Pass:** explanation exposes no protected/private values. |
| G | Member A, eligible candidate | Send interest; then receive reciprocal interest from Member B | Mutual interest is required before a conversation unlocks. Audit/notification are content-minimized. **Pass:** unilateral interest cannot send a message. |
| H | Member A, active mutual conversation | Send text, view read/unread state, retry a controlled uncertain response | Request key returns one logical message and read state remains participant scoped. Recover through member-initiated retry. **Pass:** no duplicate message or private text in audit metadata. |
| I | Member A, active mutual conversation and authorized microphone | Record/pause/preview/cancel voice note | Voice lifecycle is labelled; media stays private and signed only after authorization. **Pass:** no live calling claim and no public permanent URL. |
| J | Member A, voice preview with simulated request uncertainty | Upload/retry voice note | Same key/same payload returns one logical note; conflicting reuse is rejected. **Pass:** no duplicate media/message record. |
| K | Member A, reciprocal communication evidence | Open readiness status | Readiness reflects participation, safety, compatibility, verification, and consent—not payment/engagement score. **Pass:** unmet condition keeps enhanced communication unavailable. |
| L | Member A, readiness candidate | Grant/withdraw voice and video consent separately | Consent is capability-specific and withdrawal is immediate. **Pass:** no consent grants a live provider/call automatically. |
| M | Member A, active profile | Invite Parent/Wali using fictional contact identity | Invitation is hashed, time-bound, participant-specific, and audited. **Pass:** no family role is delegated member authority. |
| N | Member A, accepted Family Circle link | Grant/revoke one scoped permission and selective match share | Shared view changes only within that link/permission. **Pass:** no private messages/documents/call consent become available. |
| O | Member A, active family share | Withdraw share/remove participant | Shared view and acknowledgement access are promptly removed. **Pass:** underlying member match remains unchanged. |
| P | Member A, active mutual conversation | Block Member B | Discovery, messaging, recommendations, and readiness act consistently with block. **Pass:** blocked conversation cannot send. |
| Q | Member A, active member context | File a report | Existing Trust & Safety record is created with member-safe outcome boundary. **Pass:** reporter/safety evidence remains private. |
| R | Trust & Safety reviewer, approved scoped case | Apply reversible scoped restriction | Dependent discovery/conversation/readiness/recommendation effects follow action scope; safe notification/audit is written. **Pass:** no permanent automatic sanction. |
| S | Member A, appeal-eligible active action | Submit appeal and route review to separate staff identity | Appeal remains independent from original decision maker. **Pass:** no internal evidence/reporter exposure. |
| T | Member A, provider unavailable | View plan/subscription/entitlement/cancel/expiry/refund state | Provider-neutral billing transitions render truthfully. Recover through listed provider-unavailable/retry guidance. **Pass:** no real charge, credential, or payment success claim. |
| U | Member A, notification settings | Change preference/quiet hours and trigger supported event | Recipient, idempotency, safe copy, preference, quiet-hours, retry/expiry rules apply. **Pass:** no private message/media content appears. |
| V | Member A, recommendation shown | Give feedback/hide candidate | Feedback does not create a negative label or alter unrelated match state. **Pass:** direct exclusion follows hide/block/report rules. |
| W | Member A, recent sign-in and voluntary declaration | Submit consented success-story source | Submission requires fresh sign-in and explicit public consent. **Pass:** source remains private pending editorial process. |
| X | Editorial reviewer plus independent approver | Screen copy, request approval, publish after independent decision | Public presentation uses screened copy and consent/approval gates. **Pass:** no private draft/media/storage data is public. |
| Y | Member A, published voluntary story | Withdraw consent/story | Public availability is immediately removed. **Pass:** withdrawal cannot be overridden by editorial state. |
| Z | Scoped staff proposer | Propose protected staff/safety/finance/configuration action | Request enters pending approval with safe audit. **Pass:** requester cannot complete protected action alone. |
| AA | Independent approver, fresh valid session | Approve/reject pending request; attempt self/expired/reused decision | Server enforces separate actor, required role, pending status, expiry, and one decision. **Pass:** unauthorized/self/duplicate decision is rejected. |
| AB | Country operator, authorized country scope | Review country readiness/locale/currency/availability state | Gambia/Senegal/diaspora state stays neutral and provider-honest. **Pass:** no legal/immigration/exchange-rate/country-ranking claim. |
| AC | Any authorized fixture | Keyboard-only navigation, labels, errors, loading, dialogs, retry, voice controls, motion/data modes | Native controls, visible focus, labelled states, and preference-respecting motion/data behavior are checked. **Pass:** keyboard/focus/labels meet the documented matrix. |
| AD | Member A, simulated offline/read failure | Interrupt onboarding/message/photo/voice/billing read then recover | Safe local draft/retry states prevent duplicate or unsafe mutation. **Pass:** recovery does not corrupt state. |
| AE | Any staff/member session fixture | Let session expire/revoke then request protected action | Server denies action and gives safe reauthentication/recovery message. **Pass:** no stale session action succeeds. |
| AF | Parent/Wali/staff invitation fixture after expiry | Attempt acceptance/reuse | Expired/reused code is rejected before identity/link creation. **Pass:** no duplicate link/staff identity exists. |

## Multi-account workflows

| Participants | Sequence | Required cross-account assertions |
| --- | --- | --- |
| Member A ↔ Member B | Eligible profiles → discovery → reciprocal interest → conversation → text/voice → read/unread → readiness → separate consent → block/revocation | Each member sees only own controls; conversation is mutual-only; request retries deduplicate; block removes dependent communication/readiness immediately. |
| Member A ↔ Parent/Wali | Invite → accept → scoped permission → selective share → acknowledgement/feedback → revoke | Parent/Wali never receives account, private message/document, call-consent, safety-internal, or relationship-decision access. |
| Verification reviewer ↔ Member A | Fictional document submission → claim/review → approve/reject/resubmission | Reviewer sees only scoped verification material; Member A sees safe status only. |
| Safety reviewer ↔ Member A ↔ Independent approver | Report/case → proposed high-impact action → independent approval → scoped state change → appeal | Proposer cannot approve own action; state effects are reversible/scoped; audit is content-minimized. |
| Editorial reviewer ↔ independent approver ↔ Member A | Consent/fresh sign-in → screened copy → approval → publication → withdrawal | Public surface receives only consented screened text; withdrawal promptly removes it. |
| Finance operator ↔ Member A | Provider-neutral transaction/refund/reconciliation/entitlement state | Operator has no messaging/safety authority; member receives safe billing state without live provider claim. |

## Dedicated accessibility, media, and security packages

| Package | Browser checks | Pass condition |
| --- | --- | --- |
| Accessibility | Keyboard route/nav order; focus visibility; headings/labels; error/loading/state announcements; dialog/drawer return; permission/retry controls; voice status; reduced motion; low bandwidth; mobile navigation | Controls remain keyboard-operable and labelled; state surfaces remain understandable; no claim is made until actual assistive technology runs. |
| Media | Photo selection/five-photo count/replacement/failure/retry; voice record/denial/upload failure/retry/playback/delete; block/restriction interaction | Private media stays authorized, retry-safe, capacity-safe, and non-duplicated; no public media URL/call capability appears. |
| Security | Unauthorized routes; scope escalation; expired/revoked session; expired/reused invitation; unauthorized/self approval; blocked communication; restricted member; private media; verification document access | Server rejects every unauthorized path; UI does not disclose private content, tokens, or internal decision evidence. |

## Freeze audit conclusion

No genuine product defect, unimplemented core user journey, security/privacy regression, accessibility regression, cross-module inconsistency, or design-system inconsistency was found in this read-only freeze audit. The only changes in this pass are test-only persona completeness and documentation necessary to prepare controlled browser validation. Cosmetic redesign and new product features are deliberately out of scope.
