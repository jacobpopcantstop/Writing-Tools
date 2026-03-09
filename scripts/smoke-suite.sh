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
}

require_cmd python3
require_cmd npx
require_cmd rg

trap cleanup EXIT
python3 -m http.server "$PORT" --directory "$ROOT_DIR" >/tmp/writing_tools_smoke_server.log 2>&1 &
SERVER_PID=$!
sleep 1

open_and_check wt-index index.html
open_and_check wt-characterforge CharacterForge.html
open_and_check wt-synax Synax.html
open_and_check wt-thisbutthat ThisButThat.html
open_and_check wt-joterie Joterie.html
open_and_check wt-beathive BeatHive.html
open_and_check wt-wribbon Wribbon.html
open_and_check wt-withernaught WitherNaught.html
open_and_check wt-courius Courius.html
open_and_check wt-papercut PaperCut.html

echo "==> critical interactions"

run_eval_check wt-characterforge "CharacterForge generates and persists a saved character batch" "$(cat <<'JS'
(() => {
  localStorage.removeItem('writingtools_characterforge_state_v1');
  localStorage.removeItem('writingtools_characterforge_revision_v1');
  localStorage.removeItem('writingtools_characterforge_snapshots_v1');
  location.reload();
  return new Promise((resolve) => {
    setTimeout(() => {
      const generate = document.getElementById('generate-btn');
      if (!generate) throw new Error('CharacterForge generate button missing');
      generate.click();
      setTimeout(() => {
        const cards = Array.from(document.querySelectorAll('[data-card-action="favorite"]'));
        if (cards.length < 1) throw new Error('CharacterForge variants did not render');
        cards[0].click();
        const revision = parseInt(localStorage.getItem('writingtools_characterforge_revision_v1') || '0', 10) || 0;
        const state = JSON.parse(localStorage.getItem('writingtools_characterforge_state_v1') || '{}');
        if (!(revision > 0)) throw new Error('CharacterForge revision was not persisted');
        if (!Array.isArray(state.batch) || state.batch.length < 1) throw new Error('CharacterForge batch missing');
        if (!Array.isArray(state.favorites) || state.favorites.length < 1) throw new Error('CharacterForge favorite not saved');
        resolve(true);
      }, 200);
    }, 200);
  });
})()
JS
)"

