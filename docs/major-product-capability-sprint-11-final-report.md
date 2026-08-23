# BANTABATO — Major Product Capability Sprint 11

## Family Circle, Wali & Marriage Intent Experience

Sprint 11 audited the member journey from profile and marriage intent through Family Circle invitations, Wali/Guardian participation, scoped permissions, mutual-match sharing, acknowledgement, private engagement or marriage declarations, discovery, recommendations, readiness, messaging, notifications, privacy, staff boundaries, mobile layout, accessibility, recovery, and concurrency. The work focused on genuine internal gaps and retained server-authoritative matching, consent, safety, privacy, billing neutrality, and provider-neutral boundaries.

| Area | Sprint 11 outcome |
|---|---|
| Family Circle journey | The existing member-owned Parent and Wali/Guardian flow was retained and strengthened with a distinct pending-invitation revocation lifecycle and clearer member recovery. |
| Wali/Guardian | Wali participation remains account-bound, purpose-specific, and manually reviewed through the established `pending_verification` to `verified` or `unverified` process. It does not grant account control, private communications, safety visibility, or decision authority. |
| Invitation lifecycle and security | Invitations remain email-bound, code-hashed, time-limited, single-use on acceptance or decline, and replay-resistant. Reissue replaces the prior code. Sprint 11 adds explicit revocation that clears the code, sets `revoked`, emits a private audit event, and rejects stale reissue/revocation races. |
| Participant permissions | Profile basics, photos, marriage intention, compatibility summary, family context, selected potential matches, and acknowledgement are independent, reversible grants. Only a member-selected existing mutual match can be shared. |
| Consent and feedback | Participant acknowledgement and feedback remain advisory. They do not accept or reject a member’s match, change a connection, grant messaging, alter readiness, or bypass safety. |
| Marriage intent and another-marriage context | The existing profile form now shows **“Why are you seeking another marriage?”** only when marital status is `married`. The value remains private and is explicitly excluded from other members, Family Circle, discovery, recommendations, compatibility explanations, scoring, popularity, and ranking. |
| Polygamy-aware profile controls | Existing `polygynyOpenness`, marital-status, children, family-involvement, and privacy controls remain explicit member fields. No preference becomes a hidden score or ranking mechanism. |
| Engaged/married declarations | The Settings declaration panel now presents factual states—no declaration, private active engagement or marriage declaration, and withdrawn declaration—with explicit recovery before profile creation. Declarations do not archive accounts or alter discovery, recommendations, matches, or Family Circle access. |
| Relationship privacy | Private declarations are never exposed to matches or Family Circle participants. Any public-story path remains separately consented, fresh-auth protected, staff-reviewed, independently approved, and non-automatic. |
| Discovery and recommendations | No ranking or matching rule changed. Existing profile changes remain the authorized point for withdrawing affected recommendations and incompatible connections; the private another-marriage response is not included in discovery projection. |
| Connections, readiness, and messaging | Mutual match remains required for communication. Family involvement remains advisory and cannot unlock messaging, voice, video, live calling, or readiness consent. |
| Notifications | Existing factual in-app Family Circle notifications for invitation acceptance, decline, acknowledgement, and feedback remain member-owned. Sprint 11 introduces no external delivery, unrelated-recipient notification, engagement mechanic, or fabricated notification. |
| Auditability | Invitation, reissue, acceptance, decline, revocation, permission grant/revoke, share withdrawal, acknowledgement, feedback, participant removal, restriction, declaration save, and declaration withdrawal retain private audit evidence without raw invitation codes or unnecessary sensitive content. |
| Staff authorization | Staff retain no casual path to alter a member’s Family Circle relationship, consent, or declaration. Existing scoped Wali review and independent publication approval boundaries remain unchanged. |
| Command Center and profile | The existing Command Center continues to show factual Family Circle and private-milestone cards. Profile details now place the sensitive another-marriage prompt only in the relevant married-member context. |
| Mobile and accessibility | Read-only desktop and 375 px review found clear recovery cards, readable labels, single-column form flow, wrap-safe headings, and visible actions. No formal screen-reader or keyboard-only execution is claimed. |
| Motion and low bandwidth | No new animation was added to sensitive relationship state. Existing reduced-motion and low-bandwidth controls remain the applicable design-system boundary. Member-facing updates rely on confirmed server mutation outcomes and preserve retry/error states. |
| Concurrency and duplicate safety | Invitation reissue and revocation now verify that the link is still pending at update time. Declaration save and withdrawal serialize on the member profile row before operating on the single profile-scoped declaration record. |
| Premium and provider neutrality | Membership does not bypass Family Circle privacy, Wali consent, marital privacy, relationship-declaration consent, blocks, restrictions, verification, compatibility, or ranking. No provider, payment, account, or infrastructure capability was activated. |

## Validation Evidence

Sprint 11 added `server/sprint11FamilyMarriageIntent.contract.test.ts`, covering pending invitation revocation and stale-action safety, Family Circle prerequisite gating and privacy, married-only private context, private declaration lifecycle, serialized declaration guards, no-score constraints, and premium neutrality. Existing Family Circle service-flow and declaration-policy tests were retained.

| Validation | Result |
|---|---|
| TypeScript | Passed (`pnpm check`) |
| Regression suite | **320 tests across 69 files passed** |
| Production build | Passed (`pnpm build`) |
| Production dependency audit | Passed; no known production vulnerabilities (`pnpm audit --prod --audit-level=high`) |
| Desktop review | Read-only review of Family Circle, Settings/private relationship declaration, and Profile Details at 1280 px passed; see the visual-validation record. |
| Mobile review | Read-only review of the same paths at 375 px passed; see the visual-validation record. |

## Boundaries and Remaining Work

No real member, Parent, Wali/Guardian, marriage, engagement, relationship declaration, invitation recipient, notification recipient, account, provider, payment, external communication, staff decision, infrastructure, or launch process was created, changed, or claimed. Browser interaction was limited to read-only rendering of the current preview account; the account had no member profile, so no protected Family Circle or relationship data was requested or displayed.

The product-completeness classification remains **internally implemented for the Sprint 11 scope, but not launch ready**. The highest-value next internal capability is a **test-only, multi-member relationship-state journey harness** for profile eligibility → Family invitation/reissue/revoke → account-bound acceptance → Wali review → permission/share/acknowledgement → block or safety revocation → private engagement or marriage declaration/withdrawal, using only fictional fixtures and without creating accounts or claiming browser execution.
