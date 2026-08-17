# Infrastructure, Ownership, Staging, Monitoring, and Backup/Restore Checkpoint

**Evidence date:** 17 August 2026  
**Scope:** This document covers only operational ownership, staging, privacy-safe monitoring, backup/restore, production health, and procedures. It does not start a new product phase, configure an external provider, or assert a public-beta launch.

## Verified evidence

| Area | Status | Evidence | Owner | Blocker |
| --- | --- | --- | --- | --- |
| Managed production domain | **READY WITH CONDITIONS** | The public HTTPS health route returned HTTP 200 on `bantabato-pkgkalne.manus.space`. | OWNER REQUIRED | Authenticated production-flow verification is not completed. |
| Health endpoint | **READY** | `GET /api/healthz` returns only `status`, `service`, and timestamp; it returned HTTP 200 with `Cache-Control: no-store`, `nosniff`, frame denial, referrer, permissions, and cross-origin headers. It works without credentials by design as a liveness route. | OWNER REQUIRED | External health polling/alert routing is not configured. |
| Monitoring | **NOT CONFIGURED** | No production error-tracking, health-monitoring, database/storage, or alerting destination was configured. | OWNER REQUIRED | Vendor, scrub policy, routing, retention, and test are absent. |
| Project scheduled work | **NOT CONFIGURED** | The project-level scheduler inventory returned zero jobs. | OWNER REQUIRED | No queue, expiry, reconciliation, or background failure monitor is deployed. |
| Primary technical owner | **NOT CONFIGURED** | No actual person was supplied or verified. | OWNER REQUIRED | Assignment required. |
| Backup technical owner | **NOT CONFIGURED** | No actual person was supplied or verified. | OWNER REQUIRED | Assignment required. |
| Trust & Safety owner | **NOT CONFIGURED** | Scoped application workflows exist but no person was supplied or verified. | OWNER REQUIRED | Assignment and coverage required. |
| Verification owner | **NOT CONFIGURED** | Verification workflows exist but no person was supplied or verified. | OWNER REQUIRED | Assignment and coverage required. |
| Support owner | **NOT CONFIGURED** | Ticketing workflows exist but no person was supplied or verified. | OWNER REQUIRED | Assignment and coverage required. |
| Billing/finance owner | **NOT CONFIGURED** | Provider-independent billing boundaries exist; no provider or finance owner is configured. | OWNER REQUIRED | Assignment, provider decision, and procedures required. |
| Security incident owner | **NOT CONFIGURED** | Incident model and runbooks exist but no person was supplied or verified. | OWNER REQUIRED | Assignment and escalation contact required. |
| Deployment/release owner | **NOT CONFIGURED** | Managed checkpoints exist but no release approver/rollback owner was supplied. | OWNER REQUIRED | Assignment and review separation required. |
| Staging environment | **NOT CONFIGURED** | No separate staging domain, database, storage namespace, OAuth application, or provider sandbox configuration was evidenced. | OWNER REQUIRED | Provision isolated staging. |
| Database backup | **NOT VERIFIED** | No managed backup provider, frequency, retention, encryption, location, or owner was supplied. | OWNER REQUIRED | BACKUP REQUIRED. |
| Database restore | **NOT VERIFIED** | No safe source, isolated restore target, or completed restore evidence was supplied. | OWNER REQUIRED | Controlled restore test required. |
| Storage backup | **NOT VERIFIED** | Private media controls are implemented; critical-media backup/lifecycle evidence was not supplied. | OWNER REQUIRED | Retention, recovery, and privacy review required. |
| Production database access | **READY WITH CONDITIONS** | Server access is environment-bound and application data paths are permission-checked. | OWNER REQUIRED | Named least-privilege human access and modification process must be established. |
| Deployment access | **READY WITH CONDITIONS** | Managed checkpoint and rollback mechanisms exist. | OWNER REQUIRED | Named deploy, approve, and rollback roles must be established. |
| Incident response | **READY WITH CONDITIONS** | Scoped incident records and operational runbooks are implemented. | OWNER REQUIRED | Named incident lead, backup, contact method, and exercise evidence absent. |
| Disaster recovery | **NOT VERIFIED** | Recovery procedures exist on paper. | OWNER REQUIRED | No completed tabletop or restore exercise. |
| Authenticated production smoke tests | **NOT CONFIGURED** | Test plan exists but no authorized production test-account evidence was supplied. | OWNER REQUIRED | Test accounts and controlled execution required. |

## Health endpoint privacy review

The health route is deliberately public and unauthenticated because an external monitor needs to check liveness without holding a member session. The response is limited to a static service label, `ok` status, and current timestamp. It does not query or assert database, storage, queue, payment, notification, provider, or member health; it does not expose secrets, keys, tokens, paths, hostnames, database credentials, private content, or sensitive configuration.

> A public HTTP 200 confirms only that the web process can serve this route. It does **not** confirm active monitoring, backup availability, database health, provider availability, or full production readiness.

## Single-person dependency register

| Responsibility | Current owner | Backup owner | Risk | Recommended mitigation |
| --- | --- | --- | --- | --- |
| Infrastructure and hosting | OWNER REQUIRED | OWNER REQUIRED | No verified accountable responder | Assign distinct primary and backup operators; document emergency contact and access-review cadence. |
| Database backup and restore | OWNER REQUIRED | OWNER REQUIRED | No verified backup or restoration authority | Assign primary and recovery owner; verify backup and run isolated restore. |
| Trust & Safety | OWNER REQUIRED | OWNER REQUIRED | Safety reports may lack timely staffed review | Assign lead and backup, establish coverage/escalation. |
| Verification | OWNER REQUIRED | OWNER REQUIRED | Manual verification workflow may stall | Assign scoped reviewers and backup coverage. |
| Support | OWNER REQUIRED | OWNER REQUIRED | Members may lack timely help | Assign support lead/backup and safe escalation procedure. |
| Security incident response | OWNER REQUIRED | OWNER REQUIRED | Delayed containment and communication | Assign incident lead/backup and conduct tabletop exercise. |
| Deployment/release/rollback | OWNER REQUIRED | OWNER REQUIRED | Unreviewed change or delayed recovery | Separate deploy/approve/rollback responsibility where practical. |
| Billing/provider operations | OWNER REQUIRED | OWNER REQUIRED | Future provider activation could lack reconciliation/refund authority | Assign only before provider activation. |
