# Writing Tools

A browser-based suite of writing apps that now operates as one connected local system: shared context, cross-tool handoffs, recovery snapshots, export telemetry, and a suitewide smoke test.

## Apps

- `index.html`: suite hub, recent sessions, export reliability, recovery snapshots
- `Synax.html`: serendipity + concept generation
- `ThisButThat.html`: twist-premise generation
- `Joterie.html`: short-burst ideation and harvests
- `BeatHive.html`: beat mapping and structural diagnostics
- `WitherNaught.html`: pressure drafting loop
- `Wribbon.html`: drafting/export workflow
- `Courius.html`: screenplay editor
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
