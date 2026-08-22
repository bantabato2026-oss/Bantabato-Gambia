# BANTABATO — Concurrency Assurance & Administration Experience Design

## Concurrent request contract

Each private text or voice operation continues to carry a client-generated opaque request key scoped by sender and conversation. The server derives a **server-only HMAC fingerprint** from the normalized text payload or validated voice payload using the existing server cookie secret. The fingerprint is never returned to clients, never placed in a notification, audit metadata, event metadata, storage path, or public API result, and cannot be used as a relationship or compatibility signal.

| Request-key outcome | Server behavior | Audit/event evidence |
| --- | --- | --- |
| No record exists | Create one message, then one normal message/voice event, interaction signal, and recipient notification. | Existing `message_sent` or `voice_note_sent` event. |
| Same key, same fingerprint | Return the original logical result without repeat insertion, signal, touch, or notification. | Content-free `message_deduplicated` event with message type and `same_request_key` outcome. |
| Same key, different fingerprint | Reject with a member-safe conflict error; do not create, send, or notify. | Content-free `message_request_conflict` event with message type and `different_payload` outcome. |
| Simultaneous same key | Database unique constraint allows one insert; collision handler reads original, verifies fingerprint, and returns it. | Exactly one normal creation event; losing request records deduplication evidence. |
| Different keys | Each valid operation remains distinct after normal authorization and rate controls. | One normal event per created operation. |

The voice storage object path continues to use the opaque request key. A same-key retry writes the same private object path if storage is reached during a concurrent race and results in one logical message record; it never creates a second public/private media record. A different-payload same-key request is rejected before storage use where a pre-existing message is found. No existing message text or voice bytes are included in audit evidence.

## Administration state language

Administration surfaces must use existing `StateSkeleton` and `StatePanel` for route-level loading/error/retry. State copy describes **operational availability**, **scope**, **pending work**, **required independent approval**, **expiry**, or **recovery**, rather than member value, severity scores, automated sanctions, or private evidence.

| State | Operational language rule |
| --- | --- |
| Loading | “Loading this operational workspace…” or module-specific neutral label. |
| Empty | State that no matching operational record is available; never imply no risk or no member history. |
| Error/retry | Explain that no new result was shown and retry only the read query. |
| Permission denied | Explain the workspace is limited to the required operational scope without exposing underlying records. |
| Pending/claimed | Describe assigned/unassigned review and next required action. |
| Approval/four-eyes | Explain independent approval requirement and prevent self-approval. |
| Expired/revoked/restricted | State that the operational path is unavailable and show a safe, scoped recovery route. |

## Responsive and accessibility design

Desktop operations may retain dense review cards/tables. Tablet and mobile state panels, action groups, case metadata, and approval controls must stack and wrap without horizontal overflow. Existing keyboard-native controls and visible focus styles remain the default. The manual accessibility matrix will add explicit blocked rows for concurrent retry, staff review, approval, dialogs/drawers, tables, keyboard navigation, and reduced-motion/low-bandwidth behavior; no unavailable manual execution will be claimed.
