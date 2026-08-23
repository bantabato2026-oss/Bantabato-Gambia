# Sprint 27 Language Experience Audit

## Review boundary

The audit read existing member-facing architecture and captured public-safe, authenticated-shell desktop and 375px mobile views for welcome, onboarding, Command Center, discovery, messages, Family Circle, verification, and notifications. The preview account had no member profile, so most protected routes correctly showed factual prerequisite states. No profile, setting, language preference, notification, document, message, voice action, invitation, or browser mutation was performed.

## Existing foundations

The product already has a three-step mobile onboarding flow with local-draft recovery, plain prerequisite panels, responsive navigation, low-data preference propagation, factual offline copy, manual-verification statuses, Family Circle privacy language, mutually gated messaging, and an English `locale` field in notification settings. The welcome route also has an explicit text-first statement that audio guidance is not connected.

## Gaps selected for implementation

Language remains component-scattered, and the existing `locale` setting is not a global persistent interface preference. Several member explanations use internal or dense phrases such as server-authoritative requirements, provider-ready, and eligibility-specific language. Member routes lack a reusable, truthful voice-guidance state component; high-value onboarding and readiness explanations need a consistent plain-language `what is needed / why it matters / what to do` format. The notification view should use simpler, consistent category terms without exposing message content or delivery-provider claims.

## Non-negotiable boundaries

Only English is currently defined and may be presented as available. This sprint must not fabricate translations, audio, voice execution, real member data, external translation or speech services, or browser/screen-reader execution. Localization and voice-guidance state may not send, expose, cache, or infer private profiles, messages, documents, Family Circle data, staff notes, safety information, or protected characteristics. Premium cannot control access to language, accessibility, safety, privacy, verification, eligibility, or communication.

## Final visual review

Read-only desktop and 375px mobile captures covered the welcome, onboarding, Device & data, verification, and notification routes. Mobile confirms the language preference, text-first voice-unavailable status, clear text alternative, onboarding `what / why / next` guidance, touch-sized controls, visible labels, and stacked recovery-oriented content all remain readable without an animation-dependent instruction. The preview account still had no profile, so verification correctly showed the profile prerequisite rather than a fabricated document status. The desktop capture initially remained in its existing loading skeleton while its protected queries resolved; no mutation or retry action was taken. No actual language change, voice playback, audio recording, profile save, notification preference change, message, document, Family Circle action, or screen-reader execution was performed.
