# Bantabato Sprint 62 — Operational Ownership Appointment Register

**Review date:** 2026-11-01  
**Rule:** A role becomes assigned only after explicit acceptance is recorded through the approved process. No names are invented and no responsibility is implied.

| Responsibility                         | Required role                   | Current status | Acceptance evidence required                                  | Founder next action                      |
| -------------------------------------- | ------------------------------- | -------------- | ------------------------------------------------------------- | ---------------------------------------- |
| Technical/platform and release quality | Technical owner                 | OWNER REQUIRED | Name, scope, repository/deployment authority, acceptance date | Appoint primary and backup               |
| Infrastructure and staging             | Platform/infrastructure owner   | OWNER REQUIRED | Runtime, domain, secrets, environment scope                   | Appoint owner and approve staging target |
| Database administration                | Database owner                  | OWNER REQUIRED | DB scope, least privilege, migration authority                | Appoint owner and staging DB             |
| Backup, restore, rollback              | Database/recovery owner         | OWNER REQUIRED | Recovery target, runbook acceptance, escalation route         | Appoint primary and backup               |
| Monitoring and incident response       | Incident owner                  | OWNER REQUIRED | Alert destination, severity/escalation scope, on-call route   | Appoint owner and approve alert route    |
| Member support                         | Support owner                   | OWNER REQUIRED | Queue scope, response policy, privacy-safe channel            | Appoint owner                            |
| Trust & Safety                         | Trust & Safety owner            | OWNER REQUIRED | Safety decision authority and escalation coverage             | Appoint authorized owner                 |
| Privacy/data protection                | Privacy owner                   | OWNER REQUIRED | Data-rights and privacy decision scope                        | Appoint competent owner                  |
| Legal review                           | Legal reviewer                  | OWNER REQUIRED | Legal scope, decision record, date/version                    | Appoint reviewer/counsel                 |
| Independent security                   | Independent reviewer            | OWNER REQUIRED | Independent assessor identity, scope, report                  | Approve and engage reviewer              |
| Accessibility                          | Accessibility reviewer          | OWNER REQUIRED | Browser/device/screen-reader evidence and date                | Appoint competent reviewer               |
| Localization                           | Wolof/Mandinka/French reviewers | OWNER REQUIRED | Language, reviewer competence, approved copy                  | Appoint reviewers                        |
| Release approval                       | Founder/release approver        | OWNER REQUIRED | Decision against all applicable gates                         | Name approver and approval process       |

## Appointment acceptance template

For each role, record: `appointment_id`, role, person/organization, responsibility scope, primary/backup designation, accepted date, approval reference, dependencies, escalation route, review/expiry date, and evidence location. Do not record passwords, tokens, private keys, or identity documents here.

## Current conclusion

No role has formal acceptance evidence in Sprint 62. The register is now actionable, but it is not an assignment record. All corresponding ownership, recovery, legal, security, accessibility, localization, and release gates remain unresolved.
