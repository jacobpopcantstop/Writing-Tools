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
- Expanded recent-session metadata coverage:
  - Added timestamped session ordering for Synax, Wribbon, and Courius drafts.
  - Fixed Joterie recent-session card counts and ISO timestamp handling.
  - Added PaperCut recent PDF session tracking (filename + page position).
- Completed audit-driven reliability fixes:
  - Wribbon Gmail handoff aligned with suite-safe fallback behavior.
  - WitherNaught removed duplicate global click-listener accumulation across renders.
  - Shared recent-session browser now reads latest WitherNaught entry correctly.
  - Courius/shared-context import path sanitizes HTML before insertion/persistence.

## QA Baseline (Now): Suite Smoke Checks
Status: Completed

Delivered:
- Added repeatable Playwright CLI smoke harness at `scripts/smoke-suite.sh`.
- Harness validates all core tools open and asserts zero console errors:
  - `index`, `Synax`, `ThisButThat`, `Joterie`, `BeatHive`, `Wribbon`, `WitherNaught`, `Courius`, `PaperCut`.
- Harness starts/stops a local static server automatically and exits non-zero on failure.

Delivered:
- Added critical interaction checks to `scripts/smoke-suite.sh` for:
  - Synax revisioned persistence path verification
  - Gmail compose handoff assertions in `ThisButThat`, `Joterie`, `Wribbon`, and `WitherNaught`
  - ThisButThat snapshot restore path verification
  - Joterie revisioned archive persistence path verification
  - Joterie snapshot restore path verification
  - WitherNaught revisioned prefs persistence path verification
  - BeatHive revisioned local persistence path verification
  - PaperCut revisioned recent-session persistence path verification
  - Courius transfer append/overwrite storage path verification
  - Courius parenthetical wrapper carryover regression check when cycling element types
  - WitherNaught ring progression after writing input
  - PaperCut page nav + rotate/delete control safety without an active PDF

## Phase 3 (Later): Adaptive Assistance + Structural Intelligence
Status: In progress

Goals:
- Make each tool context-aware and behaviorally smarter.
- Improve quality feedback without making flows heavyweight.

Scope:
- BeatHive structural diagnostics (spine, escalation, unresolved beats).
- Courius context-aware autocomplete from current script entities.
- WitherNaught progression tied to usable writing outcomes.

Delivered so far in this phase:
- BeatHive now includes a live "Story Audit" panel in the inspector:
  - Structure score (0-100) from core spine/archetype coverage.
  - Missing-spine detection (Normal World, First Weird Thing, Heightening, Ending).
  - Escalation depth signal and unresolved tension estimate from story tags.
  - Actionable diagnostic hints surfaced inline while mapping beats.
- Courius autocomplete now adapts to active screenplay structure:
  - Learns scene heading location cores + time tokens from the current draft.
  - Supports `INT./EXT. LOCATION -` time completion suggestions (`DAY.`, `NIGHT.`, etc.).
  - Learns character turn pairs and prioritizes likely alternating speakers.
  - Parenthetical wrapper punctuation is normalized away when cycling to non-parenthetical line types.
- WitherNaught ring progression now reflects usable output:
  - Score gain tied to net new words, completed sentences, and paragraph progression.
  - Removed passive time-based score inflation from the loop.
  - Ring status now indicates output progress (`Output Ring`), aligning progression with draft quality.

## Phase 4 (Later): Reliability + Platform Hardening
Status: In progress

Goals:
- Make exports, autosave, and offline flows resilient across browsers/devices.

Scope:
- Unified export service with fallback order + telemetry.
- Improved recovery snapshots and conflict-safe local persistence.
- PWA/offline shell for key tools.

Delivered so far in this phase:
- Added `shared-export.js` as a unified compose/export helper with:
  - Consistent Gmail compose flow across mobile + desktop.
  - Desktop fallback from Gmail compose to `mailto:` when popup/open fails.
  - Lightweight local telemetry of export transport outcomes (`writingtools_export_events_v1`).
- Integrated shared export compose handling into:
  - `ThisButThat`
  - `Joterie`
  - `Wribbon`
  - `WitherNaught`
