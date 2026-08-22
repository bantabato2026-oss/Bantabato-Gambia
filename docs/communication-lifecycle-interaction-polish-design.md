# BANTABATO — Communication Lifecycle & Interaction Polish Design

## Duplicate-resistant message and voice retry contract

Each text or voice send attempt receives a client-generated opaque request key. The same key is retained with the local text draft or local voice preview until the server confirms a result or the member deliberately discards the draft. The server scopes idempotency lookup to the **conversation and sender**, returns the already-created message for a repeated key, and continues to perform normal mutual-match, conversation-status, block, safety, ownership, file-validation, and storage checks before creation.

| Local state | Member view | Request-key rule |
| --- | --- | --- |
| Composing / preview | Draft is private to the current device/page. | Generate one opaque request key. |
| Sending / uploading | Clear “Sending…” status; submit control disabled. | Send the same request key. |
| Failed / offline | Draft or preview remains available with member-initiated retry. | Preserve the same request key. |
| Retrying | Clear “Trying again…” status. | Reuse the same request key. |
| Sent | Existing message queries refresh and local content clears. | Clear the local request key only after confirmed result. |
| Delete / cancel | Local draft/preview is removed. | Discard its request key; no server retry occurs. |

The key does not carry text, audio, a member identifier, provider metadata, or any public signal. It does not alter existing `retryOfMessageId` behavior for a server-recorded failed message and does not make a paused, blocked, reported, restricted, or unauthorized conversation sendable.

## Route state design

Verification, Family Circle, Family participant, and Billing use `StateSkeleton` for read loading and `StatePanel` for recoverable read errors. Verification exposes only member-safe status language: not started, document capture unavailable, submitted, under review, approved, rejected/resubmission available, and restricted. Family explanations distinguish pending invitation, expiration, verification, revoked/restricted/removed access, acknowledgment, and feedback without exposing private member data or internal safety details. Billing labels distinguish catalog availability and provider state without claiming a credential, sandbox, or live payment exists.

## Interaction and accessibility

Successful send and successful manual verification may use existing transform/opacity reveal styles only. No status outcome uses celebratory or rank-like motion. Retry, status, error, and loading content use shared live-region primitives. The manual accessibility matrix adds keyboard-only navigation, screen reader, microphone permission, voice recording/playback, message send/retry, offline recovery, dialog focus, and mobile navigation rows as **BLOCKED — EXTERNAL ACTION REQUIRED** unless safe automated evidence exists.
