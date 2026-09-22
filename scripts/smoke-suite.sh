#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-0}"
HOST="${HOST:-127.0.0.1}"
PW_VERSION="${PW_VERSION:-0.1.1}"
PW_TIMEOUT_SECONDS="${PW_TIMEOUT_SECONDS:-120}"
SERVER_READY_TIMEOUT_SECONDS="${SERVER_READY_TIMEOUT_SECONDS:-30}"
SERVER_LOG="${SERVER_LOG:-$(python3 -c '
import os
import tempfile

fd, path = tempfile.mkstemp(prefix="writing-tools-smoke-server.", suffix=".log")
os.close(fd)
print(path)
')}"
PW_CMD=(npx --yes --package "@playwright/cli@${PW_VERSION}" playwright-cli)
SMOKE_RUN_ID="${SMOKE_RUN_ID:-$(printf '%x' $$)}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

run_pw() {
  local args=("$@")
  local i

  for i in "${!args[@]}"; do
    case "${args[$i]}" in
      -s=wt-*)
        case "${args[$i]#-s=wt-}" in
          index) code=i ;;
          synax) code=s ;;
          thisbutthat) code=t ;;
          joterie) code=j ;;
          beathive) code=b ;;
          courius) code=r ;;
          *) code=x ;;
        esac
        args[$i]="-s=wt${SMOKE_RUN_ID}${code}"
        ;;
    esac
  done

  run_with_timeout "$PW_TIMEOUT_SECONDS" "${PW_CMD[@]}" "${args[@]}"
}

pick_free_port() {
  python3 -c '
import socket

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.bind(("127.0.0.1", 0))
print(sock.getsockname()[1])
sock.close()
'
}

run_with_timeout() {
  local timeout_s="$1"
  shift
  python3 -c '
import subprocess
import sys

timeout = float(sys.argv[1])
cmd = sys.argv[2:]
try:
    raise SystemExit(subprocess.run(cmd, check=True, timeout=timeout).returncode)
except subprocess.TimeoutExpired:
    print("Timed out after {}s: {}".format(timeout, " ".join(cmd)), file=sys.stderr)
    raise SystemExit(124)
except subprocess.CalledProcessError as exc:
    raise SystemExit(exc.returncode)
' "$timeout_s" "$@"
}

wait_for_server() {
  local url="$1"
  local timeout_s="${2:-30}"
  local server_pid="${3:-}"
  local attempts=0
  local max_attempts=$((timeout_s * 10))

  while [ "$attempts" -lt "$max_attempts" ]; do
    if [[ -n "$server_pid" ]] && ! kill -0 "$server_pid" >/dev/null 2>&1; then
      echo "Static server exited before it became ready." >&2
      [[ -f "${SERVER_LOG:-}" ]] && cat "$SERVER_LOG" >&2 || true
      return 1
    fi

    if python3 -c '
import sys
import urllib.request

url = sys.argv[1]
with urllib.request.urlopen(url, timeout=1):
    raise SystemExit(0)
' "$url"; then
      return 0
    fi

    attempts=$((attempts + 1))
    sleep 0.1
  done

  echo "Server did not become ready at ${url} within ${timeout_s}s." >&2
  [[ -f "${SERVER_LOG:-}" ]] && cat "$SERVER_LOG" >&2 || true
  return 1
}

start_server() {
  if [[ -z "$PORT" || "$PORT" == "0" ]]; then
    PORT="$(pick_free_port)"
  fi

  : >"$SERVER_LOG"
  python3 -m http.server "$PORT" --bind "$HOST" --directory "$ROOT_DIR" >"$SERVER_LOG" 2>&1 &
  SERVER_PID=$!
  wait_for_server "http://${HOST}:${PORT}/index.html" "$SERVER_READY_TIMEOUT_SECONDS" "$SERVER_PID"
}

run_eval_check() {
  local session="$1"
  local label="$2"
  local script="$3"
  echo "   -> ${label}"
  run_pw -s="$session" eval "$script" >/dev/null
}

pause_ms() {
  local session="$1"
  local ms="$2"
  run_pw -s="$session" run-code "await page.waitForTimeout(${ms})" >/dev/null
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
  if [[ -f "${SERVER_LOG:-}" ]]; then
    rm -f "$SERVER_LOG" >/dev/null 2>&1 || true
  fi
}

require_cmd python3
require_cmd npx
require_cmd rg

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
start_server

open_and_check wt-index index.html
open_and_check wt-synax Synax.html
open_and_check wt-thisbutthat ThisButThat.html
open_and_check wt-joterie Joterie.html
open_and_check wt-beathive BeatHive.html
open_and_check wt-courius Courius.html

echo "==> critical interactions"

