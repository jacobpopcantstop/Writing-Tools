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
