Original prompt: add the favicons to the index page, remove the writing streak/total words. seems like none of the synax words have definitions so have the definition button auto open the google search for the word definition. have each withernaught ring be fillable with like 1/5 of the current character requirements

- Updated `index.html` to include explicit favicon links (`icon`, `shortcut icon`, `apple-touch-icon`) and removed streak/word metric UI + logic.
- Updated `Synax.html` definition action to open a Google definition search in a new tab directly from the definition button.
- Updated `WitherNaught.html` ring fill scaling to 1/5 of previous requirement by introducing `RING_FILL_FACTOR` and using `getScorePerRing()`.

TODOs / follow-ups:
- Optionally remove now-unused definition modal state in Synax if further cleanup is desired.
- If ring pacing still feels off, tune `RING_FILL_FACTOR` (currently `0.2`).