run_eval_check wt-synax "Synax revisioned persistence stores state updates" "$(cat <<'JS'
(() => {
  localStorage.removeItem('writingtools_synax_state_v1');
  localStorage.removeItem('writingtools_synax_revision_v1');
  const pinBtn = Array.from(document.querySelectorAll('button'))
    .find((btn) => ((btn.getAttribute('title') || '').toLowerCase() === 'pin'));
  if (!pinBtn) throw new Error('Synax pin button not found');
  pinBtn.click();
  const revision = parseInt(localStorage.getItem('writingtools_synax_revision_v1') || '0', 10) || 0;
  const state = JSON.parse(localStorage.getItem('writingtools_synax_state_v1') || '{}');
  if (!(revision > 0)) throw new Error('Synax revision was not persisted');
  if (!state || !Array.isArray(state.pinned) || state.pinned.length < 1) {
    throw new Error('Synax pinned state missing from revisioned payload');
  }
  return true;
})()
JS
)"

run_eval_check wt-index "Index recent-session hub escapes malformed local metadata" "$(cat <<'JS'
(() => {
  localStorage.setItem('writingtools_joterie_archives', JSON.stringify([
    {
      id: 1,
      createdAt: new Date().toISOString(),
      prompt: '<img src=x onerror=window.__wtSmokeInjected=1>',
      cards: ['one']
    }
  ]));
  if (typeof renderRecentSessions !== 'function') {
    throw new Error('renderRecentSessions unavailable');
  }
  window.__wtSmokeInjected = 0;
  renderRecentSessions();
  const titleNode = document.querySelector('.recent-title');
  if (!titleNode) throw new Error('Recent session title not rendered');
  if (titleNode.querySelector('img')) throw new Error('Unsafe markup rendered inside recent title');
  if (!String(titleNode.textContent || '').includes('<img src=x onerror=window.__wtSmokeInjected=1>')) {
    throw new Error('Escaped recent title text missing');
  }
  if (window.__wtSmokeInjected) throw new Error('Injected markup executed');
  return true;
})()
JS
)"

run_eval_check wt-thisbutthat "ThisButThat Gmail export opens a compose target" "$(cat <<'JS'
(() => {
  const opened = [];
  const originalOpen = window.open;
  window.open = (url) => {
    opened.push(String(url || ''));
    return { closed: false };
  };
  try {
    localStorage.setItem('thisButThatHistory', JSON.stringify([
      { id: 1, date: '2026-02-27', prompt: { text: 'Smoke Topic' }, twists: ['one'], medal: 'bronze' }
    ]));
    if (typeof loadHistory === 'function') loadHistory();
    if (typeof exportEmail !== 'function') throw new Error('exportEmail not available');
    exportEmail();
  } finally {
    window.open = originalOpen;
  }
  if (!opened.some((url) => url.includes('mail.google.com') || url.startsWith('mailto:'))) {
    throw new Error('No Gmail/mailto URL was attempted');
  }
  return true;
})()
JS
)"

run_eval_check wt-thisbutthat "ThisButThat snapshot restore applies persisted state" "$(cat <<'JS'
(() => {
  if (typeof restoreSnapshot !== 'function' || typeof saveSnapshot !== 'function') {
    throw new Error('ThisButThat snapshot controls unavailable');
  }
  const originalConfirm = window.confirm;
  window.confirm = () => true;
  try {
    saveSnapshot({
      history: [{ id: 99, date: '2026-02-27', prompt: { text: 'Snapshot Topic' }, twists: ['alpha'], medal: 'bronze' }],
      cache: []
    }, 'smoke-test', {});
    const snaps = JSON.parse(localStorage.getItem('writingtools_thisbutthat_snapshots_v1') || '[]');
    if (!Array.isArray(snaps) || snaps.length === 0) throw new Error('No ThisButThat snapshot found');
    restoreSnapshot(snaps[0].id);
  } finally {
    window.confirm = originalConfirm;
  }
  const history = JSON.parse(localStorage.getItem('thisButThatHistory') || '[]');
  if (!Array.isArray(history) || history.length < 1) throw new Error('ThisButThat history not restored');
  if (!String(history[0]?.prompt?.text || '').includes('Snapshot Topic')) throw new Error('ThisButThat restored payload mismatch');
  return true;
})()
JS
)"

run_eval_check wt-joterie "Joterie Gmail export opens a compose target" "$(cat <<'JS'
(() => {
  const opened = [];
  const originalOpen = window.open;
  window.open = (url) => {
    opened.push(String(url || ''));
    return { closed: false };
  };
  try {
    if (typeof exportGmail !== 'function') throw new Error('exportGmail not available');
    exportGmail();
  } finally {
    window.open = originalOpen;
  }
  if (!opened.some((url) => url.includes('mail.google.com') || url.startsWith('mailto:'))) {
    throw new Error('No Gmail/mailto URL was attempted');
  }
  return true;
})()
JS
)"

