# Bantabato Sprint 61 — Operational Ownership Register

**Review date:** 2026-11-01  
**Rule:** No person or organization is marked assigned without explicit founder evidence. Current unassigned roles remain blockers.

| Responsibility                         | Required accountable role | Current owner status | Required decision/evidence                                         | Dependencies                              | Founder approval? |
| -------------------------------------- | ------------------------- | -------------------- | ------------------------------------------------------------------ | ----------------------------------------- | ----------------- |
| Technical delivery and release quality | Technical owner           | OWNER REQUIRED       | Named owner and release authority                                  | Repository, deployment, migration review  | Yes               |
| Infrastructure and deployment          | Infrastructure owner      | OWNER REQUIRED       | Named owner and isolated runtime authority                         | Hosting, secrets, domains                 | Yes               |
| Database administration                | Database owner            | OWNER REQUIRED       | Named owner and least-privilege access                             | Staging DB, migration process             | Yes               |
| Backup and restore                     | Recovery owner            | OWNER REQUIRED       | Named primary/backup recovery owners and verified artifact process | Backup destination, restore target        | Yes               |
| Rollback and release recovery          | Deployment/recovery owner | OWNER REQUIRED       | Rollback owner and disposable rehearsal evidence                   | Disposable deployment target              | Yes               |
| Monitoring and incident response       | Incident owner            | OWNER REQUIRED       | Owner, alert route, escalation schedule                            | Monitoring provider and alert destination | Yes               |
| Member support                         | Support owner             | OWNER REQUIRED       | Queue owner, response policy, escalation route                     | Support channel and privacy policy        | Yes               |
| Trust & Safety                         | Trust & Safety owner      | OWNER REQUIRED       | Safety decision authority and escalation coverage                  | Staff roles, incident process             | Yes               |
| Privacy and data protection            | Privacy owner             | OWNER REQUIRED       | Data-rights, retention, deletion, export decision authority        | Legal review and secure delivery          | Yes               |
| Legal review                           | Legal reviewer            | OWNER REQUIRED       | Recorded legal decisions and review date/version                   | Founder-approved counsel/reviewer         | Yes               |
| Security review                        | Security owner            | OWNER REQUIRED       | Internal coordinator and independent assessor engagement           | Security package, external reviewer       | Yes               |
| Accessibility                          | Accessibility reviewer    | OWNER REQUIRED       | Manual review owner and evidence record                            | Browser/device/screen-reader access       | Yes               |
| Localization and translation           | Language reviewers        | OWNER REQUIRED       | English/Wolof/Mandinka/French review evidence                      | Competent reviewers and approved copy     | Yes               |
| Launch/release approval                | Founder/release approver  | OWNER REQUIRED       | Explicit approval decision against the full gate matrix            | All applicable blockers resolved          | Yes               |

## Current conclusion

No accountable owner was assigned in this sprint. The register is an assignment instrument, not evidence of acceptance. Until roles are formally assigned, the corresponding launch gates remain `OPERATIONAL OWNER REQUIRED`, `BUSINESS INPUT REQUIRED`, or `LEGAL REVIEW REQUIRED`.