run_eval_check wt-characterforge "CharacterForge snapshot restore advances history and preserves favorite selection" "$(cat <<'JS'
(() => {
  const stateA = {
    draft: { name: 'Iris Vale', role: 'archivist', adjective: 'restless', goal: 'clear her name', flavor: 'Noir' },
    batch: [],
    favorites: [
      { id: 'fav-a', name: 'Iris Vale', role: 'archivist', adjective: 'restless', goal: 'clear her name', hook: 'A', conflict: 'A', contradiction: 'A', voice: 'A', flavor: 'Noir', sourceInputs: {}, createdAt: new Date().toISOString(), isFavorite: true },
      { id: 'fav-c', name: 'Nadia Bloom', role: 'ghostwriter', adjective: 'secretive', goal: 'expose the truth', hook: 'C', conflict: 'C', contradiction: 'C', voice: 'C', flavor: 'Fantasy', sourceInputs: {}, createdAt: new Date().toISOString(), isFavorite: true }
    ],
    selectedId: 'fav-a',
    snapshots: [],
    updatedAt: '',
    lastAction: ''
  };
  const stateB = {
    draft: { name: 'June Holloway', role: 'mayor', adjective: 'magnetic', goal: 'save town', flavor: 'Comedy' },
    batch: [],
    favorites: [{ id: 'fav-b', name: 'June Holloway', role: 'mayor', adjective: 'magnetic', goal: 'save town', hook: 'B', conflict: 'B', contradiction: 'B', voice: 'B', flavor: 'Comedy', sourceInputs: {}, createdAt: new Date().toISOString(), isFavorite: true }],
    selectedId: 'fav-b',
    snapshots: [],
    updatedAt: '',
    lastAction: ''
  };
  localStorage.setItem('writingtools_characterforge_snapshots_v1', JSON.stringify([
    { id: 'snap-b', label: 'newer', createdAt: new Date().toISOString(), state: stateB },
    { id: 'snap-a', label: 'older', createdAt: new Date(Date.now() - 60000).toISOString(), state: stateA }
  ]));
  localStorage.setItem('writingtools_characterforge_state_v1', JSON.stringify(stateB));
  localStorage.setItem('writingtools_characterforge_revision_v1', '5');
  const restore = document.getElementById('restore-snapshot-btn');
  const remove = document.querySelector('#favorites-grid [data-card-action="favorite"]');
  if (!restore) throw new Error('CharacterForge restore button missing');
  restore.click();
  let restored = JSON.parse(localStorage.getItem('writingtools_characterforge_state_v1') || '{}');
  let snapshots = JSON.parse(localStorage.getItem('writingtools_characterforge_snapshots_v1') || '[]');
  if (restored.selectedId !== 'fav-b') throw new Error('Newest snapshot did not restore first');
  if (!Array.isArray(snapshots) || snapshots.length !== 1 || snapshots[0].id !== 'snap-a') throw new Error('Snapshot stack did not advance after first restore');
  restore.click();
  restored = JSON.parse(localStorage.getItem('writingtools_characterforge_state_v1') || '{}');
  snapshots = JSON.parse(localStorage.getItem('writingtools_characterforge_snapshots_v1') || '[]');
  if (restored.selectedId !== 'fav-a') throw new Error('Older snapshot was not restored second');
  if (!Array.isArray(snapshots) || snapshots.length !== 0) throw new Error('Snapshot stack was not consumed');
  if (!document.getElementById('selected-name') || !document.getElementById('selected-flavor')) throw new Error('CharacterForge status pills missing');
  if ((document.getElementById('selected-flavor').textContent || '').trim() !== 'Noir') throw new Error('Selected flavor pill did not reflect restored favorite');
  const removeBtn = document.querySelector('#favorites-grid [data-card-action="favorite"]');
  if (!removeBtn) throw new Error('CharacterForge favorite remove button missing');
  removeBtn.click();
  const finalState = JSON.parse(localStorage.getItem('writingtools_characterforge_state_v1') || '{}');
  if (finalState.selectedId !== 'fav-c') throw new Error('Selection did not fall back to a remaining favorite');
  return true;
})()
JS
)"

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