run_eval_check wt-joterie "Joterie revisioned archives persist on harvest save" "$(cat <<'JS'
(() => {
  localStorage.removeItem('writingtools_joterie_archives');
  localStorage.removeItem('writingtools_joterie_revision_v1');
  const prompt = document.getElementById('home-prompt');
  const start = document.getElementById('start-btn');
  const input = document.getElementById('sprint-input');
  const finish = document.getElementById('finish-early-btn');
  const save = document.getElementById('save-harvest-btn');
  if (!prompt || !start || !input || !finish || !save) throw new Error('Joterie controls missing');
  prompt.value = 'Smoke prompt';
  start.click();
  input.value = 'First jot';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  finish.click();
  save.click();
  const rev = parseInt(localStorage.getItem('writingtools_joterie_revision_v1') || '0', 10) || 0;
  const parsed = JSON.parse(localStorage.getItem('writingtools_joterie_archives') || '[]');
  if (!(rev > 0)) throw new Error('Joterie revision not persisted');
  if (!Array.isArray(parsed) || parsed.length < 1) throw new Error('Joterie archive missing after save');
  return true;
})()
JS
)"

run_eval_check wt-joterie "Joterie snapshot restore applies archived payload" "$(cat <<'JS'
(() => {
  if (typeof restoreArchiveSnapshot !== 'function' || typeof saveArchiveSnapshot !== 'function') {
    throw new Error('Joterie snapshot controls unavailable');
  }
  const originalConfirm = window.confirm;
  window.confirm = () => true;
  try {
    saveArchiveSnapshot([
      { id: 42, createdAt: new Date().toISOString(), date: '2/27/2026', prompt: 'Snapshot Prompt', cards: ['one'], ipm: '1.0', duration: '0:10' }
    ], 'smoke-test', {});
    const snaps = JSON.parse(localStorage.getItem('writingtools_joterie_snapshots_v1') || '[]');
    if (!Array.isArray(snaps) || snaps.length === 0) throw new Error('No Joterie snapshot available');
    restoreArchiveSnapshot(snaps[0].id);
  } finally {
    window.confirm = originalConfirm;
  }
  const archives = JSON.parse(localStorage.getItem('writingtools_joterie_archives') || '[]');
  if (!Array.isArray(archives) || archives.length < 1) throw new Error('Joterie archives not restored');
  if (!String(archives[0]?.prompt || '').includes('Snapshot Prompt')) throw new Error('Joterie restored payload mismatch');
  return true;
})()
JS
)"

run_eval_check wt-beathive "BeatHive ingests queued handoffs into the premise inbox" "$(cat <<'JS'
(() => {
  if (!window.WTBeatHive || !window.BeatHiveDebug) throw new Error('BeatHive APIs unavailable');
  window.WTBeatHive.queueHandoff({ topic: 'Smoke', jots: ['smoke jot one', 'smoke jot two'], source: 'Joterie' });
  window.WTBeatHive.queueHandoff({ topic: 'Smoke topic', constraints: 'noun: test', source: 'Synax' });
  window.BeatHiveDebug.ingestHandoffs();
  const texts = window.BeatHiveDebug.getState().inbox.map((i) => i.text);
  ['smoke jot one', 'smoke jot two', 'Smoke topic'].forEach((t) => {
    if (!texts.includes(t)) throw new Error('Inbox missing ' + t);
  });
  if (localStorage.getItem('writingtools_beathive_handoff_v1')) throw new Error('Handoff queue not cleared');
  const rev = parseInt(localStorage.getItem('writingtools_beathive_revision_v1') || '0', 10) || 0;
  if (!(rev > 0)) throw new Error('BeatHive revision not persisted');
  return true;
})()
JS
)"

run_eval_check wt-beathive "BeatHive latest snapshot restore applies local state" "$(cat <<'JS'
(() => {
  const originalConfirm = window.confirm;
  window.confirm = () => true;
  try {
    localStorage.setItem('writingtools_beathive_snapshots_v1', JSON.stringify([{
      id: 'bhsmoke',
      at: new Date().toISOString(),
      reason: 'smoke-test',
      payload: { version: 2, inbox: [], ladders: [{ id: 'l-smoke', name: 'Recovered Ladder', rungs: ['one'] }], activeId: 'l-smoke' }
    }]));
    window.BeatHiveDebug.restoreLatestSnapshot();
  } finally {
    window.confirm = originalConfirm;
  }
  const payload = JSON.parse(localStorage.getItem('writingtools_beathive_v2') || '{}');
  if (!payload || !Array.isArray(payload.ladders) || payload.ladders[0]?.name !== 'Recovered Ladder') {
    throw new Error('BeatHive restored payload mismatch');
  }
  return true;
})()
JS
)"