- Added conflict-safe Courius persistence with recovery snapshots:
  - Revision-aware autosave (`writingtools_courius_revision_v1`) to avoid silent cross-tab overwrite.
  - Automatic local snapshots (`writingtools_courius_snapshots_v1`) on save conflict and remote sync.
  - Cross-tab storage sync now preserves a recoverable local draft before applying remote updates.
- Added in-app Courius recovery controls:
  - Imports panel now includes a "Recovery Snapshots" section.
  - Snapshot `Append`/`Replace` restore actions with timestamped previews.
  - One-click snapshot clearing for local reset.
- Added baseline PWA/offline shell support:
  - Introduced `manifest.webmanifest` and suite app icons (`icon-192.svg`, `icon-512.svg`).
  - Added shared service worker registration (`shared-pwa.js`) across the suite.
  - Added `sw.js` cache layer for core pages/shared scripts with offline fallback to suite home.
- Added export reliability visibility on suite home:
  - New "Export Reliability" panel on `index.html` reads `writingtools_export_events_v1`.
  - Surfaces 30-day event volume, fallback rate, top transport, and trimmed-Gmail count.
  - Includes recent transport timeline and local metric reset action.
- Added recovery visibility on suite home:
  - New "Recovery Snapshots" panel on `index.html` surfaces per-tool snapshot counts.
  - Includes quick open links and per-tool clear actions.
  - Includes one-click "Clear All" for local snapshot cleanup.
- Extended conflict-safe persistence beyond Courius:
  - Wribbon draft writes now use revision tracking (`writingtools_wribbon_revision_v1`).
  - Automatic Wribbon local snapshots (`writingtools_wribbon_snapshots_v1`) captured on save conflicts and remote sync.
  - Cross-tab Wribbon sync now preserves recoverable local text before applying remote draft updates.
  - ThisButThat cache/history writes now use revision tracking (`writingtools_thisbutthat_revision_v1`).
  - Automatic ThisButThat snapshots (`writingtools_thisbutthat_snapshots_v1`) are captured on save conflicts and remote sync.
  - Cross-tab ThisButThat sync now preserves a recoverable local state before applying remote updates.
  - ThisButThat history drawer now includes Recovery Snapshots controls with restore and clear actions.
  - Synax workspace state now uses revision tracking (`writingtools_synax_revision_v1`) across words, narrative context, canvas, and generator settings.
  - Automatic Synax snapshots (`writingtools_synax_snapshots_v1`) are captured on save conflicts and remote sync.
  - Cross-tab Synax sync now preserves a recoverable local state before applying remote updates.
  - Synax settings now include Recovery Snapshots controls with one-click restore and clear actions.
  - Joterie archives now use revision tracking (`writingtools_joterie_revision_v1`) with conflict-safe writes.
  - Automatic Joterie snapshots (`writingtools_joterie_snapshots_v1`) are captured on save conflict and remote sync.
  - Cross-tab Joterie archive sync now preserves local recoverability before applying remote updates.
  - Joterie archives view now includes Recovery Snapshots controls with restore and clear actions.
  - WitherNaught persisted state now uses revision tracking (`writingtools_withernaught_revision_v1`) across history, streak, and preferences.
  - Automatic WitherNaught snapshots (`writingtools_withernaught_snapshots_v1`) are captured on save conflict and remote sync.
  - Cross-tab WitherNaught sync now preserves local recoverability before applying remote updates.
  - BeatHive local state now uses revision tracking (`writingtools_beathive_revision_v1`) across sketches, Courius mode, and immersion-tip state.
  - Automatic BeatHive snapshots (`writingtools_beathive_snapshots_v1`) are captured on save conflict and remote sync.
  - Cross-tab BeatHive local sync now preserves local recoverability before applying remote updates.
  - PaperCut local state now uses revision tracking (`writingtools_papercut_revision_v1`) across recent-session metadata and theme state.
  - Automatic PaperCut snapshots (`writingtools_papercut_snapshots_v1`) are captured on save conflict and remote sync.
  - Cross-tab PaperCut sync now preserves local recoverability before applying remote updates.
