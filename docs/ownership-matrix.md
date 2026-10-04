# Operational Ownership Matrix

No individual or team is marked assigned without evidence. Current statuses are intentionally incomplete.

| Role                      | Responsibility                                                      | Required authority                             | Escalation responsibility                  | Current status          |
| ------------------------- | ------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------ | ----------------------- |
| Technical Owner           | Application changes, release quality, schema compatibility          | Repository and deployment authority            | Escalate failed release or migration       | OWNER REQUIRED          |
| Infrastructure Owner      | Runtime, database, storage, staging, backups                        | Infrastructure and secret-management authority | Escalate outage and restore failure        | OWNER REQUIRED          |
| Security Owner            | Security review, secrets, access incidents, assessment coordination | Security review and incident authority         | Escalate suspected compromise              | OWNER REQUIRED          |
| Trust & Safety Owner      | Reports, verification, enforcement, safety escalation               | Authorized safety decision authority           | Escalate urgent safety cases               | OWNER REQUIRED          |
| Support Owner             | Member support queue, assignment, member-safe communication         | Support operations authority                   | Escalate safety or account-access concerns | OWNER REQUIRED          |
| Privacy/Legal Owner       | Retention, deletion, export, terms and privacy decisions            | Legal/policy decision authority                | Escalate unresolved legal decisions        | EXTERNAL OWNER REQUIRED |
| Backup/Recovery Owner     | Backup integrity, restore, rollback, recovery evidence              | Backup destination and recovery authority      | Escalate recovery failure                  | OWNER REQUIRED          |
| Monitoring/Incident Owner | Alert destinations, thresholds, incident coordination               | Monitoring and escalation authority            | Escalate critical service events           | OWNER REQUIRED          |

No owner is currently claimed as assigned. No external provider or person was contacted.
