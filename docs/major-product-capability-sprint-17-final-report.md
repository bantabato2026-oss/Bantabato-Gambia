# BANTABATO — Major Product Capability Sprint 17

## Family Circle, Wali/Guardian & Marriage Journey

Sprint 17 audited the member-owned Family Circle and marriage-intent journey, then completed targeted internal gaps without creating an account, relationship, invitation, notification recipient, Wali/Guardian, Parent, payment, provider connection, infrastructure change, or launch claim. The implementation preserves server authority, explicit member consent, privacy minimization, advisory-only family participation, and no-score/no-ranking principles.

| Requested area | Sprint 17 result |
|---|---|
| Family Circle dashboard | The member projection now provides factual counts for active participants, invited/expired codes, Wali/Guardian verification attention, and acknowledgements awaiting response. Counts are derived from the member-owned server projection, not fabricated activity. |
| Invitation lifecycle | Existing secure invitations remain recipient-email-bound, hashed, time-limited, single-use, reissuable with an invalidated prior code, revocable while pending, and protected by status compare-and-update guards. Reissue/revocation retain private audit events. |
| Parent and Wali/Guardian roles | Existing roles remain distinct. A Parent can participate after acceptance; a Wali/Guardian enters `pending_verification` and requires the established staff process before verified participation. Neither role gains member-account control, messaging, decision, safety, verification-document, or call-consent authority. |
| Consent and participant permissions | Profile basics, photo, marriage intentions, compatibility summary, family context, potential matches, and acknowledgement state remain independent, reversible permissions. Participant permission does not change match, connection, readiness, messaging, voice, video, payment, or member preference state. |
| Potential-match sharing | Only an existing mutual match may be shared, only when the member grants `potential_match` permission, and only for advisory participation. Sharing never creates a match, changes compatibility, or unlocks communication. |
| Acknowledgement and feedback | Active shared-match rows now project bounded acknowledgement status and timing to the owning member. Requested acknowledgement remains advisory, duplicate-aware, and separate from feedback; it does not approve, decline, or alter any member decision. |
| Cross-module safety and connection revocation | A new server hook withdraws every active Family Circle shared-match row for a profile pair when its authoritative conversation is revoked. It also withdraws pending acknowledgements, records minimized share-withdrawal history/audit evidence, and deliberately omits the block/report/safety reason from family participants. Direct conversation revocation, pair revocation, report, block, restriction, suspension, integrity, and incompatibility paths continue to use the authoritative readiness boundary. |
| Safety, verification, and membership | Existing safety, verification, profile eligibility, membership, and provider-neutral boundaries remain unchanged. Family Circle participants do not see reports, enforcement, verification documents, private conversation/voice content, payment details, membership status, or internal state. |
| Marriage intent and another-marriage context | Existing marriage intention, polygyny openness, family involvement, and profile visibility controls remain explicit member fields. The sensitive another-marriage context remains conditionally shown only when the member has selected `married`; it is private and excluded from discovery, recommendations, compatibility explanations, Family Circle, matching, ranking, and scoring. |
| Engaged and married declaration | Existing private declaration save, fresh-auth public-story gate, consent recording, profile-row serialization, withdrawal, and public-story independence remain authoritative. A declaration remains private unless the separate editorial-consent process is satisfied; it does not archive an account, alter discovery, recommendations, connections, or Family Circle access. |
| Notifications | Existing factual in-app notifications for invitation acceptance/decline, acknowledgement, feedback, verification, safety, membership, and finance remain provider-neutral. Sprint 17 adds no fabricated reminder, delivery claim, email, SMS, push, or external provider. |
| Mobile, accessibility, and recovery | The Family Circle screen now states that it will not queue sensitive mutations offline and adds factual status feedback after confirmed server mutations. Desktop and 375 px review confirmed readable prerequisite recovery, private declaration recovery, profile form hierarchy, and touch-oriented actions. |
| Concurrency and stale actions | Existing invitation, reissue, acceptance, revocation, permission, share, acknowledgement, declaration save, and withdrawal lifecycle guards remain. The new connection hook locks active share rows before withdrawal so repeated revocations do not expose an active share after connection loss. |
| Premium neutrality | No membership feature bypasses invitation security, participant role, Wali/Guardian verification, consent, privacy, safety, eligibility, mutual-match requirement, Family Circle permissions, or declaration conditions. |

## Validation Evidence

Sprint 17 adds `server/sprint17FamilyJourney.contract.test.ts` and preserves existing Family Circle service flows, readiness-service flows, declaration contracts, safety, verification, membership, notification, and privacy suites.

| Validation | Result |
|---|---|
| TypeScript | Passed (`pnpm check`) |
| Regression suite | **344 tests across 73 files passed** |
| Production build | Passed (`pnpm build`) |
| Production dependency audit | Passed; no known production dependency vulnerabilities (`pnpm audit --prod --audit-level=high`) |
| Desktop review | Read-only review of `/app/family`, `/app/settings`, and `/app/profile/details` at 1280 px passed. |
| Mobile review | Read-only review of the same routes at 375 px passed. |

## Boundaries and Remaining Work

No real member, Parent, Wali/Guardian, invitation, participant account, family acknowledgement, shared match, relationship declaration, editorial consent, match, message, voice note, notification recipient, safety action, verification action, payment, provider, external communication, infrastructure change, or launch process was created, changed, or claimed. The authenticated preview account had no member profile, so no protected Family Circle, relationship-declaration, or profile data was requested or displayed during review.

The product-completeness classification remains **internally strengthened for Sprint 17 Family Circle and marriage-intent scope; launch remains NOT READY**. The highest-value next internal capability is a **test-only multi-person Family Circle and connection-safety journey harness** using fictional fixtures across invitation/reissue/revoke, recipient-bound acceptance, Wali verification, permissions, match sharing, acknowledgement/feedback, private declaration/withdrawal, block/report/restriction/connection revocation, and notification/audit effects—without real accounts, people, providers, delivery, or browser-execution claims.
