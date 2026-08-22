# BANTABATO — Controlled Workflow Verification & State-Integrity Design

## Test boundary

This pass uses **deterministic fictional values only inside Vitest fixtures and in-memory harnesses**. It does not insert accounts, invitations, media, documents, payment records, or safety cases into a production database. It does not call a payment, SMS, email, push, calling, identity, or monitoring provider.

## New executable evidence

| Concern | Deterministic test design | Expected safety boundary |
| --- | --- | --- |
| Member eligibility and photos | A synthetic member state advances through incomplete core details, fewer than five approvals, exactly five approvals, review, pause, withdrawal/deletion-like photo loss, and restriction. | Eligibility never becomes true before core data plus five approved photos; review/paused/restricted outcomes stay non-discoverable. |
| Discovery integrity | The same synthetic profile is evaluated against discovery status, visibility, deletion/restriction, and block exclusions. | A blocked, hidden, unavailable, or integrity-restricted profile remains excluded. |
| Photo capacity and parallel intent | A source-contract assertion supplements policy tests with the existing database transaction, `for update` lock, capacity check, random storage key, and post-write eligibility synchronization. | No test claims a live database concurrency execution; it verifies the implemented serializing boundary. |
| Four-eyes, invitations, and sessions | Existing service tests are extended with deterministic fake rows for self-approval/expired/duplicate decision guards and invitation expiry/replay denial. | Decisions require a separate authorized, active, fresh session. Audit assertions check only safe metadata. |
| Notifications | Existing idempotency and privacy-safe copy tests are extended around bounded queue retry/expiry source behavior where the in-memory query harness can represent the transition. | No provider delivery is claimed; notification payloads never use message/voice/profile source text. |
| Restriction/revocation | Existing readiness, Family Circle, recommendation, and integrity-policy flows are composed into a controlled assertion matrix rather than reconstructing a real multi-account runtime. | Block/report/restriction/consent/compatibility/integrity actions only remove access; manual restoration remains authorized. |
| Accessibility | Source contracts verify shared state semantics, visible focus/recovery paths, and reduced-motion/low-bandwidth rules. | Screen-reader, microphone, drawer/dialog, and live keyboard workflow execution remain blocked without authorized fictional accounts and an isolated environment. |

## Explicitly non-executable in this environment

End-to-end browser workflows involving accepted invitations, microphone capture, temporary signed-document access, staff decision mutation, actual session cookie revocation, and provider-backed retry need authorized fictional identities in an isolated environment. These remain **BLOCKED — EXTERNAL ACTION REQUIRED** and will not be presented as performed.
