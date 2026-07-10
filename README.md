# Writing Tools

A browser-based suite of writing apps that now operates as one connected local system: shared context, cross-tool handoffs, recovery snapshots, export telemetry, and a suitewide smoke test.

## Apps

- `index.html`: suite hub, recent sessions, export reliability, recovery snapshots
- `CharacterForge.html`: character creation from core traits, goal remixing, and story-ready variants
- `Synax.html`: serendipity + concept generation
- `ThisButThat.html`: twist-premise generation
- `Joterie.html`: short-burst ideation and harvests
- `BeatHive.html`: beat mapping and structural diagnostics
- `WitherNaught.html`: pressure drafting loop
- `Wribbon.html`: drafting/export workflow
- `Courius.html`: screenplay editor
- `TextToFDX.html`: copy-paste LLM workflow for raw text to editable FDX preview/export
- `PaperCut.html`: PDF reading/markup flow

## Run Locally

Serve the repo root as static files:

```bash
python3 -m http.server 8017
```

Then open:

```text
http://127.0.0.1:8017/index.html
```

## Text to FDX Workflow

Text to FDX needs no API keys and no server. The whole flow is copy-paste:

1. Paste (or upload) your rough draft in step 1 and click **Copy LLM Prompt**.
2. Paste the prompt into ChatGPT, Gemini, Claude, or any other model and run it.
3. Copy the model's whole reply and paste it into the step 2 box, then click **Format Reply**. Code fences and extra chatter around the JSON are stripped automatically.
4. Review and edit the formatted blocks, then download `.fdx` or send the script straight to Courius.

Your draft text and hints persist locally between visits, so a page reload never loses step 1.

## Smoke Run

Primary regression pass:

```bash
./scripts/smoke-suite.sh
```

What it checks:

- all core apps load
- console stays clean
- Gmail/export handoffs still open valid compose targets
- revisioned persistence still writes
- snapshot restore flows still work
- key regression paths stay intact across Courius, WitherNaught, BeatHive, and PaperCut
- malformed local metadata is escaped instead of rendered as executable markup

The script starts its own local static server and exits non-zero on failure.

## Current Architecture

- `shared-context.js`: shared project context bus
- `shared-commands.js`: shared command definitions
- `shared-command-palette.js`: shared palette UI injected into tools
- `shared-export.js`: Gmail/mailto export helper + telemetry
- `shared-recent-sessions.js`: index/palette recent-session discovery
- `shared-pwa.js` + `sw.js`: lightweight offline shell support

## State Safety

Most tools now use:

- revisioned local persistence
- cross-tab conflict detection
- automatic recovery snapshots
- in-app restore controls

The suite hub also surfaces:

- `Export Reliability`
- `Recovery Snapshots`

## Status

Roadmap completion is in the final closeout range (`~98%`): core roadmap work is delivered, and remaining work is optional polish, edge-case fixes, and future feature expansion.