run_eval_check wt-wribbon "Wribbon Gmail export opens a compose target" "$(cat <<'JS'
(() => {
  const opened = [];
  const originalOpen = window.open;
  window.open = (url) => {
    opened.push(String(url || ''));
    return { closed: false };
  };
  try {
    if (!window.app || typeof window.app.emailGmail !== 'function') throw new Error('app.emailGmail not available');
    window.app.emailGmail();
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

run_eval_check wt-wribbon "Wribbon latest snapshot restore applies draft text" "$(cat <<'JS'
(() => {
  if (!window.app || typeof window.app.restoreLatestSnapshot !== 'function') {
    throw new Error('Wribbon snapshot controls unavailable');
  }
  const originalConfirm = window.confirm;
  window.confirm = () => true;
  try {
    localStorage.setItem('writingtools_wribbon_snapshots_v1', JSON.stringify([{
      id: 'wrsmoke',
      at: new Date().toISOString(),
      reason: 'smoke-test',
      payload: 'Recovered Wribbon draft'
    }]));
    window.app.restoreLatestSnapshot();
  } finally {
    window.confirm = originalConfirm;
  }
  const text = String(localStorage.getItem('writingtools_wribbon_text') || '');
  if (!text.includes('Recovered Wribbon draft')) throw new Error('Wribbon draft not restored');
  return true;
})()
JS
)"

run_eval_check wt-withernaught "WitherNaught Gmail export opens a compose target" "$(cat <<'JS'
(() => {
  const opened = [];
  const originalOpen = window.open;
  window.open = (url) => {
    opened.push(String(url || ''));
    return { closed: false };
  };
  try {
    if (!window.WitherNaught || typeof window.WitherNaught.exportToGmail !== 'function') throw new Error('WitherNaught.exportToGmail not available');
    window.WitherNaught.exportToGmail();
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

run_eval_check wt-withernaught "WitherNaught revisioned prefs persist changes" "$(cat <<'JS'
(() => {
  localStorage.removeItem('writingtools_withernaught_state_v1');
  localStorage.removeItem('writingtools_withernaught_revision_v1');
  if (!window.WitherNaught || typeof window.WitherNaught.setDifficulty !== 'function') {
    throw new Error('WitherNaught.setDifficulty unavailable');
  }
  window.WitherNaught.setDifficulty('Master');
  const rev = parseInt(localStorage.getItem('writingtools_withernaught_revision_v1') || '0', 10) || 0;
  const payload = JSON.parse(localStorage.getItem('writingtools_withernaught_state_v1') || '{}');
  if (!(rev > 0)) throw new Error('WitherNaught revision not persisted');
  if (!payload || !payload.prefs || payload.prefs.difficulty !== 'Master') {
    throw new Error('WitherNaught persisted difficulty mismatch');
  }
  return true;
})()
JS
)"

run_eval_check wt-withernaught "WitherNaught snapshot restore applies persisted prefs" "$(cat <<'JS'
(() => {
  if (!window.WitherNaught || typeof window.WitherNaught.restoreWitherSnapshot !== 'function') {
    throw new Error('WitherNaught snapshot controls unavailable');
  }
  const originalConfirm = window.confirm;
  window.confirm = () => true;
  try {
    const snaps = [{
      id: 'smoke-snap',
      at: new Date().toISOString(),
      reason: 'smoke-test',
      payload: {
        history: [],
        streak: { current: 2, lastDate: new Date().toDateString() },
        prefs: { theme: 'cool', difficulty: 'Master', couriusMode: 'append' }
      }
    }];
    localStorage.setItem('writingtools_withernaught_snapshots_v1', JSON.stringify(snaps));
    window.WitherNaught.restoreWitherSnapshot('smoke-snap');
  } finally {
    window.confirm = originalConfirm;
  }
  const payload = JSON.parse(localStorage.getItem('writingtools_withernaught_state_v1') || '{}');
  if (!payload || !payload.prefs || payload.prefs.difficulty !== 'Master') {
    throw new Error('WitherNaught restored payload mismatch');
  }
  return true;
})()
JS
)"

run_eval_check wt-beathive "BeatHive revisioned local persistence updates on rename" "$(cat <<'JS'
(() => {
  localStorage.removeItem('writingtools_beathive_state_v1');
  localStorage.removeItem('writingtools_beathive_revision_v1');
  const input = document.querySelector('header input[aria-label="Project Name"]');
  if (!input) throw new Error('BeatHive project name input not found');
  input.value = 'Smoke Hive';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  const rev = parseInt(localStorage.getItem('writingtools_beathive_revision_v1') || '0', 10) || 0;
  const payload = JSON.parse(localStorage.getItem('writingtools_beathive_state_v1') || '{}');
  if (!(rev > 0)) throw new Error('BeatHive revision not persisted');
  if (!payload || !Array.isArray(payload.sketches)) throw new Error('BeatHive persisted payload missing sketches');
  return true;
})()
JS
)"

run_eval_check wt-beathive "BeatHive latest snapshot restore applies local state" "$(cat <<'JS'
(() => {
  if (!window.BeatHiveDebug || typeof window.BeatHiveDebug.restoreLatestSnapshot !== 'function') {
    throw new Error('BeatHive snapshot controls unavailable');
  }
  const originalConfirm = window.confirm;
  window.confirm = () => true;
  try {
    localStorage.setItem('writingtools_beathive_snapshots_v1', JSON.stringify([{
      id: 'bhsmoke',
      at: new Date().toISOString(),
      reason: 'smoke-test',
      payload: {
        sketches: [{ id: 'local-1', name: 'Recovered Hive', cells: [], updatedAt: Date.now() }],
        couriusMode: 'append',
        immersiveSeen: true
      }
    }]));
    window.BeatHiveDebug.restoreLatestSnapshot();
  } finally {
    window.confirm = originalConfirm;
  }
  const payload = JSON.parse(localStorage.getItem('writingtools_beathive_state_v1') || '{}');
  if (!payload || !Array.isArray(payload.sketches) || payload.sketches[0]?.name !== 'Recovered Hive') {
    throw new Error('BeatHive restored payload mismatch');
  }
  return true;
})()
JS
)"

run_eval_check wt-papercut "PaperCut revisioned recent-session persistence updates" "$(cat <<'JS'
(() => {
  localStorage.removeItem('writingtools_papercut_state_v1');
  localStorage.removeItem('writingtools_papercut_revision_v1');
  if (typeof persistRecentSession !== 'function') throw new Error('persistRecentSession unavailable');
  persistRecentSession({ fileName: 'smoke.pdf', totalPages: 7, currentPage: 3 });
  const rev = parseInt(localStorage.getItem('writingtools_papercut_revision_v1') || '0', 10) || 0;
  const payload = JSON.parse(localStorage.getItem('writingtools_papercut_state_v1') || '{}');
  if (!(rev > 0)) throw new Error('PaperCut revision not persisted');
  if (!payload || !payload.recentSession || payload.recentSession.fileName !== 'smoke.pdf') {
    throw new Error('PaperCut recent session missing from persisted payload');
  }
  return true;
})()
JS
)"

