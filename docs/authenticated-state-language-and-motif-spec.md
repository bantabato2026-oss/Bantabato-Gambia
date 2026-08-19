# BANTABATO — Authenticated State Language & Root/Trust-Line Exploration

**Prepared:** 19 August 2026  
**Scope:** Shared authenticated route language and future visual-direction specification. The specification does not change server policy, authorization, matching, billing, safety, or consent rules.

## State language

| Applicable state | Member-safe language | Operational-safe language | Recovery boundary |
| --- | --- | --- | --- |
| Loading | “Loading your Bantabato experience…” | “Loading this operational workspace…” | No action required; screen-reader status announcement. |
| Empty | “There’s nothing here yet.” | “There’s nothing to review right now.” | Offer only contextually safe navigation or refresh. |
| Error | “Something went wrong. Please try again.” | “This workspace is unavailable right now. Please try again.” | Use retry only for safe query refetch or existing retry-capable operation. |
| Retry required | “Try again” | “Try again” | Never discard a safe local draft or mutation payload. |
| Unauthenticated | “Sign in to continue your Bantabato journey.” | “Sign in using an authorized Bantabato operational account.” | Start the existing sign-in flow only. |
| Unauthorized / restricted | “This area is currently unavailable.” | “This workspace is limited to authorized operational roles.” | Do not reveal permission names, staff rules, member IDs, or protected data. |
| Pending review | “Your request is being reviewed.” | “This item is awaiting review.” | Preserve domain-specific verification, photo, safety, or editorial semantics. |
| Offline | “You’re offline. We’ll reconnect when your connection returns.” | Not assumed for operations; reattempt on reconnection. | Do not queue private, safety, payment, verification, or moderation actions. |
| Recovering | “Your saved progress is still here.” | “Your draft remains available where this workspace supports it.” | Only existing device-local onboarding/profile/message drafts may be retained. |

## Recovery rules

Photo, profile, message, voice-note, notification, billing metadata, recommendation, and voluntary-story actions retain their existing domain recovery behavior. Shared state surfaces must not create a new retry path for a high-impact action whose server contract is not idempotent or whose input cannot safely be retained. A retry button therefore re-fetches read-only route data unless a dedicated domain control already owns recovery.

## Root/trust-line motif exploration

The root/trust-line remains a **subtle future direction**, not a global redesign. It may be expressed as a muted gold-to-forest line with one or two quiet nodes, never as a score, progress judgment, family graph, or public relationship map.

| Context | Suggested use | Constraint |
| --- | --- | --- |
| Logo-adjacent loading | One quiet line beneath the existing tree mark. | No motion under reduced-motion or low-bandwidth settings. |
| Section divider | A low-contrast line ending in one root node between editorial public sections. | Do not reduce text contrast or compete with content. |
| Success state | A static line and check icon in a state panel. | Never imply approval, match quality, or relationship outcome. |
| Connection moment | A private, static accent around an already-authorized mutual connection. | Never reveal another member’s private state. |
| Family Circle | A subtle permission boundary line in member-owned controls. | Never portray family membership or feedback publicly. |
| Success stories | A static footer detail in voluntary public copy. | Never add media, private data, or implied endorsement. |

No motif implementation is required in this checkpoint because the existing official logo and restrained orbit already satisfy the current visual system without adding unapproved cultural symbolism.
