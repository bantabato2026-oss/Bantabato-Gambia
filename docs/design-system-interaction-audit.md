# BANTABATO — Design System & Interaction Audit

**Prepared:** 18 August 2026  
**Scope:** Internal visual and interaction polish only. No product rule, connector, provider, deployment, payment, discovery, safety, consent, verification, family, billing, five-photo, or success-story governance rule is changed by this audit.

## Audit findings

| Area | Evidence | Finding | Priority |
| --- | --- | --- | --- |
| Tokens | `index.css` contains the established forest/cream/gold palette, fonts, radii, shadows, and several literal transition durations in one shared stylesheet. | The visual language is coherent, but semantic motion, elevation, radius, and focus tokens are not centrally named. | **P1** |
| Motion | Existing `PageEnter`, `Reveal`, `Stagger`, branded route loading, CSS transform/opacity animation, and reduced-motion media query are in place. | The foundations are sound. Introduce named micro/standard/emphasis tokens and let the existing low-bandwidth preference suppress nonessential effects. | **P1** |
| Loading | Client source uses 24 `animate-pulse` occurrences across 26 modules with several hand-authored skeleton variants. | Loading is generally present but duplicated. A small shared skeleton/state primitive will give route authors accessible labels and stable layouts without a framework. | **P0/P1** |
| Empty, error, success | Source contains eight `empty-state` uses, 22 `toast.success` and 22 `toast.error` uses, and a protected global error boundary. | Copy is mostly clear, but empty and error structures remain hand-authored and the public success-story query needs an explicit retry path instead of treating an error as empty. | **P0** |
| Focus and keyboard | Branded logo focus styling exists; buttons and links are styled consistently. | A shared visible focus treatment is not applied at the base layer to every interactive control. | **P0** |
| Mobile | Public routes were reviewed at 375px: no observed horizontal overflow, headings wrap, menus are touch-accessible, and the footer remains readable. The member shell already includes a mobile bottom navigation. | The public system is mobile-capable. Apply the shared state primitive with large action targets, but do not claim authenticated device execution without authorized accounts. | **P1** |
| Low bandwidth | Existing device settings persist a data-use preference, but the preference is currently local to the device page. | The existing preference should also govern nonessential visual motion and backdrop/filter effects app-wide. | **P1** |
| Brand system | Public routes share the official logo, forest/cream/gold palette, Playfair/DM Sans pairing, root language, and a restrained orbit motif. | Brand foundations are consistent. The audit does not add unapproved cultural imagery or overuse the logo. A reusable root-line motif can remain a future enhancement. | **P2** |
| Admin/member coverage | Authenticated member and administration routes have established shell, cards, state gates, touch controls, and operation-specific guards. | Actual authenticated keyboard/screen-reader/voice/photo workflow execution remains blocked without authorized synthetic accounts. | **Blocked evidence** |

## Consolidation targets

| Target | Current duplication | Safe consolidation |
| --- | --- | --- |
| State surfaces | Route-specific dashed empty panels, manual skeletons, and query error prose | `StatePanel` variants for empty, error, success, and loading, with explicit aria-live roles and optional recovery action. |
| Interaction tokens | Repeated `160ms`, several direct easings, literal card shadows/radii | Named CSS variables for micro, standard, emphasis, easing, radius, elevation, and focus ring. |
| Preference-aware motion | CSS honours reduced motion, but the persisted low-bandwidth choice is not reflected app-wide | A lightweight preference bridge that adds a document data attribute; CSS suppresses only nonessential effects. |
| Global recovery | The error boundary owns a bespoke layout and button | Reuse `StatePanel` to make global and route-level failure recovery consistent. |

## Prioritized backlog

| Priority | Item | Decision |
| --- | --- | --- |
| **P0** | Visible keyboard focus, accessible state panel, retry-safe public query error, labelled route loading | Implement now. |
| **P1** | Central motion/elevation/radius tokens, low-bandwidth visual suppression, representative public state integration | Implement now. |
| **P2** | Shared root/trust-line motif, page-specific editorial composition variation, simplified primary wordmark/heritage-seal system | Document only; requires approved brand direction beyond the supplied official logo. |
| **P3** | Voice waveform refinement, broader card/form microinteraction sweep, extra illustration/photography layers, per-module animation choreography | Do not implement in this checkpoint. |

## Non-goals

This checkpoint does not introduce a heavy animation library, change matching or compatibility logic, promote provider-independent billing to live payment, alter safety or moderation semantics, create stored user content, activate a connector, send telemetry, modify DNS, deploy infrastructure, create a Phase 16, or claim launch readiness.
