# Writing Tools Streamline — Design

**Date:** 2026-06-01
**Repo:** Writing-Tools (static, 100% client-side HTML/CSS/JS, no backend, no LLM API)
**Scope:** Three coordinated streams shipped under one spec, sequenced in the implementation plan.

## Goals

1. Remove the heavy global "context bus" that travels with every tool; keep only the plumbing that earns its place.
2. Make Courius screenplay exports (and print/PDF) match the US spec-script standard exactly, with standardized text sizing and zero leakage of cross-tool artifacts.
3. Rebuild CharacterForge from a randomizer into a Socratic interview that makes the writer think, not roll dice.

## Non-goals

- No backend, build step, or framework. Everything stays static files served as-is.
- No LLM/API integration (CharacterForge question bank is curated and offline).
- No unrelated refactors of tools beyond removing context-bus wiring.

---

## Stream A — Context bus → focused modules

### Problem
`shared-context.js` (279 lines) bundles three unrelated concerns:
1. A global `topic/tone/audience/constraints` context object (`getContext`/`setContext`/`mergeContext`/`clearContext`/`subscribe`, key `writingtools_context_v1`). **This is the "drag" the user dislikes.**
2. Courius transfer (`appendToCourius`/`overwriteCourius`/`transferToCourius`, sanitize, import header, import history). **This is the real value.**
3. A generic `notify()` toast utility used by nearly every tool.

Bus consumers today: `index.html`, `Courius.html`, `CharacterForge.html`, `Joterie.html`, `ThisButThat.html`, `Wribbon.html`, `WitherNaught.html`, `BeatHive.html`, `Synax.html`.

### Decision
Only Courius is a cross-tool destination. The global context object is deleted. The Courius handoff and the toast utility survive as two small, single-purpose modules.

### Components
- **`shared-courius.js`** → `window.WTCourius`
  - `append(html, source)` and `overwrite(html, source)` (thin wrappers over a private `transfer(html, source, mode)`).
  - Moves verbatim: `sanitizeCouriusPayload`, `buildImportHeader`, import-history read/write (`writingtools_courius_imports_v1`), compare-and-retry against `writingtools_courius_storage` + `writingtools_courius_revision_v1`.
  - No "context" concept anywhere. ~140 lines.
  - On load, removes the stale `writingtools_context_v1` key (one-time cleanup; that key held only volatile cross-tool hints, so no data loss).
- **`shared-toast.js`** → `window.WTToast.notify(message, type)`
  - The `ensureToastNode` + `notify` logic, lifted as-is. ~50 lines.

### Per-tool cleanup
- **Wribbon, WitherNaught, Synax:** remove `syncContext()`, `subscribe()` listeners, and any "context tip" UI. Keep `notify` calls (rewire to `WTToast.notify`). Keep their Send-to-Courius button where present (rewire `bus.appendToCourius` → `WTCourius.append`); **drop** the `bus.mergeContext({...})` calls that previously seeded global context.
- **Courius:** remove `updateContextTip()` and its `subscribe()` registration; it remains the receiver (reads `writingtools_courius_storage`).
- **CharacterForge:** `useCardInContext()` and `inferContext()` are removed outright (the whole tool is replaced in Stream C); `sendCardToCourius` is superseded by the new sheet export.
- **index.html / shared-tool-manifest.js:** drop any context-bus references.
- Every tool replaces `window.WTContextBus.notify` with `window.WTToast.notify`, and `<script src="shared-context.js">` with `<script src="shared-courius.js">` + `<script src="shared-toast.js">` (only on tools that actually need each).

### Result
~279 lines of mixed concerns → two focused files (~140 + ~50). Five tools get simpler. Nothing crosses tool boundaries except an explicit, user-triggered "Send to Courius".

---

## Stream B — Courius exports to US spec-script standard

### Standard (US spec script, Final Draft default)
US Letter. Margins: 1" top, 1" bottom, 1" right, 1.5" left. 12pt Courier throughout — **including the title page and page numbers**. Single-spaced, one blank line between elements.

Element placement, measured **from the page edge**, and the corresponding RTF `\li`/`\ri` (twips, 1440/inch, measured **from the 1.5" left margin / 1" right margin**):

| Element | From page edge | RTF `\li` | RTF `\ri` | Align | Bold/Italic |
|---|---|---|---|---|---|
| Scene Heading | 1.5" L → 7.5" R | `\li0` | `\ri0` | left (`\ql`) | **plain** (per decision) |
| Action | 1.5" L → 7.5" R | `\li0` | `\ri0` | left (`\ql`) | plain |
| Character | 3.7" L | `\li3168` | `\ri0` | left | plain |
| Parenthetical | 3.1" L → 5.5" R | `\li2304` | `\ri2880` | left | italic |
| Dialogue | 2.5" L → 6.0" R | `\li1440` | `\ri2160` | left | plain |
| Transition | text ends at 7.5" R | `\li0` | `\ri0` | right (`\qr`) | plain |

Spacing: `\sa240` (one 12pt line) after each element, `\sb0`. (Replaces the current inconsistent `\sa`/`\sb` mix.)

