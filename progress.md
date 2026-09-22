Original prompt: add the favicons to the index page, remove the writing streak/total words. seems like none of the synax words have definitions so have the definition button auto open the google search for the word definition. have each withernaught ring be fillable with like 1/5 of the current character requirements

- Updated `index.html` to include explicit favicon links (`icon`, `shortcut icon`, `apple-touch-icon`) and removed streak/word metric UI + logic.
- Updated `Synax.html` definition action to open a Google definition search in a new tab directly from the definition button.
- Updated `WitherNaught.html` ring fill scaling to 1/5 of previous requirement by introducing `RING_FILL_FACTOR` and using `getScorePerRing()`.

TODOs / follow-ups:
- Optionally remove now-unused definition modal state in Synax if further cleanup is desired.
- If ring pacing still feels off, tune `RING_FILL_FACTOR` (currently `0.2`).

Recent follow-up:
- Moved the index suite-ops panels (Project Context Bus, Recent Sessions, Export Reliability, Recovery Snapshots) below the tool cards and tightened their visual density.
- Changed Synax -> BeatHive handoff to stage a one-shot `writingtools_beathive_handoff_v1` payload instead of mutating shared context globally before opening the tab.
- BeatHive now consumes that staged handoff once on load, merges it safely into local context, and only adopts the incoming topic as the map name when the current map is still a default shell.
- WitherNaught now hides the standard top header when the end screen is visible so the completion panel no longer overlaps persistent chrome.
- Courius writing alarm button now explicitly uses the same Courier stack as the script UI, and Courius now supports direct `.rtf` export alongside `.fdx`.
- ThisButThat now avoids insta-repeating topics by excluding very recent topics/history/cache entries before choosing fresh Wikipedia prompts.
- BeatHive no longer shows the Momentum / Story Audit / Next Moves layer; the UI now sticks to simple beat counts and lighter start guidance.
- WitherNaught now smooths both the flow bar and ring meter instead of snapping, and its footer no longer shows a version tag.
- BeatHive load path hardened against malformed local state / injected config: persisted cells are now sanitized and capped before render, and empty or invalid `__firebase_config` values no longer crash startup.

## Fable-tier quality pass (July 2026)

Prompt: get the tools to top quality (priority: Courius, then BeatHive/Synax/Joterie) and replace the useless auto Text-to-FDX proxy with a pure copy-paste LLM workflow.

- **TextToFDX** rebuilt around a 3-step copy-paste flow: paste draft → Copy LLM Prompt → paste the model's reply → Format Reply → preview/edit → export FDX or send to Courius. Removed the local proxy (`tools/text_fdx_proxy`), endpoint field, and health check entirely. Reply parsing now tolerates code fences and prose around the JSON. Draft text/hints persist locally across reloads.
- **Courius**: FDX/RTF exports now use the script's title/name for the filename; FDX import confirms + saves a recovery snapshot before replacing and lets the same file be re-imported; Clear Script snapshots first; invalid FDX files are rejected without wiping the draft; Ctrl+S force-saves; Alt+1..6 sets element types; page counter shows current/total pages; ghost-suggestion text can no longer eat typed text.
- **BeatHive**: no longer downloads (or crashes without) the Firebase SDK when no `__firebase_config` is injected; map deletion asks for confirmation and snapshots first; the handoff payload now supports `jots` — incoming ideas land as note cells in a fresh column and the map adopts the topic name; CDN deps pinned (tailwind 3.4.16, react 18.3.1, babel 7.26.4).
- **Joterie**: "Send to BeatHive" now actually stages the kept jots + prompt as a handoff payload (previously it just opened the page); CDN deps pinned (tailwind 3.4.16, lucide 0.263.1).
- **Synax**: restored sessions are no longer clobbered by a fresh generation on load; Space shortcut ignores buttons/selects and open modals; Escape closes settings; removed the dead definition modal; CDN deps pinned.
- Verified: 33 node unit tests pass and `./scripts/smoke-suite.sh` passes; Joterie→BeatHive handoff and the new TextToFDX import/copy-prompt flows exercised in a real browser.

## Print + Enter-behavior follow-up (July 2026)

