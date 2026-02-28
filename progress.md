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