run_eval_check wt-papercut "PaperCut latest snapshot restore applies persisted state" "$(cat <<'JS'
(() => {
  if (typeof restoreLatestPaperCutSnapshot !== 'function') throw new Error('restoreLatestPaperCutSnapshot unavailable');
  const originalConfirm = window.confirm;
  window.confirm = () => true;
  try {
    localStorage.setItem('writingtools_papercut_snapshots_v1', JSON.stringify([{
      id: 'snap-smoke',
      at: new Date().toISOString(),
      reason: 'smoke-test',
      payload: { theme: 'light', recentSession: { fileName: 'restored.pdf', totalPages: 4, currentPage: 2, updatedAt: Date.now() } }
    }]));
    restoreLatestPaperCutSnapshot();
  } finally {
    window.confirm = originalConfirm;
  }
  const payload = JSON.parse(localStorage.getItem('writingtools_papercut_state_v1') || '{}');
  if (!payload || payload.theme !== 'light') throw new Error('PaperCut theme not restored');
  if (!payload.recentSession || payload.recentSession.fileName !== 'restored.pdf') throw new Error('PaperCut recent session not restored');
  return true;
})()
JS
)"

run_eval_check wt-courius "Courius append/overwrite import flows update storage" "$(cat <<'JS'
(() => {
  const bus = window.WTContextBus;
  if (!bus || typeof bus.appendToCourius !== 'function' || typeof bus.overwriteCourius !== 'function') {
    throw new Error('WTContextBus transfer API unavailable');
  }
  localStorage.removeItem('writingtools_courius_storage');
  localStorage.removeItem('writingtools_courius_imports_v1');
  localStorage.removeItem('writingtools_courius_revision_v1');

  const appended = bus.appendToCourius('<div class="action">alpha smoke payload</div>', 'SmokeAppend');
  const appendValue = localStorage.getItem('writingtools_courius_storage') || '';
  if (!appended || !appendValue.includes('alpha smoke payload')) throw new Error('Append transfer failed');

  const overwritten = bus.overwriteCourius('<div class="action">beta smoke payload</div>', 'SmokeOverwrite');
  const overwriteValue = localStorage.getItem('writingtools_courius_storage') || '';
  if (!overwritten || !overwriteValue.includes('beta smoke payload')) throw new Error('Overwrite transfer failed');
  if (overwriteValue.includes('alpha smoke payload')) throw new Error('Overwrite did not replace existing payload');

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

run_eval_check wt-withernaught "WitherNaught ring starts progressing after input" "$(cat <<'JS'
(() => {
  if (!window.WitherNaught || typeof window.WitherNaught.startNextRound !== 'function') {
    throw new Error('WitherNaught API unavailable');
  }
  window.WitherNaught.startNextRound(false);
  const textarea = document.getElementById('main-textarea');
  if (!textarea) throw new Error('main-textarea not found');
  textarea.value = 'alpha beta gamma delta epsilon zeta eta theta iota kappa';
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()
JS
)"
pause_ms wt-withernaught 1200
run_eval_check wt-withernaught "WitherNaught ring progress is above zero" "$(cat <<'JS'
(() => {
  const ringMeta = (document.getElementById('ring-meta')?.textContent || '').trim();
  const match = ringMeta.match(/(\d+)%/);
  if (!match) throw new Error('Ring percent not available');
  const pct = Number(match[1]);
  if (!(pct > 0)) throw new Error('Ring did not progress');
  return true;
})()
JS
)"

run_eval_check wt-papercut "PaperCut nav/rotate/delete controls are safe without a loaded doc" "$(cat <<'JS'
(() => {
  window.alert = () => {};
  window.confirm = () => false;
  ['prev-page-btn', 'next-page-btn', 'rotate-left-btn', 'rotate-right-btn', 'delete-page-btn']
    .forEach((id) => {
      const el = document.getElementById(id);
      if (!el) throw new Error(`Missing control: ${id}`);
      el.click();
    });
  return true;
})()
JS
)"

echo "==> cross-tool Courius handoff checks"

pause_ms wt-beathive 1200
run_eval_check wt-beathive "BeatHive UI send-to-Courius writes payload" "$(cat <<'JS'
(() => {
  localStorage.removeItem('writingtools_courius_storage');
  const opened = [];
  const originalOpen = window.open;
  window.open = (url) => {
    opened.push(String(url || ''));
    return { closed: false };
  };
  try {
    const sendBtn = Array.from(document.querySelectorAll('button'))
      .find((btn) => /send\s+map\s+to\s+courius|send\s+to\s+courius/i.test((btn.textContent || '').trim()));
    if (!sendBtn) throw new Error('BeatHive send button not found');
    sendBtn.click();
  } finally {
    window.open = originalOpen;
  }
  const payload = localStorage.getItem('writingtools_courius_storage') || '';
  if (!payload.trim()) throw new Error('BeatHive did not write Courius payload');
  if (!/BEAT\s+\d+/i.test(payload)) throw new Error('BeatHive payload missing beat markers');
  if (!opened.some((url) => /Courius\.html/i.test(url))) throw new Error('BeatHive did not attempt to open Courius');
  return true;
})()
JS
)"