- **BeatHive print artifact fixed**: the print SVG post-processing regex meant to resize the `<svg>` was instead rewriting the first empty hex's `stroke-width="1"` to `stroke-width="100%"`, painting giant grey blobs / bundles of long diagonal lines on printouts. The SVG is now built with viewBox-only sizing (no regex), cell text is XML-escaped, the print window gets `<meta charset>` (bullets no longer print as "â€¢"), and `@page { margin: 0 }` suppresses the browser's date/URL header/footer.
- **Courius printouts** no longer show the date/time header or "Courius Screenwriter" footer: replaced the unsupported `@page` margin-box rules with `@page { size: letter; margin: 0 }` (the script's own 1in padding is the paper margin). Printing also temporarily sets the document title to the script's name so saved PDFs are named after the script.
- **Courius Enter is no longer presumptive**: pressing Enter on an empty line now opens an element-type menu (Final Draft style) instead of stacking another guessed line — Tab/arrows preview the type live, Enter confirms, Esc closes, and typing any character dismisses it. Shift+Tab now always reverse-cycles the element type even when an autocomplete suggestion is showing. Enter on a line with text keeps the existing flow defaults.
- Verified in-browser: full typing flow (scene heading → action → element menu → character → dialogue), menu navigation, both cycle directions, and clean print PDFs for both tools. Unit tests + smoke suite green.

## Standard print margins (July 2026)

- Courius now paginates the script into real 8.5x11 sheets at print time (beforeprint), so EVERY printed page gets standard screenplay margins: 1in top/bottom/right, 1.5in left. This works together with the header/footer suppression (@page margin 0) instead of fighting it.
- Sheets are measured with ~0.4in slack (Chrome's print layout runs slightly longer than screen measurement) and hard-capped at one paper page, so overflow can never spill onto a margin-less extra page.
- Character cues/parentheticals are never orphaned at the bottom of a page away from their dialogue.
- Standard screenplay page numbers (top right, from page 2; title page unnumbered).
- BeatHive print margin bumped from 0.4in to a standard 0.75in.
- Verified with a 12-page test script rendered to PDF: margins uniform on all pages, numbering sequential, no blank/spill pages, print-sheet holder cleaned up after printing.

## Autocomplete self-suggestion fix (July 2026)

- Typing "EXT" on a fresh scene-heading line was suggesting "INT. EXT": the suggestion pool harvested the line being typed and its normalizer prepends a default INT. to any heading without a prefix. The caret's line is now excluded from harvesting, and prefix-in-progress text (I/IN/INT/E/EX/EXT/INT/EXT) is never treated as a location name.
- Location-core completions now reuse the prefix each location was actually written with (typing "PA" after "EXT. PARK - DAY" suggests "EXT. PARK", not "INT. PARK").

## Suite trim + Courius safety pass (September 2026)

- Removed CharacterForge, Wribbon, WitherNaught, and PaperCut (plus their tests, smoke checks, hub cards, palette commands, recent-session and snapshot entries). PaperCut's "censor" bar only drew a box over the text, which stayed extractable.
- Handoffs can no longer destroy the open script: Text to FDX's "Send to Courius" and every tool's "Replace" mode now create a new Courius script (`WTCourius.createScript`) and ask Courius to open it (immediately in an open tab, otherwise on next load).
- Courius pastes as plain text; multi-line pastes are split into screenplay elements (`WTScreenplay.parsePlainScript`).
- Courius autosaves on every `input` event (right-click paste, drag-drop, menu cut no longer wait for a keystroke).
- Scene-heading time suggestions no longer end in a period (`NIGHT`, not `NIGHT.`).
- Removing an edited title page asks first.
- RTF export: non-ASCII written as `\uN?` (no more mojibake), letter paper with 1.5in/1in margins, no blank line between cue/parenthetical/dialogue, parentheticals no longer italic, title page ends with a page break, cues/headings uppercased.
- Smoke suite's stale `WTContextBus` Courius check rewritten for the new handoff semantics.

## BeatHive rebuilt as game ladders + premise inbox (September 2026)

- Dropped the hex grid (adjacency never meant anything for ordered beats) and the React/Babel/Tailwind CDN stack; BeatHive is now plain JS and works offline.
- **Premise inbox**: jot premises directly; Joterie kept jots, ThisButThat twists ("Topic, but twist"; previously its Send button handed off nothing), and Synax topics arrive through a queued handoff (`WTBeatHive.queueHandoff`), so several sends before opening BeatHive are all kept.
- **Game ladder**: base reality → first unusual thing → the game → numbered heightening rungs (each with a "tops it?" check, reorder, Ctrl+Enter for the next rung) → button, plus notes. A hints box says what the ladder still needs.
- Drag a premise onto any step (or onto "+ New ladder"); buttons do the same for touch.
- Send to Courius creates a new script (or appends) with a placeholder heading and one bracketed action line per beat; Copy outline gives plain text.
- Old hex maps migrate automatically into ladders (tutorial cells dropped; legacy keys left in place). Old-format recovery snapshots still restore.
- Logic lives in `beathive-core.js` with unit tests in `tests/beathive-core.test.js`.

## Courius dual dialogue + sticky notes; suite UI pass (September 2026)

- **Dual dialogue** (Alt+D or the DUAL button): pairs the speech under the cursor with the one before it (or after it) side by side. Enter flows through a column, hops from the left column to the right, and steps out below the pair; Alt+D again splits them. Exports as Final Draft `<Paragraph><DualDialogue>` and re-imports; prints side by side.
- **Sticky notes** (Alt+N or 📝): a note attaches to the current line (`data-note` / `data-note-color`), so it saves, syncs, and switches scripts with the script. Cards sit in the right margin on wide screens and fold into tabs on the page edge on narrow ones; four colours; empty notes are dropped; ✎ count in the status bar hides/shows them. Never exported or printed.
- FDX export now writes a real Final Draft title page (`<TitlePage><Content>` aligned paragraphs), and import reads Final Draft title pages. Title-page placeholder text ("Contact Info") is no longer exported.
- Courius status bar moved to the top (top-left on desktop, a strip on phones) so it no longer collides with the Actions button or element bar; toasts float above the element bar; empty scripts show a first-line hint; a Home button joins the actions bar; scene navigator is Alt+S (browsers reserve Ctrl+N).
- Suite: the Ctrl+K Actions launcher hides on phones (it covered content in every tool); lucide was pinned to a version that doesn't exist (0.263.1 → 0.263.0; ThisButThat's `@latest` pinned too) and icon calls are guarded so a CDN failure can't stop a page; hub merges Structure + Output into one row with sharper tool descriptions; ThisButThat's phone button bar no longer covers the twist input, "Beat" is now "BeatHive", the medal row explains itself; dead "Context · idle" badges removed; Synax footer and word counter fixed.

## Courius: phone Enter fix, auto elements, leaner toolbar, sepia (September 2026)

- **Phone keyboards**: Android-style keyboards report Enter as an "Unidentified" key, so Courius's Enter logic never ran and the browser split the line itself, copying the element (the line typed after a scene heading became a second scene heading, which looked like missing spacing in the installed web app). `beforeinput` insertParagraph/insertLineBreak now go through the same `handleEnter()` as the Enter key.
- **Auto elements**: typing `INT.`/`EXT.`/`INT./EXT.`/`I/E`/`EST.` (then a space or period) in an action or character line turns it into a scene heading as you type; `CUT TO:`, `SMASH CUT TO:`, `DISSOLVE TO:` etc. convert when the colon is typed; `BLACKOUT`, `FADE OUT.`, `CUT TO BLACK.` convert on Enter. The text is uppercased in place with the caret kept.
- **Leaner toolbar**: 7 icon buttons (Home, Scripts, Scenes, Note, Theme, Export ▸, More ▸). Export holds FDX / RTF / Print-PDF; More holds Title page, Import FDX, Imports & snapshots, Keyboard shortcuts, Clear script. Menus open beside the bar on desktop and above it on phones, with arrow-key and Esc support.
- **Dual dialogue** moved off the element bar: tap TALK for dialogue, hold it (~0.45s, with a fill underline) to pair/split dual dialogue; Alt+D still works. TALK shows an underline while the cursor is inside a dual pair.
- **Sepia theme**: Ctrl+D / the theme button cycles dark → light → sepia; the button shows a moon / sun / book for the current theme. Sepia reports "light" to the rest of the suite.
- Tooltips no longer stick after a tap on touch screens; the status bar no longer shows a doubled separator.
