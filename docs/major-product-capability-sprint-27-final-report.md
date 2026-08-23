# BANTABATO — Major Product Capability Sprint 27

## Multilingual, Voice-First & Low-Literacy Member Experience

Sprint 27 implements a centralized, English-first localization foundation with an explicit reviewed-language boundary, device-local persistent preference, safe English fallback, cross-tab refresh event, and root-level `lang` update. English is the only available language because no other dictionary has been approved or reviewed.

The member experience now includes reusable `LanguagePreferenceControl`, `PlainLanguagePanel`, and `VoiceGuidancePanel` components. The guidance component supports factual available, unavailable, playing, paused, stopped, failed, retry, and text-alternative states. The currently rendered state is truthfully voice unavailable: no audio is loaded, recorded, played, or sent. The written guidance remains the usable source of truth.

Onboarding now explains each step as what is needed, why it matters, and what to do next, while retaining three-step local-draft recovery and stale profile-save protection. Welcome, profile readiness, verification, Device & data, and notification language has been simplified with clear action, privacy, offline, and low-bandwidth boundaries. Verification, Family Circle, messages, safety, membership, and notifications retain their private-data, consent, staff-boundary, and premium-neutral protections.

Focused tests cover English fallback, unavailable storage, repeated preference changes, voice-state source contracts, text alternatives, onboarding/readiness/verification guidance, protected-data separation, notification language, and premium neutrality. The complete validation run passed: **388 tests across 80 files**, TypeScript, production build, and production dependency audit. Desktop and 375px mobile review were read-only. The mobile views confirmed legible stacked guidance, labels, controls, and recovery copy. No language preference, profile, document, message, notification, voice action, provider, real account, or browser mutation was performed.

## Product classification

The member experience is materially more usable for English-reading members with different literacy levels and connectivity conditions. It is **not multilingual in production**: reviewed, culturally validated language dictionaries, supported text-to-speech/audio assets, and authorized usability evaluation remain genuine external product gaps. Launch remains **NOT READY**.