run_eval_check wt-courius "Courius append adds to the open script; replace creates a new script" "$(cat <<'JS'
(() => {
  const api = window.WTCourius;
  if (!api || typeof api.append !== 'function' || typeof api.overwrite !== 'function') {
    throw new Error('WTCourius transfer API unavailable');
  }
  localStorage.removeItem('writingtools_courius_storage');
  localStorage.removeItem('writingtools_courius_imports_v1');
  localStorage.removeItem('writingtools_courius_revision_v1');

  const appended = api.append('<div class="action">alpha smoke payload</div>', 'SmokeAppend');
  const appendValue = localStorage.getItem('writingtools_courius_storage') || '';
  if (!appended || !appendValue.includes('alpha smoke payload')) throw new Error('Append transfer failed');

  const docsBefore = JSON.parse(localStorage.getItem('writingtools_courius_docs_v1') || '[]').length;
  const created = api.overwrite('<div class="action">beta smoke payload</div>', 'SmokeOverwrite');
  if (!created) throw new Error('Replace transfer failed');
  const docs = JSON.parse(localStorage.getItem('writingtools_courius_docs_v1') || '[]');
  if (docs.length !== docsBefore + 1) throw new Error('Replace did not create a new script');
  if (!(localStorage.getItem('writingtools_courius_doc_' + docs[0].id) || '').includes('beta smoke payload')) {
    throw new Error('New script is missing the handoff payload');
  }
  const openValue = localStorage.getItem('writingtools_courius_storage') || '';
  if (!openValue.includes('alpha smoke payload') && !openValue.includes('beta smoke payload')) {
    throw new Error('Open script content was lost');
  }

  const imports = JSON.parse(localStorage.getItem('writingtools_courius_imports_v1') || '[]');
  if (!Array.isArray(imports) || imports.length < 2) throw new Error('Import history did not capture both transfers');
  return true;
})()
JS
)"

run_eval_check wt-courius "Courius parenthetical wrappers do not carry across type changes" "$(cat <<'JS'
(() => {
  const block = Array.from(document.querySelectorAll('#page > div')).find((el) => !el.classList.contains('title-page-container'));
  if (!block) throw new Error('No editable Courius block found');
  block.className = 'parenthetical';
  block.innerText = '(WHISPERING)';
  if (typeof setBlockType !== 'function') throw new Error('setBlockType not available');
  setBlockType(block, 'dialogue');
  const txt = (block.innerText || '').trim();
  if (txt.includes('(') || txt.includes(')')) {
    throw new Error('Parenthetical wrapper leaked to non-parenthetical type');
  }
  if (block.className !== 'dialogue') throw new Error('Block type change failed');
  return true;
})()
JS
)"

echo "==> cross-tool Courius handoff checks"

pause_ms wt-beathive 1200
run_eval_check wt-beathive "BeatHive UI send-to-Courius creates a new script" "$(cat <<'JS'
(() => {
  const opened = [];
  const originalOpen = window.open;
  window.open = (url) => {
    opened.push(String(url || ''));
    return { closed: false };
  };
  const docsBefore = JSON.parse(localStorage.getItem('writingtools_courius_docs_v1') || '[]').length;
  try {
    const select = document.querySelector('.mode-select');
    if (select) { select.value = 'new'; }
    const sendBtn = document.getElementById('send-courius-btn');
    if (!sendBtn) throw new Error('BeatHive send button not found');
    sendBtn.click();
  } finally {
    window.open = originalOpen;
  }
  const docs = JSON.parse(localStorage.getItem('writingtools_courius_docs_v1') || '[]');
  if (docs.length <= docsBefore) throw new Error('BeatHive did not create a Courius script');
  const payload = localStorage.getItem('writingtools_courius_doc_' + docs[0].id) || '';
  if (!/\[GAME\]/.test(payload) || !/\[BUTTON\]/.test(payload)) throw new Error('BeatHive payload missing ladder markers');
  if (!opened.some((url) => /Courius\.html/i.test(url))) throw new Error('BeatHive did not attempt to open Courius');
  return true;
})()
JS
)"

assert_no_console_errors wt-thisbutthat >/dev/null
assert_no_console_errors wt-joterie >/dev/null
assert_no_console_errors wt-courius >/dev/null

# `close-all` can hang in some local environments; individual sessions are ephemeral.
echo "Smoke suite passed."
