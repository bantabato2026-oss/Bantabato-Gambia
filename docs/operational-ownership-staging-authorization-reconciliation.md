# BANTABATO — Operational Ownership and Staging Authorization Reconciliation

**Assignment basis:** The user explicitly confirmed **Bubacarr Sillah** as the primary technical founder and **Salifu Marong** as the backup/operations founder. No additional personal names have been provided. This record assigns no external access and activates no service.

| Required position | Status | Owner | Backup | Exact responsibility |
| --- | --- | --- | --- | --- |
| Primary Technical Owner | ASSIGNED | Bubacarr Sillah | Salifu Marong (operational backup) | Technical architecture, application development, infrastructure, security implementation, integrations, and technical release control. |
| Backup Technical Owner | ASSIGNED | Salifu Marong | Not provided | Operational continuity, operational decisions, escalation coordination, outreach, community coordination, and member support. Not automatically an independent technical approver. |
| Staging Owner | **UNASSIGNED — USER ACTION REQUIRED** | Not provided | Not provided | Approve stage resource creation, isolation review, account lifecycle, reset, and cleanup. |
| Database Owner | ASSIGNED | Bubacarr Sillah | Not provided | Stage MySQL/TiDB identity, migrations, least-privilege access, integrity, and restore coordination. |
| Backup/Restore Owner | ASSIGNED | Bubacarr Sillah | Not provided | Backup source, retention, recovery target, restore evidence, and rollback coordination. |
| Monitoring Owner | ASSIGNED | Bubacarr Sillah | Not provided | Privacy scrubbing, monitor/alert configuration, routing, retention, and safe test event. |
| Security Owner | ASSIGNED | Bubacarr Sillah | Not provided | Security implementation, access review, isolation testing, incident containment, and credential response. |
| Trust & Safety Owner | **UNASSIGNED — USER ACTION REQUIRED** | Not provided | Not provided | Controlled safety scenarios, escalation, restrictions, and safe evidence handling. |
| Verification Owner | **UNASSIGNED — USER ACTION REQUIRED** | Not provided | Not provided | Controlled verification workflows, fresh-auth scope, and member-safe outcome review. |
| Editorial Owner | **UNASSIGNED — USER ACTION REQUIRED** | Not provided | Not provided | Consent-scoped story review, editorial data controls, and independent publication workflow. |
| Support Owner | ASSIGNED | Salifu Marong | Not provided | Member-support intake, routing, support-test quality, and operational escalation. |
| Beta Test Owner | ASSIGNED | Bubacarr Sillah and Salifu Marong | Not provided | Fictional account register, staged smoke-test execution, cleanup, and evidence completion. |
| Release Owner | ASSIGNED | Bubacarr Sillah | Not provided | Candidate checkpoint, validation gates, migration decision, rollback authority, and release evidence. |
| Incident Response Owner | ASSIGNED | Bubacarr Sillah and Salifu Marong | Not provided | Severity decision, safe incident record, communications decision, recovery, and post-incident review. |

## Independence requirement

For a system-enforced four-eyes action, the same person must never act as both required reviewers. Bubacarr Sillah and Salifu Marong are distinct people, but role assignment does not override a product rule requiring a specific scope, fresh authentication, or independent approval. Unassigned Trust & Safety, verification, and editorial specialist roles remain required where the workflow requires them.

| Required non-production target | Current status | Authorization state |
| --- | --- | --- |
| Hosting and application origin | **NOT AVAILABLE** | No authorized staging provider/deployment target. |
| MySQL/TiDB database | **NOT AVAILABLE** | No isolated stage database identity/credential. |
| Private storage | **NOT AVAILABLE** | No stage-only storage namespace/credential. |
| OAuth/authentication | **NOT AVAILABLE** | No stage callback/client authorization. |
| Domain/TLS | **REQUIRES USER ACTION** | No approved hostname or DNS authority. |
| Sentry monitoring | **NOT AVAILABLE** | Connector disabled and no project authorization. |
| Backup and restore target | **NOT AVAILABLE** | No artifact or restore target. |
| Synthetic accounts | **NOT AVAILABLE** | No isolated target; stage owner remains unassigned. |

Staging authorization remains **BLOCKED — EXTERNAL ACTION REQUIRED** until all required separate resources exist and the unassigned specialist roles are resolved where required by the workflow.
