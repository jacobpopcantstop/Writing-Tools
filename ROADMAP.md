# Writing Tools Roadmap

## Vision
Make the suite feel like one cohesive creative system: shared context, faster cross-tool flow, smarter defaults, and resilient export behavior across desktop/mobile.

## Phase 1 (Now): Shared Context + Faster Handoffs
Status: In progress

Goals:
- Introduce one context payload across tools (`topic`, `tone`, `audience`, `constraints`).
- Enable quick handoff from index into ideation tools without retyping context.
- Seed topic-aware starts in at least two tools.

Delivered in this phase:
- `shared-context.js` with a stable API (`getContext`, `mergeContext`, `clearContext`, `subscribe`).
- New "Project Context Bus" panel on `index.html` with save/clear + launch actions.
- `Joterie` now pre-fills prompt from shared context and publishes prompt when session starts.
- `ThisButThat` now seeds topic fetch from shared context and publishes selected topic back.

Next tasks (Phase 1 completion):
- Add a tiny "Context Last Updated" indicator in each integrated tool header.
- Wire shared context into `WitherNaught` and `BeatHive` side panels.
- Add one-click "Send to Courius" handoff from drafting tools.

## Phase 2 (Next): Command Palette + Session Navigation
Status: Planned

Goals:
- Add a global command palette (`Cmd/Ctrl+K`) and mobile quick-actions button.
- Jump between tools, open recent sessions, and run export actions from one place.

Scope:
- Shared command schema and keyboard bindings.
- Unified recent-session listing across tools.
- Common action IDs for theme switch, export, and "open with context".

## Phase 3 (Later): Adaptive Assistance + Structural Intelligence
Status: Planned

Goals:
- Make each tool context-aware and behaviorally smarter.
- Improve quality feedback without making flows heavyweight.

Scope:
- BeatHive structural diagnostics (spine, escalation, unresolved beats).
- Courius context-aware autocomplete from current script entities.
- WitherNaught progression tied to usable writing outcomes.

## Phase 4 (Later): Reliability + Platform Hardening
Status: Planned

Goals:
- Make exports, autosave, and offline flows resilient across browsers/devices.

Scope:
- Unified export service with fallback order + telemetry.
- Improved recovery snapshots and conflict-safe local persistence.
- PWA/offline shell for key tools.
