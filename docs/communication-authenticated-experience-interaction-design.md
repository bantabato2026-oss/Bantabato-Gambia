# BANTABATO — Communication & Authenticated Experience Interaction Design

## Voice-note lifecycle

The client presents an explicit local lifecycle while preserving the existing private upload procedure and server enforcement. The waveform is **visual feedback only**: it is a lightweight set of decorative bars driven by client recording time, never persisted, analyzed, ranked, or used for compatibility or engagement.

| Lifecycle state | Member-facing presentation | Safe recovery |
| --- | --- | --- |
| Idle | “Record voice note” with three-minute limit and privacy explanation. | Start only after explicit button activation. |
| Recording | Elapsed time, dynamic visual waveform, stop, pause, cancel. | Stop creates a local preview; cancel discards local chunks. |
| Paused | Static waveform and elapsed duration. | Resume or stop; no hidden recording. |
| Preview | Native private local playback plus surrounding time/progress feedback. | Delete or send; draft remains only in page memory. |
| Uploading | “Sending your private voice note…” state; send control disabled. | Do not automatically replay a request. |
| Sent | Existing success toast and query invalidation. | Preview is cleared only after existing mutation success. |
| Upload failed/network interrupted | Preview stays available with contextual retry action. | Member initiates retry after reconnection. |
| Permission denied/recording failed | Factual microphone explanation and retry control. | Try again or choose text; no technical exception exposed. |
| Restricted/disabled | Factual unavailable state based only on current client/connection context or server-safe mutation message. | Use text where permitted; never disclose moderation internals. |
| Deleted | Existing owner-only deletion remains server controlled. | No undo claim; a new recording can be made. |

## Messaging and discovery recovery

Message thread loading, message-list failure, private voice URL failure, and curated discovery loading/failure use shared `StateSkeleton`/`StatePanel`. Retry controls only refetch reads. Composer sends and voice uploads are never auto-retried. Empty states retain their existing mutual-interest and privacy guidance.

## Accessibility and mobile rules

All buttons retain text or accessible labels, status updates use `role="status"` or the existing shared state semantics, the decorative waveform is `aria-hidden`, and playback progress is exposed as a readable progress bar. Controls remain in normal keyboard order. On mobile, recording/preview controls wrap instead of overflow; composer status stays above controls and does not cover the mobile bottom navigation. Reduced-motion and low-bandwidth styles remove waveform animation while retaining the same state information.

## Scope controls

No live calling, transcription, external audio analysis, provider configuration, new media storage behavior, message rank, compatibility influence, popularity signal, private-media preloading, or server permission change is part of this design.
