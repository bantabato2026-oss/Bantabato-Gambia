# Controlled Operational Rehearsal Framework

**Rule:** A rehearsal record is synthetic-only and cannot convert `SIMULATED` into `VERIFIED` without actual evidence from the named environment.

| Area               | State          | Evidence                                                                              | Dependency                         | Owner status            | Next action                               |
| ------------------ | -------------- | ------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------- | ----------------------------------------- |
| Staging deployment | BLOCKED        | No isolated staging target, origin, credentials, or secrets verified                  | Staging environment                | OWNER REQUIRED          | Provide isolated staging inputs and owner |
| Database backup    | PENDING        | No backup service or artifact was available                                           | Non-production backup destination  | OWNER REQUIRED          | Configure disposable backup target        |
| Storage backup     | PENDING        | No storage backup service was available                                               | Non-production storage destination | OWNER REQUIRED          | Configure and identify storage backup     |
| Database restore   | BLOCKED        | No disposable restore target or backup artifact available                             | Disposable MySQL + backup artifact | OWNER REQUIRED          | Perform synthetic A–J restore             |
| Storage restore    | BLOCKED        | No non-production storage restore target available                                    | Non-production storage             | OWNER REQUIRED          | Perform synthetic asset restore           |
| Rollback           | PENDING        | Procedure documented; no disposable deployment rehearsal performed                    | Disposable deployment target       | OWNER REQUIRED          | Rehearse version and migration rollback   |
| Monitoring         | CONFIGURED     | Provider-neutral signal/severity/response catalog exists                              | Monitoring provider                | EXTERNAL OWNER REQUIRED | Configure destination and owner           |
| Alert escalation   | OWNER REQUIRED | Escalation states defined; no on-call route verified                                  | Operational owner                  | OWNER REQUIRED          | Assign escalation route                   |
| Incident response  | CONFIGURED     | Runbook covers twelve failure classes                                                 | Operational owner                  | OWNER REQUIRED          | Assign owner and rehearse tabletop        |
| Account recovery   | VERIFIED       | Existing authenticated/session policies and tests cover fresh auth and revocation     | Authenticated review               | OWNER REQUIRED          | Run controlled browser journey            |
| Data deletion      | CONFIGURED     | Member-owned request lifecycle pauses discovery and supports fresh-auth cancellation  | Legal retention/purge decision     | OWNER REQUIRED          | Decide purge and retained-record behavior |
| Data export        | CONFIGURED     | Member-only scope, fresh auth, stale protection, and non-public state are implemented | Secure delivery infrastructure     | EXTERNAL OWNER REQUIRED | Configure private delivery and expiry     |
| Session revocation | VERIFIED       | Current/other session distinction, revocation, stale state, and fresh auth are tested | Authenticated review               | OWNER REQUIRED          | Run controlled browser journey            |
| Safety escalation  | CONFIGURED     | Safety workflow remains role-bound and fail-closed                                    | Trust & Safety owner               | OWNER REQUIRED          | Assign owner and rehearse synthetic case  |

Allowed states are: `SIMULATED`, `TESTED IN DISPOSABLE ENVIRONMENT`, `CONFIGURED`, `VERIFIED`, `PENDING`, `BLOCKED`, `OWNER REQUIRED`, `LEGAL DECISION REQUIRED`, and `EXTERNAL REVIEW REQUIRED`.

No production data, real accounts, external telemetry, provider credentials, or live communications were used.