### Fixes vs. current code (`Courius.html`)
1. **Standardized 12pt sizing.** `buildRtfDocument` currently emits title `\fs32` (16pt), author `\fs24`, contact `\fs20` (10pt). All become `\fs24` (12pt). The `@page` page-number counter is `font-size: 16pt` (line ~374) → change to 12pt.
2. **Alignment.** Current code justifies scene headings and action (`\qj`). Screenplays are left-aligned → `\ql`. Transition → `\qr`.
3. **Indents.** Current `\li` values (character `\li2160`, dialogue `\li1440`/`\ri1080`, parenthetical `\li1800`, transition `\li2880`) are replaced with the table above.
4. **Weight.** Remove `\b` from character and scene-heading prefixes (plain per spec). Keep parenthetical italic.
5. **Artifact leak (bug).** `downloadFDX()` and `buildRtfDocument()` loop `EDITOR.children` and only skip `.title-page-container`. Import-marker divs have class `"action courius-import-marker"`, so they currently fall through to the Action branch and `getPureText()` pulls badge text — e.g. `"WRIBBON imported 1/2/2026"` lands as a stray action line in every exported `.fdx`/`.rtf`. **Fix:** both builders skip any element with class `courius-import-marker` (and the snapshot markers at lines ~962–965). Verify no other injected artifact (snapshot reason blocks, context-source badges) survives into FDX/RTF.
6. **FDX.** Keep the element-type → FDX `Type` mapping (Final Draft applies its own template layout from the type). The substantive FDX fix is the artifact-strip in #5; verify the type mapping covers all six element classes.

### Print / PDF
- `@media print` already hides `.courius-import-marker`, `.floating-controls`, `#save-bar`, `.scene-nav`, `.help-modal`, and the `index.html` suite link. Keep this; extend the marker hide to snapshot markers if they share a different class.
- Page-number counter font-size → 12pt Courier (sizing consistency).
- Confirm via print preview that no tool tab/icon/badge/import artifact renders in the PDF.

### Title page
Centered, all 12pt Courier: title (optionally underlined per spec), author below, contact bottom-left. No size variation.

---

## Stream C — CharacterForge → Socratic interview

### Problem
The current tool is a word-bank randomizer (`noun`/`adjective`/role arrays + dice/generate UI). It does the thinking *for* the writer and inspires drag-and-drop, not reflection.

### Decision
Replace it with a one-question-at-a-time Socratic interview driven by a curated, offline question bank. No randomization, no presets, no API.

### Components
- **Question bank** — a single JS object grouped into 6 themes: **Wound, Fear, Contradiction, Desire, Mask, Relationships.** Each theme holds 4–8 open, probing questions (e.g. "What is your character certain they're right about — and wrong?"). Authored for quality; the writer answers in prose.
- **Interview UI** — shows one question + one prose answer textarea. "Next" advances; "Back" revisits. Answering is encouraged but skippable. A simple progress indicator (theme x of 6).
- **Light branching (deterministic, offline)** — a question may declare follow-ups triggered by simple rules: answer length > N characters, or a keyword match against the answer. No AI; fully reproducible.
- **Output** — an essay-style character sheet assembled from the writer's own words: theme headings followed by their answers as prose (not a stat block). Rendered in-tool and exportable.
- **Character library** — saved to localStorage under a per-character key. Operations: list, open, rename, delete, duplicate. (New key namespace, e.g. `writingtools_characterforge_v2`.)
- **Send to Courius** — one button → `WTCourius.append(formattedSheet, 'CharacterForge')`. Per Stream B, the import marker never leaks into FDX/RTF/print.

### Removed
- All randomizer word-bank arrays and dice/generate UI.
- `useCardInContext`, `inferContext`, and card-based state from the old build.

---

## Data flow summary

```
Tool (Wribbon / WitherNaught / Synax / CharacterForge)
   └── user clicks "Send to Courius"
        └── WTCourius.append(sanitizedHtml, sourceLabel)
             └── writes writingtools_courius_storage (+ import history)
Courius
   ├── reads writingtools_courius_storage on load
   ├── export RTF/FDX  → skips .courius-import-marker + snapshot markers
   └── print/PDF       → @media print hides all non-script chrome + markers
WTToast.notify(...)  ← shared by all tools (UI only, no state)
```

## Error handling
- `WTCourius` keeps the existing 3-try compare-and-retry against the revision key for cross-tab safety; on failure returns `false` and the caller shows a `WTToast.notify(..., 'error')`.
- Export builders guard against an empty editor (no script elements → no file, with a toast).
- Interview tolerates missing/partial answers; the sheet renders only answered sections.

## Testing
- **Stream A:** load each tool, confirm no console errors, no orphaned context UI, toasts still fire, Send-to-Courius still lands. Confirm `writingtools_context_v1` is removed.
- **Stream B:** author a one-scene script containing each element type + one imported block; export FDX and RTF; open in Final Draft (or verify RTF in Word) — confirm 12pt Courier throughout, correct indents/alignment, and **no "imported …" artifact lines**. Print to PDF and confirm only the script + page numbers appear.
- **Stream C:** run a full interview, verify branching triggers, save/rename/duplicate/delete a character, export sheet to Courius and confirm it arrives clean and prints clean.

## Sequencing (for the implementation plan)
1. Stream A (clean foundation: `WTCourius` + `WTToast`, strip global bus).
2. Stream B (export correctness on top of the clean handoff).
3. Stream C (CharacterForge rebuild, consuming `WTCourius.append`).
