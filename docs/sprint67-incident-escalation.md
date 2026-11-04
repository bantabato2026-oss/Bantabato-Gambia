# Bantabato — Sprint 67 Incident Escalation and Emergency Access

**Current state:** Founder-led operation; no formal incident owner, on-call route, emergency credential, or external access grant exists.

## Escalation order

1. Bubacarr Sillah, sole current active operator and provisional technical/recovery contact, records the event and stops the affected action.
2. Founder/release approval is required for any privileged, external, financial, or production-related decision.
3. A genuinely separate accepted reviewer is required for four-eyes actions; Bubacarr cannot approve his own high-risk action.
4. Privacy/legal, Trust & Safety, security, or provider escalation is required when the event involves member data, identity documents, safety, secrets, or external systems.

The order is a procedural recommendation, not evidence that these roles or channels have accepted responsibility.

## Emergency access rules

- Do not share credentials or bypass the secret manager.
- Do not grant the potential developer access during `DISCUSSION_ONLY — NOT_APPOINTED — NO_SYSTEM_ACCESS`.
- Use least privilege, a separate account, time-limited access, audit logging, and explicit scope if emergency access is later approved.
- Do not access production data to investigate staging.
- Preserve logs and redacted evidence; do not copy member data or identity documents into tickets or chat.
- Stop and escalate when environment identity, authorization, or reviewer independence is uncertain.

## Current gaps

Incident owner, backup owner, alert route, emergency-access approver, provider contacts, and recovery owner remain unassigned or unaccepted.
