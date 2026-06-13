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
- `TextToFDX.html`: LLM-assisted raw text to editable FDX preview/export
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

## Text to FDX Proxy

The Text to FDX tool uses a local proxy so API keys never live in browser code. Gemini is the default provider. Start it from the repo root:

```bash
GEMINI_API_KEY="..." node tools/text_fdx_proxy/server.mjs
```

Then open:

```text
http://127.0.0.1:8787/TextToFDX.html
```

Optional settings:

- `PORT=8788` changes the local proxy/static server port.
- `GEMINI_MODEL=gemini-3.1-flash-lite` changes the Gemini model used for structured screenplay formatting.
- `FDX_DAILY_LIMIT=5` caps successful API formatting requests per local day. Use `0` to disable the cap.
- `FDX_USAGE_FILE=output/text-fdx-usage.json` changes where the local request counter is stored.
- `FDX_LLM_PROVIDER=openai OPENAI_API_KEY="sk-..." OPENAI_MODEL=gpt-5.4-mini node tools/text_fdx_proxy/server.mjs` uses OpenAI instead.

You can also skip the API call entirely: copy the JSON prompt from `TextToFDX.html`, paste it into ChatGPT/Gemini/Claude, then paste the returned JSON into the Manual Structured JSON box.

The tool checks `/api/health` on load and shows whether the local provider/model is reachable before formatting.
On GitHub Pages, keep the local proxy running in a terminal and leave the tool's proxy URL set to `http://127.0.0.1:8787/api/format-fdx`. GitHub Pages cannot host the Gemini/OpenAI proxy itself.

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
