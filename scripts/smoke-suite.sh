#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-8017}"
HOST="${HOST:-127.0.0.1}"
PW_CMD=(npx --yes --package @playwright/cli playwright-cli)

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

run_pw() {
  "${PW_CMD[@]}" "$@"
}

assert_no_console_errors() {
  local session="$1"
  local output file_line log_path details
  output="$(run_pw -s="$session" console || true)"
  if printf '%s' "$output" | rg -q 'Errors:\s*[1-9][0-9]*'; then
    echo "$output"
    echo "Console errors detected for session: $session" >&2
    exit 1
  fi

  file_line="$(printf '%s' "$output" | rg -o '\.playwright-cli/console-[^)]*\.log' || true)"
  if [[ -n "$file_line" ]]; then
    log_path="$HOME/$file_line"
    if [[ -f "$log_path" ]]; then
      details="$(cat "$log_path")"
      if printf '%s' "$details" | rg -q 'Errors:\s*[1-9][0-9]*'; then
        echo "$details"
        echo "Console errors detected for session: $session" >&2
        exit 1
      fi
    fi
  fi
}

open_and_check() {
  local session="$1"
  local page="$2"
  local url="http://${HOST}:${PORT}/${page}"
  echo "==> ${page}"
  run_pw -s="$session" open "$url" >/dev/null
  run_pw -s="$session" snapshot >/dev/null
  assert_no_console_errors "$session" >/dev/null
}

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]]; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}

require_cmd python3
require_cmd npx
require_cmd rg

trap cleanup EXIT
python3 -m http.server "$PORT" --directory "$ROOT_DIR" >/tmp/writing_tools_smoke_server.log 2>&1 &
SERVER_PID=$!
sleep 1

open_and_check wt-index index.html
open_and_check wt-synax Synax.html
open_and_check wt-thisbutthat ThisButThat.html
open_and_check wt-joterie Joterie.html
open_and_check wt-beathive BeatHive.html
open_and_check wt-wribbon Wribbon.html
open_and_check wt-withernaught WitherNaught.html
open_and_check wt-courius Courius.html
open_and_check wt-papercut PaperCut.html

# `close-all` can hang in some local environments; individual sessions are ephemeral.
echo "Smoke suite passed."
