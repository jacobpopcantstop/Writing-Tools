# Writing Tools Roadmap

## Vision
Make the suite feel like one cohesive creative system: shared context, faster cross-tool flow, smarter defaults, and resilient export behavior across desktop/mobile.

## Phase 1 (Now): Shared Context + Faster Handoffs
Status: Completed

Goals:
- Introduce one context payload across tools (`topic`, `tone`, `audience`, `constraints`).
- Enable quick handoff from index into ideation tools without retyping context.
- Seed topic-aware starts in at least two tools.

Delivered in this phase:
- `shared-context.js` with a stable API (`getContext`, `mergeContext`, `clearContext`, `subscribe`).
- New "Project Context Bus" panel on `index.html` with save/clear + launch actions.
- `Joterie` now pre-fills prompt from shared context and publishes prompt when session starts.
- `ThisButThat` now seeds topic fetch from shared context and publishes selected topic back.
- Cross-tool Courius transfer API now supports append/overwrite + persisted import history.
- Courius now renders per-source import badges and supports import recovery (append/replace).
- BeatHive, Wribbon, and WitherNaught now use persistent compact Courius mode controls (Append/Replace).
- QA pass completed across Courius + BeatHive + Wribbon + WitherNaught, including mobile/desktop validation for Courius import panel and restore flow.

## Phase 2 (Next): Command Palette + Session Navigation
Status: In progress

Goals:
- Add a global command palette (`Cmd/Ctrl+K`) and mobile quick-actions button.
- Jump between tools, open recent sessions, and run export actions from one place.

Scope:
- Shared command schema and keyboard bindings.
- Unified recent-session listing across tools.
- Common action IDs for theme switch, export, and "open with context".

Delivered so far in this phase:
- Added global command palette on `index.html` with `Cmd/Ctrl+K`.
- Added mobile quick-actions button to open the same palette.
- Added first command set: open core tools with context, save/clear context, and toggle theme.
- Added unified "recent sessions" commands from BeatHive, Wribbon, WitherNaught, and Courius local state.
- Added `shared-commands.js` as a reusable command schema source with stable action IDs.
- Added shared command palette injection script and wired it into Courius, BeatHive, Wribbon, and WitherNaught.
- Added common `export-current` command ID support via `WTToolActions.exportPrimary`.
- Extended shared palette support to Synax, ThisButThat, Joterie, and PaperCut.
- Added a visible recent-session browser on `index.html`, backed by shared recent-session discovery.
- Added broader common action IDs: suite home, recent hub, and tool-specific primary handoff actions where available.
- Added grouped/filterable recent-session browsing on the index with category filters and search.

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