run_eval_check wt-wribbon "Wribbon UI send-to-Courius writes payload" "$(cat <<'JS'
(() => {
  localStorage.removeItem('writingtools_courius_storage');
  if (!window.app) throw new Error('Wribbon app not available');
  window.app.state.text = 'Wribbon smoke handoff line';
  if (window.app.dom && window.app.dom.editor) {
    window.app.dom.editor.innerText = window.app.state.text;
  }
  const opened = [];
  const originalOpen = window.open;
  window.open = (url) => {
    opened.push(String(url || ''));
    return { closed: false };
  };
  try {
    window.app.toggleExportMenu();
    const sendBtn = Array.from(document.querySelectorAll('#export-menu button'))
      .find((btn) => /send\s+to\s+courius/i.test((btn.textContent || '').trim()));
    if (!sendBtn) throw new Error('Wribbon send button not found');
    sendBtn.click();
  } finally {
    window.open = originalOpen;
  }
  const payload = localStorage.getItem('writingtools_courius_storage') || '';
  if (!payload.includes('Wribbon smoke handoff line')) throw new Error('Wribbon payload missing expected content');
  if (!opened.some((url) => /Courius\.html/i.test(url))) throw new Error('Wribbon did not attempt to open Courius');
  return true;
})()
JS
)"

run_eval_check wt-withernaught "WitherNaught handoff path writes payload" "$(cat <<'JS'
(() => {
  localStorage.removeItem('writingtools_courius_storage');
  const textarea = document.getElementById('main-textarea');
  if (!textarea) throw new Error('main-textarea not found');
  textarea.value = 'WitherNaught smoke transfer line';
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  const opened = [];
  const originalOpen = window.open;
  window.open = (url) => {
    opened.push(String(url || ''));
    return { closed: false };
  };
  try {
    if (!window.WTToolActions || typeof window.WTToolActions.handoffPrimary !== 'function') {
      throw new Error('WitherNaught handoff action unavailable');
    }
    window.WTToolActions.handoffPrimary();
  } finally {
    window.open = originalOpen;
  }
  const payload = localStorage.getItem('writingtools_courius_storage') || '';
  if (!payload.includes('WitherNaught smoke transfer line')) throw new Error('WitherNaught payload missing expected content');
  if (!opened.some((url) => /Courius\.html/i.test(url))) throw new Error('WitherNaught did not attempt to open Courius');
  return true;
})()
JS
)"

assert_no_console_errors wt-thisbutthat >/dev/null
assert_no_console_errors wt-joterie >/dev/null
assert_no_console_errors wt-wribbon >/dev/null
assert_no_console_errors wt-withernaught >/dev/null
assert_no_console_errors wt-courius >/dev/null
assert_no_console_errors wt-papercut >/dev/null

# `close-all` can hang in some local environments; individual sessions are ephemeral.
echo "Smoke suite passed."
