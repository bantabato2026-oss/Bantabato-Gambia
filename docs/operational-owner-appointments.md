# Bantabato Sprint 63 — Operational Owner Appointments

**Status:** **OWNER REQUIRED — NO FORMAL ACCEPTANCES RECORDED**

## Appointment requirements

An appointment is valid only when a named person or organization explicitly accepts the role, scope, access boundary, competence requirement, escalation route, and review/expiry date through the authorized process. Founder intent or a blank template is not acceptance evidence.

| Role                          | Responsibilities                                     | Access boundary                                                  | Required competence                              | Escalation route                    | Acceptance     |
| ----------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------- | -------------- |
| Technical/platform owner      | Deployment, release quality, environment identity    | Staging and release systems only; no unnecessary production data | React/Express/CI and release controls            | Release approver and incident owner | OWNER REQUIRED |
| Database/recovery owner       | Migrations, backup, restore, rollback evidence       | Staging/disposable DB; least privilege                           | MySQL/TiDB, recovery, migration safety           | Technical owner and incident owner  | OWNER REQUIRED |
| Monitoring/incident owner     | Alerts, triage, escalation                           | Monitoring project and redacted telemetry                        | Incident response and privacy-safe observability | Release approver and Trust & Safety | OWNER REQUIRED |
| Privacy/data protection owner | Data rights, deletion, export, privacy decisions     | Minimum-necessary privacy records                                | Data protection and lifecycle controls           | Legal reviewer                      | OWNER REQUIRED |
| Legal reviewer                | Retention, deletion, export, terms/privacy decisions | Legal review materials only                                      | Applicable legal/privacy competence              | Founder/release approver            | OWNER REQUIRED |
| Independent security reviewer | Independent assessment and report                    | Time-limited review access                                       | Qualified security assessment                    | Founder/release approver            | OWNER REQUIRED |
| Accessibility reviewer        | Keyboard, screen reader, contrast, mobile review     | Synthetic staging only                                           | Accessibility testing competence                 | Technical owner                     | OWNER REQUIRED |
| Localization reviewers        | Wolof, Mandinka, French review and approval          | Copy/content review only                                         | Native/competent language review                 | Product/release approver            | OWNER REQUIRED |
| Trust & Safety owner          | Safety decisions, reports, escalation                | Minimum-necessary member/safety scope                            | Trust & Safety operations                        | Incident owner and release approver | OWNER REQUIRED |
| Release approver              | Final gate decision and rollback authorization       | Approval records and release evidence                            | Authority to approve/reject release              | Founder governance                  | OWNER REQUIRED |

## Appointment record fields

`appointment_id`, role, person/organization, accepted scope, access boundary, competence basis, primary/backup, escalation route, acceptance timestamp, approval reference, review/expiry date, and evidence location. Do not store secrets or identity documents in this file.

## Current result

Zero roles have formal acceptance evidence in Sprint 63. No person was appointed automatically and all related gates remain unresolved.

## Sprint 64 priority appointments

### Technical/platform owner — OWNER REQUIRED

Responsibilities: deployment and environment configuration; access and secret-management coordination; database and storage isolation; infrastructure monitoring. Minimum access: staging deployment and approved secret-manager scope only, with no unnecessary production data access. Escalates failed identity/isolation checks to the release approver and incident owner. Acceptance requires explicit person/role, scope, access boundary, timestamp, and approval reference.

### Database and recovery owner — OWNER REQUIRED

Responsibilities: backup ownership, restore procedures, recovery verification, and rollback coordination. Minimum access: staging/disposable database and approved backup targets only. Escalates failed backup, restore, consistency, or rollback checks to the technical owner and release approver. Acceptance requires explicit person/role, recovery scope, target boundaries, timestamp, and approval reference.

No technical or recovery owner accepted these appointments in Sprint 64.
