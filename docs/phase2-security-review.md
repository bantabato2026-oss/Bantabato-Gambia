# Phase 2 Security Review

## Addressed Controls

| Area | Phase 2 control |
|---|---|
| Verification documents | Documents remain stored by private storage key. Only a verification reviewer or platform administrator can request a short-lived signed link, and access creates an audit event. |
| Operational RBAC | Sensitive verification and Trust & Safety procedures require both the base administrator role and a scoped operational role. The configured platform owner is retained as a documented legacy `platform_admin` fallback; other staff need explicit active scopes. |
| Internal case data | Internal notes are stored in a separate internal case-note structure. Member verification status responses return only safe member messages and exclude reviewer notes, review reasons, storage keys, and signed document URLs. |
| State transitions | Verification actions are accepted only from submitted, in-review, or escalated states. Report workflow actions are limited to proportionate warnings, discovery restriction, and temporary suspension. |
| Audit events | Operational claims, decisions, family-permission actions, creation of internal notes, and verification-document access create audit records without logging raw files, passwords, OTPs, or sensitive document contents. |
| High-impact actions | Permanent bans, permanent deletion, sensitive exports, highly restricted document access, and critical security settings are not exposed as routine moderator actions. They are marked for a future dual-authorization control. |

## Remaining Operational Risks

The platform currently uses an owner-based legacy fallback for `platform_admin` while explicit staff scope management is not yet exposed through an administrator interface. Before onboarding operational staff, the next security-focused module should add controlled role grants and revocations, second-review workflows for irreversible actions, rate limits for document uploads and safety reports, malware scanning for uploaded files, retention/deletion schedules for identity documents, and production monitoring/alerting.
