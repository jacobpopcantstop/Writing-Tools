# Writing Tools Streamline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the heavy global context bus, make Courius screenplay exports/print match the US spec-script standard exactly with no cross-tool artifact leakage, and rebuild CharacterForge from a randomizer into a curated Socratic interview.

**Architecture:** Static, 100% client-side HTML/CSS/JS — no backend, no build step, no LLM API. Cross-tool plumbing shrinks to one explicit "Send to Courius" handoff plus a shared toast. Screenplay formatting logic is extracted into pure, dependency-free functions so it can be unit-tested with `node --test`; integration is verified with the existing Playwright smoke suite (`scripts/smoke-suite.sh`).

**Tech Stack:** Vanilla JS (IIFE modules on `window`), HTML, CSS. Tests: `node --test` (built into Node, zero deps) for pure functions; Playwright smoke suite for browser integration.

---

## File Structure

**New files:**
- `shared-courius.js` — `window.WTCourius`: the Courius handoff (transfer/sanitize/import-history). Replaces the Courius half of `shared-context.js`.
- `shared-toast.js` — `window.WTToast.notify`: the toast utility. Replaces the notify half of `shared-context.js`.
- `courius-format.js` — `window.WTScreenplay`: pure screenplay-formatting functions (RTF paragraph prefixes, RTF doc assembly from plain element arrays, FDX assembly). Loaded by `Courius.html`. Pure (no DOM) so it is unit-testable.
- `tests/courius-format.test.js` — `node --test` unit tests for `courius-format.js`.
- `characterforge-questions.js` — the curated Socratic question bank (data only).

**Modified files:**
- `shared-context.js` — **deleted** at the end of Stream A.
- `Courius.html` — swap script includes; export functions delegate to `WTScreenplay`; fix page-number size; strip markers from exports.
- `CharacterForge.html` — full rebuild (Stream C).
- `Wribbon.html`, `WitherNaught.html`, `Synax.html` — remove context-bus wiring; rewire notify → `WTToast`, send-to-Courius → `WTCourius`.
- `index.html`, `shared-tool-manifest.js`, `Joterie.html`, `ThisButThat.html`, `BeatHive.html` — drop `shared-context.js` include / context references; add `shared-toast.js` where `notify` is used.

**Loading note:** `courius-format.js` must be pure (no `window`-only globals beyond defining `window.WTScreenplay`) and must also export for Node. Pattern used throughout:
```js
(function (root) {
  'use strict';
  var WTScreenplay = { /* ... */ };
  if (typeof module !== 'undefined' && module.exports) module.exports = WTScreenplay;
  if (root) root.WTScreenplay = WTScreenplay;
})(typeof window !== 'undefined' ? window : null);
```

---

## STREAM A — Context bus → focused modules

### Task A1: Create `shared-toast.js`

**Files:**
- Create: `shared-toast.js`

- [ ] **Step 1: Write the module**

Lift the toast logic out of `shared-context.js` (lines ~213–264) verbatim into a standalone module.

```js
(function () {
  'use strict';
  var TOAST_ID = 'wt-suite-toast';

  function ensureToastNode() {
    if (typeof document === 'undefined') return null;
    var existing = document.getElementById(TOAST_ID);
    if (existing) return existing;
    var node = document.createElement('div');
    node.id = TOAST_ID;
    node.style.position = 'fixed';
    node.style.left = '50%';
    node.style.bottom = '20px';
    node.style.transform = 'translateX(-50%) translateY(8px)';
    node.style.padding = '8px 12px';
    node.style.borderRadius = '999px';
    node.style.fontSize = '11px';
    node.style.fontWeight = '700';
    node.style.letterSpacing = '0.08em';
    node.style.textTransform = 'uppercase';
    node.style.opacity = '0';
    node.style.pointerEvents = 'none';
    node.style.transition = 'opacity 160ms ease, transform 160ms ease';
    node.style.zIndex = '2147483647';
    node.style.backdropFilter = 'blur(6px)';
    node.style.background = 'rgba(14,14,14,0.9)';
    node.style.color = '#f4f4f5';
    node.style.border = '1px solid rgba(255,255,255,0.18)';
    document.body.appendChild(node);
    return node;
  }

  function notify(message, type) {
    var node = ensureToastNode();
    if (!node) return;
    var text = String(message || '').trim();
    if (!text) return;
    var level = String(type || 'info').toLowerCase();
    node.textContent = text;
    if (level === 'error') {
      node.style.background = 'rgba(127,29,29,0.92)';
      node.style.borderColor = 'rgba(252,165,165,0.45)';
      node.style.color = '#fee2e2';
    } else {
      node.style.background = 'rgba(14,14,14,0.9)';
      node.style.borderColor = 'rgba(255,255,255,0.18)';
      node.style.color = '#f4f4f5';
    }
    node.style.opacity = '1';
    node.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(node._wtHideTimer);
    node._wtHideTimer = setTimeout(function () {
      node.style.opacity = '0';
      node.style.transform = 'translateX(-50%) translateY(8px)';
    }, 1800);
  }

  window.WTToast = { notify: notify };
})();
```

- [ ] **Step 2: Verify it loads**

Run: `node -e "global.window={};global.document=undefined;require('./shared-toast.js');console.log(typeof window.WTToast.notify)"`
Expected: prints `function` (notify is defined; `ensureToastNode` returns null with no document, which is the guarded path).

- [ ] **Step 3: Commit**

```bash
git add shared-toast.js
git commit -m "feat: extract WTToast from shared-context"
```

### Task A2: Create `shared-courius.js`

**Files:**
- Create: `shared-courius.js`

- [ ] **Step 1: Write the module**

Move the Courius transfer + sanitize + import-history logic from `shared-context.js` (lines ~93–211), drop all `topic/tone/audience` code, and add one-time cleanup of the dead key.

```js
(function () {
  'use strict';

  var COURIUS_KEY = 'writingtools_courius_storage';
  var COURIUS_REV_KEY = 'writingtools_courius_revision_v1';
  var COURIUS_IMPORTS_KEY = 'writingtools_courius_imports_v1';
  var DEAD_CONTEXT_KEY = 'writingtools_context_v1';

  function nowIso() { return new Date().toISOString(); }

  // One-time removal of the retired global context bus key.
  try { localStorage.removeItem(DEAD_CONTEXT_KEY); } catch (_) {}

  function getImportHistory() {
    try {
      var raw = localStorage.getItem(COURIUS_IMPORTS_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }

  function writeImportHistory(items) {
    try { localStorage.setItem(COURIUS_IMPORTS_KEY, JSON.stringify(items.slice(0, 30))); } catch (_) {}
  }

  function buildImportHeader(source, stampIso) {
    var safeSource = String(source || 'tool').trim() || 'tool';
    var safeStamp = String(stampIso || nowIso());
    var sourceText = safeSource.replace(/[&<>"]/g, function (ch) {
      if (ch === '&') return '&amp;';
      if (ch === '<') return '&lt;';
      if (ch === '>') return '&gt;';
      return '&quot;';
    });
    return '<div class="action courius-import-marker" data-import-source="' +
      safeSource.replace(/"/g, '&quot;') + '" data-import-time="' +
      safeStamp.replace(/"/g, '&quot;') + '">' +
      '<span class="context-source-badge">' + sourceText.toUpperCase() + '</span>' +
      '<span class="context-source-meta">imported ' + new Date(safeStamp).toLocaleString() + '</span>' +
      '</div>';
  }

  function sanitizePayload(html) {
    var raw = String(html || '');
    if (!raw.trim()) return '';
    if (typeof document === 'undefined' || !document.createElement) {
      return raw
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
        .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
        .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
        .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, '');
    }
    var container = document.createElement('div');
    container.innerHTML = raw;
    container.querySelectorAll('script,iframe,object,embed,link,meta').forEach(function (node) { node.remove(); });
    container.querySelectorAll('*').forEach(function (el) {
      Array.prototype.slice.call(el.attributes || []).forEach(function (attr) {
        var name = String(attr && attr.name || '').toLowerCase();
        var value = String(attr && attr.value || '');
        if (!name) return;
        if (name.indexOf('on') === 0) { el.removeAttribute(attr.name); return; }
        if ((name === 'href' || name === 'src') && /^\s*javascript:/i.test(value)) el.removeAttribute(attr.name);
      });
    });
    return container.innerHTML;
  }

  function transfer(htmlPayload, sourceLabel, modeLabel) {
    var payload = sanitizePayload(htmlPayload).trim();
    if (!payload) return false;
    var source = String(sourceLabel || 'tool').trim() || 'tool';
    var mode = String(modeLabel || 'append').trim().toLowerCase() === 'overwrite' ? 'overwrite' : 'append';
    var stampIso = nowIso();
    var header = buildImportHeader(source, stampIso);

    for (var i = 0; i < 3; i += 1) {
      var current = '', rev = 0;
      try {
        current = localStorage.getItem(COURIUS_KEY) || '';
        rev = parseInt(localStorage.getItem(COURIUS_REV_KEY) || '0', 10) || 0;
      } catch (_) {}
      var hasCurrent = !!(current && current.trim());
      var next = (mode === 'overwrite' || !hasCurrent)
        ? header + payload
        : current + '<div class="action"><br></div>' + header + payload;
      try {
        localStorage.setItem(COURIUS_KEY, next);
        localStorage.setItem(COURIUS_REV_KEY, String(rev + 1));
        var history = getImportHistory();
        history.unshift({
          id: 'imp_' + Date.now() + '_' + Math.floor(Math.random() * 100000),
          source: source, mode: mode, createdAt: stampIso, payload: payload
        });
        writeImportHistory(history);
        return true;
      } catch (_) {}
    }
    return false;
  }

  window.WTCourius = {
    storageKey: COURIUS_KEY,
    append: function (html, source) { return transfer(html, source, 'append'); },
    overwrite: function (html, source) { return transfer(html, source, 'overwrite'); },
    sanitize: sanitizePayload,
    getImportHistory: getImportHistory
  };
})();
```

- [ ] **Step 2: Verify it loads in browser context (smoke)**

Run: `node -e "global.window={};global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};global.document=undefined;require('./shared-courius.js');console.log(typeof window.WTCourius.append, typeof window.WTCourius.sanitize)"`
Expected: prints `function function`.

- [ ] **Step 3: Commit**

```bash
git add shared-courius.js
git commit -m "feat: extract WTCourius handoff from shared-context"
```

### Task A3: Rewire Courius.html to new modules

**Files:**
- Modify: `Courius.html` (script includes near top of `<script>`/`<head>`; the `WTContextBus` references at lines ~872, ~877, ~1156–1157)

- [ ] **Step 1: Replace the script include**

Find the `<script src="shared-context.js"></script>` tag and replace with:
```html
<script src="shared-toast.js"></script>
<script src="shared-courius.js"></script>
```

- [ ] **Step 2: Remove the context-tip subscription**

At lines ~1156–1157, delete:
```js
if (window.WTContextBus && typeof window.WTContextBus.subscribe === 'function') {
    window.WTContextBus.subscribe(() => updateContextTip());
}
```
Then delete the `updateContextTip` function definition and any DOM node/markup it targeted (the "context tip" element). Search `updateContextTip` to find all references and remove them.

- [ ] **Step 3: Rewire remaining bus reads at lines ~872, ~877**

Replace any `window.WTContextBus.getContext()` / `.mergeContext(...)` usage in this region. If it only fed `updateContextTip`, delete it. If it produced toasts, replace `window.WTContextBus.notify(...)` with `window.WTToast.notify(...)`. Courius reads its own storage via `localStorage.getItem(WTCourius.storageKey)` — keep that mechanism (it already reads `writingtools_courius_storage`).

- [ ] **Step 4: Verify in browser**

Run: `bash scripts/smoke-suite.sh` (or open `Courius.html` via a local server).
Expected: Courius loads with no console errors; no orphaned "context tip" UI; importing from another tool still appears.

- [ ] **Step 5: Commit**

```bash
git add Courius.html
git commit -m "refactor: rewire Courius to WTCourius/WTToast"
```

### Task A4: Rewire Wribbon.html

**Files:**
- Modify: `Wribbon.html` (script include; `WTContextBus` at lines ~821–822, ~830, ~911, ~1200)

- [ ] **Step 1: Replace script include** — swap `shared-context.js` for `shared-toast.js` + `shared-courius.js`.

- [ ] **Step 2: Remove `syncContext` + subscription**

Delete the `syncContext()` method and the subscribe block at lines ~821–824:
```js
if (window.WTContextBus && typeof window.WTContextBus.subscribe === 'function') {
    window.WTContextBus.subscribe(() => { /* ... */ });
}
```
Remove `this.state.sharedContext` and any UI that displayed it. Remove the call site that invokes `syncContext()`.

- [ ] **Step 3: Rewire `notifyReliability` (line ~911)**

```js
notifyReliability(message, level = 'info') {
    if (window.WTToast && typeof window.WTToast.notify === 'function') {
        window.WTToast.notify(message, level);
    }
},
```

- [ ] **Step 4: Rewire `sendToCourius` (line ~1200)**

Replace the `bus.mergeContext({...})` + `bus.appendToCourius(...)` sequence with a single call. Drop the `mergeContext` entirely:
```js
sendToCourius() {
    if (!this.state.text.trim()) return;
    var html = this.buildCouriusHtml ? this.buildCouriusHtml() : ('<div class="action">' + this.escapeHtml(this.state.text) + '</div>');
    var ok = window.WTCourius && window.WTCourius.append(html, 'Wribbon');
    this.notifyReliability(ok ? 'Sent to Courius.' : 'Could not send to Courius.', ok ? 'info' : 'error');
},
```
(Preserve whatever existing HTML-building/escaping helper Wribbon already uses for the payload; only the bus call changes. If Wribbon previously built the payload inline, keep that exact payload string and pass it to `WTCourius.append`.)

- [ ] **Step 5: Verify** — `bash scripts/smoke-suite.sh`; confirm Wribbon loads clean, toasts work, send-to-Courius lands.

- [ ] **Step 6: Commit**

```bash
git add Wribbon.html
git commit -m "refactor: rewire Wribbon to WTCourius/WTToast"
```

### Task A5: Rewire WitherNaught.html

**Files:**
- Modify: `WitherNaught.html` (script include; `WTContextBus` at lines ~649, ~663, ~697, ~1622–1623)

- [ ] **Step 1: Replace script include** — swap to `shared-toast.js` + `shared-courius.js`.

- [ ] **Step 2: Remove the subscribe block (lines ~1622–1623)** and any context-display UI it updated.

- [ ] **Step 3: Rewire the three bus usages (lines ~649, ~663, ~697)** — for each, if it is `.notify(...)` → `window.WTToast.notify(...)`; if it is `.appendToCourius(...)` → `window.WTCourius.append(...)`; if it is `.getContext()`/`.mergeContext(...)` feeding context UI → delete it.

- [ ] **Step 4: Verify** — `bash scripts/smoke-suite.sh`; WitherNaught loads clean.

- [ ] **Step 5: Commit**

```bash
git add WitherNaught.html
git commit -m "refactor: rewire WitherNaught to WTCourius/WTToast"
```

### Task A6: Rewire Synax.html

**Files:**
- Modify: `Synax.html` (script include; `WTContextBus` at lines ~507, ~687, ~693)

- [ ] **Step 1: Replace script include** — swap to `shared-toast.js` + `shared-courius.js`.

- [ ] **Step 2: Rewire the three usages** — same rules as Task A5 Step 3 (notify → `WTToast`, appendToCourius → `WTCourius.append`, context reads → delete).

- [ ] **Step 3: Verify** — `bash scripts/smoke-suite.sh`; Synax loads clean.

- [ ] **Step 4: Commit**

```bash
git add Synax.html
git commit -m "refactor: rewire Synax to WTCourius/WTToast"
```

### Task A7: Rewire remaining tools and manifest

**Files:**
- Modify: `index.html` (line ~ `WTContextBus`), `Joterie.html`, `ThisButThat.html`, `BeatHive.html`, `shared-tool-manifest.js`

- [ ] **Step 1: For each tool that included `shared-context.js`**, replace the include. If the tool only used `notify`, include `shared-toast.js`. If it used the Courius handoff, also include `shared-courius.js`. If it used the global context object, remove that usage.

For each, grep first: `grep -n "WTContextBus" <file>` and rewire per A5 Step 3 rules. (`Joterie.html`, `ThisButThat.html`, `BeatHive.html`, `index.html` each have a single reference per the audit.)

- [ ] **Step 2: Update `shared-tool-manifest.js`** — remove any `shared-context.js` reference; if it lists per-tool shared scripts, update them to the new file names.

- [ ] **Step 3: Verify** — `bash scripts/smoke-suite.sh` runs all tools; confirm zero `WTContextBus` references remain: `grep -rn "WTContextBus" *.html *.js` returns nothing.

- [ ] **Step 4: Commit**

```bash
git add index.html Joterie.html ThisButThat.html BeatHive.html shared-tool-manifest.js
git commit -m "refactor: rewire remaining tools off context bus"
```

### Task A8: Delete `shared-context.js`

**Files:**
- Delete: `shared-context.js`

- [ ] **Step 1: Confirm no references remain**

Run: `grep -rn "shared-context.js\|WTContextBus" .` (excluding `docs/`)
Expected: no matches.

- [ ] **Step 2: Delete and verify**

```bash
git rm shared-context.js
bash scripts/smoke-suite.sh
```
Expected: smoke suite passes for all tools.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove retired shared-context bus"
```

---

## STREAM B — Courius exports to US spec-script standard

### Task B1: Create pure formatting module `courius-format.js` with RTF prefixes

**Files:**
- Create: `courius-format.js`
- Test: `tests/courius-format.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/courius-format.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const WT = require('../courius-format.js');

test('rtfPrefix: scene heading is left-aligned, flush, plain', () => {
  assert.strictEqual(WT.rtfPrefix('scene-heading'), '\\pard\\sa240\\sb0\\li0\\ri0\\ql ');
});
test('rtfPrefix: action is left-aligned, flush', () => {
  assert.strictEqual(WT.rtfPrefix('action'), '\\pard\\sa240\\sb0\\li0\\ri0\\ql ');
});
test('rtfPrefix: character indents 3.7in from page edge (li3168)', () => {
  assert.strictEqual(WT.rtfPrefix('character'), '\\pard\\sa240\\sb0\\li3168\\ri0\\ql ');
});
test('rtfPrefix: dialogue li1440 ri2160', () => {
  assert.strictEqual(WT.rtfPrefix('dialogue'), '\\pard\\sa240\\sb0\\li1440\\ri2160\\ql ');
});
test('rtfPrefix: parenthetical li2304 ri2880 italic', () => {
  assert.strictEqual(WT.rtfPrefix('parenthetical'), '\\pard\\sa240\\sb0\\li2304\\ri2880\\ql\\i ');
});
test('rtfPrefix: transition right-aligned, flush', () => {
  assert.strictEqual(WT.rtfPrefix('transition'), '\\pard\\sa240\\sb0\\li0\\ri0\\qr ');
});
test('rtfPrefix: unknown type defaults to action', () => {
  assert.strictEqual(WT.rtfPrefix('weird'), '\\pard\\sa240\\sb0\\li0\\ri0\\ql ');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/courius-format.test.js`
Expected: FAIL — `Cannot find module '../courius-format.js'`.

- [ ] **Step 3: Write minimal implementation**

```js
// courius-format.js
(function (root) {
  'use strict';

  // All indents in twips (1440/inch), measured from a 1.5" left / 1" right page margin.
  function rtfPrefix(type) {
    switch (type) {
      case 'scene-heading': return '\\pard\\sa240\\sb0\\li0\\ri0\\ql ';
      case 'character':     return '\\pard\\sa240\\sb0\\li3168\\ri0\\ql ';
      case 'parenthetical': return '\\pard\\sa240\\sb0\\li2304\\ri2880\\ql\\i ';
      case 'dialogue':      return '\\pard\\sa240\\sb0\\li1440\\ri2160\\ql ';
      case 'transition':    return '\\pard\\sa240\\sb0\\li0\\ri0\\qr ';
      case 'action':
      default:              return '\\pard\\sa240\\sb0\\li0\\ri0\\ql ';
    }
  }

  function rtfSuffix(type) {
    return type === 'parenthetical' ? '\\i0\\par' : '\\par';
  }

  var WTScreenplay = { rtfPrefix: rtfPrefix, rtfSuffix: rtfSuffix };
  if (typeof module !== 'undefined' && module.exports) module.exports = WTScreenplay;
  if (root) root.WTScreenplay = WTScreenplay;
})(typeof window !== 'undefined' ? window : null);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/courius-format.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add courius-format.js tests/courius-format.test.js
git commit -m "feat: pure RTF screenplay paragraph prefixes (US spec)"
```

### Task B2: Add RTF escaping + full-document assembly to `courius-format.js`

**Files:**
- Modify: `courius-format.js`
- Test: `tests/courius-format.test.js`

- [ ] **Step 1: Write the failing test**

Append:
```js
test('escapeRtf escapes backslash, braces, newlines', () => {
  assert.strictEqual(WT.escapeRtf('a\\b{c}\nd'), 'a\\\\b\\{c\\}\\line d');
});
test('buildRtf: 12pt Courier, blank elements become \\par, types formatted', () => {
  const rtf = WT.buildRtf({
    title: 'MY FILM', author: 'Jane Doe', contact: 'jane@x.com',
    elements: [
      { type: 'scene-heading', text: 'INT. ROOM - DAY' },
      { type: 'action', text: 'A pause.' },
      { type: 'character', text: 'JANE' },
      { type: 'dialogue', text: 'Hello.' }
    ]
  });
  assert.ok(rtf.startsWith('{\\rtf1\\ansi\\deff0'));
  assert.ok(rtf.includes('{\\fonttbl{\\f0 Courier New;}}'));
  assert.ok(rtf.includes('\\fs24'));      // 12pt body
  assert.ok(!rtf.includes('\\fs32'));     // no 16pt anywhere
  assert.ok(!rtf.includes('\\fs20'));     // no 10pt anywhere
  assert.ok(rtf.includes('\\li3168'));    // character indent present
  assert.ok(rtf.includes('INT. ROOM - DAY'));
  assert.ok(rtf.trim().endsWith('}'));
});
test('buildRtf: title page is all 12pt centered', () => {
  const rtf = WT.buildRtf({ title: 'T', author: 'A', contact: 'C', elements: [] });
  // title, author, contact each centered (\qc) at fs24
  assert.ok(rtf.includes('\\pard\\qc\\sa240\\sb0\\fs24'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/courius-format.test.js`
Expected: FAIL — `WT.escapeRtf is not a function`.

- [ ] **Step 3: Add implementation**

Inside the IIFE, before the `WTScreenplay` object:
```js
  function escapeRtf(text) {
    return String(text || '')
      .replace(/\\/g, '\\\\')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\r\n|\r|\n/g, '\\line ');
  }

  function buildRtf(doc) {
    var d = doc || {};
    var sections = [];
    if (d.title || d.author || d.contact) {
      if (d.title)   sections.push('\\pard\\qc\\sa240\\sb0\\fs24\\ul ' + escapeRtf(d.title) + '\\ul0\\par');
      if (d.author)  sections.push('\\pard\\qc\\sa240\\sb0\\fs24 ' + escapeRtf(d.author) + '\\par');
      if (d.contact) sections.push('\\pard\\qc\\sa240\\sb0\\fs24 ' + escapeRtf(d.contact) + '\\par');
      sections.push('\\pard\\par');
    }
    (d.elements || []).forEach(function (el) {
      var type = (el && el.type) || 'action';
      var text = String((el && el.text) || '').trim();
      if (!text) { sections.push('\\pard\\par'); return; }
      sections.push(rtfPrefix(type) + escapeRtf(text) + rtfSuffix(type));
    });
    return '{\\rtf1\\ansi\\deff0' +
      '{\\fonttbl{\\f0 Courier New;}}' +
      '\\viewkind4\\uc1\\pard\\f0\\fs24 ' +
      sections.join('') +
      '}';
  }
```
Add `escapeRtf: escapeRtf, buildRtf: buildRtf` to the `WTScreenplay` object.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/courius-format.test.js`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add courius-format.js tests/courius-format.test.js
git commit -m "feat: RTF document assembly, all 12pt Courier"
```

### Task B3: Add FDX assembly to `courius-format.js`

**Files:**
- Modify: `courius-format.js`
- Test: `tests/courius-format.test.js`

- [ ] **Step 1: Write the failing test**

```js
test('buildFdx maps element types and escapes XML', () => {
  const fdx = WT.buildFdx({
    title: 'My <Film>', author: 'A & B',
    elements: [
      { type: 'scene-heading', text: 'INT. ROOM - DAY' },
      { type: 'character', text: 'JANE' },
      { type: 'dialogue', text: 'Hi & bye' },
      { type: 'parenthetical', text: '(softly)' },
      { type: 'transition', text: 'CUT TO:' },
      { type: 'action', text: 'A pause.' }
    ]
  });
  assert.ok(fdx.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(fdx.includes('<Title>My &lt;Film&gt;</Title>'));
  assert.ok(fdx.includes('<Author>A &amp; B</Author>'));
  assert.ok(fdx.includes('<Paragraph Type="Scene Heading">'));
  assert.ok(fdx.includes('<Paragraph Type="Character">'));
  assert.ok(fdx.includes('<Paragraph Type="Dialogue"><Text>Hi &amp; bye</Text>'));
  assert.ok(fdx.includes('<Paragraph Type="Parenthetical">'));
  assert.ok(fdx.includes('<Paragraph Type="Transition">'));
  assert.ok(fdx.includes('<Paragraph Type="Action">'));
  assert.ok(fdx.endsWith('</Content></FinalDraft>'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/courius-format.test.js`
Expected: FAIL — `WT.buildFdx is not a function`.

- [ ] **Step 3: Add implementation**

```js
  function escapeXml(unsafe) {
    return String(unsafe || '').replace(/[<>&'"]/g, function (c) {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
      }
    });
  }

  function fdxType(type) {
    switch (type) {
      case 'scene-heading': return 'Scene Heading';
      case 'character':     return 'Character';
      case 'dialogue':      return 'Dialogue';
      case 'parenthetical': return 'Parenthetical';
      case 'transition':    return 'Transition';
      default:              return 'Action';
    }
  }

  function buildFdx(doc) {
    var d = doc || {};
    var xml = '<?xml version="1.0" encoding="UTF-8"?><FinalDraft DocumentType="Script" Template="No" Version="1">';
    if (d.title || d.author) {
      xml += '<TitlePage><Title>' + escapeXml(d.title || '') + '</Title>' +
             '<Author>' + escapeXml(d.author || '') + '</Author></TitlePage>';
    }
    xml += '<Content>';
    (d.elements || []).forEach(function (el) {
      var type = (el && el.type) || 'action';
      xml += '<Paragraph Type="' + fdxType(type) + '"><Text>' +
             escapeXml(String((el && el.text) || '').trim()) + '</Text></Paragraph>';
    });
    xml += '</Content></FinalDraft>';
    return xml;
  }
```
Add `escapeXml: escapeXml, fdxType: fdxType, buildFdx: buildFdx` to `WTScreenplay`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/courius-format.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add courius-format.js tests/courius-format.test.js
git commit -m "feat: FDX document assembly with type mapping"
```

### Task B4: Add DOM→elements extractor that strips artifacts (test the filter)

**Files:**
- Modify: `courius-format.js`
- Test: `tests/courius-format.test.js`

- [ ] **Step 1: Write the failing test**

`extractElements` takes a flat array of `{ className, text }` (what Courius will produce by walking `EDITOR.children`) and returns clean `{type, text}` records, dropping title-page and import/snapshot markers.

```js
test('extractElements drops import markers, snapshots, and title-page container', () => {
  const raw = [
    { className: 'title-page-container', text: 'MY FILM' },
    { className: 'action courius-import-marker', text: 'WRIBBON imported 1/2/2026' },
    { className: 'scene-heading', text: 'INT. ROOM - DAY' },
    { className: 'action', text: 'A pause.' },
    { className: 'action snapshot-marker', text: 'SNAPSHOT restored' }
  ];
  const out = WT.extractElements(raw);
  assert.deepStrictEqual(out, [
    { type: 'scene-heading', text: 'INT. ROOM - DAY' },
    { type: 'action', text: 'A pause.' }
  ]);
});
test('extractElements normalizes class to first known token', () => {
  const out = WT.extractElements([{ className: 'character extra-class', text: 'JANE' }]);
  assert.deepStrictEqual(out, [{ type: 'character', text: 'JANE' }]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/courius-format.test.js`
Expected: FAIL — `WT.extractElements is not a function`.

- [ ] **Step 3: Add implementation**

```js
  var KNOWN_TYPES = ['scene-heading', 'character', 'parenthetical', 'dialogue', 'transition', 'action'];
  var SKIP_CLASSES = ['title-page-container', 'courius-import-marker', 'snapshot-marker'];

  function classifyType(className) {
    var tokens = String(className || '').split(/\s+/);
    for (var i = 0; i < tokens.length; i += 1) {
      if (KNOWN_TYPES.indexOf(tokens[i]) !== -1) return tokens[i];
    }
    return 'action';
  }

  function shouldSkip(className) {
    var tokens = String(className || '').split(/\s+/);
    return tokens.some(function (t) { return SKIP_CLASSES.indexOf(t) !== -1; });
  }

  function extractElements(rawList) {
    return (rawList || []).reduce(function (acc, item) {
      if (!item || shouldSkip(item.className)) return acc;
      acc.push({ type: classifyType(item.className), text: String(item.text || '') });
      return acc;
    }, []);
  }
```
Add `extractElements: extractElements, classifyType: classifyType` to `WTScreenplay`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/courius-format.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add courius-format.js tests/courius-format.test.js
git commit -m "feat: extractElements strips title page and tool artifacts"
```

### Task B5: Wire Courius.html exports to `WTScreenplay`

**Files:**
- Modify: `Courius.html` (`downloadFDX` ~2076–2109, `escapeXml` ~2111, `escapeRtf` ~2123, `paragraphPrefixForType` ~2131, `buildRtfDocument` ~2149, `downloadRTF` ~2184; script includes)

- [ ] **Step 1: Add the script include** — near the other shared script tags:
```html
<script src="courius-format.js"></script>
```

- [ ] **Step 2: Add a DOM-walk helper that produces the raw list**

Add near the export functions:
```js
function collectScriptElements() {
    return Array.from(EDITOR.children).map(function (div) {
        return { className: div.className || '', text: getPureText(div).trim() };
    });
}
function collectTitlePage() {
    var tp = EDITOR.querySelector('.title-page-container');
    if (!tp) return {};
    return {
        title: (tp.querySelector('.tp-title') && tp.querySelector('.tp-title').innerText) || '',
        author: (tp.querySelector('.tp-author') && tp.querySelector('.tp-author').innerText) || '',
        contact: (tp.querySelector('.tp-contact') && tp.querySelector('.tp-contact').innerText) || ''
    };
}
```

- [ ] **Step 3: Replace `downloadFDX`**

```js
function downloadFDX() {
    var tp = collectTitlePage();
    var elements = WTScreenplay.extractElements(collectScriptElements());
    var xml = WTScreenplay.buildFdx({ title: tp.title, author: tp.author, elements: elements });
    var blob = new Blob([xml], { type: 'text/xml' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'script.fdx';
    a.click();
    URL.revokeObjectURL(a.href);
}
```

- [ ] **Step 4: Replace `downloadRTF` and delete the now-dead local helpers**

```js
function downloadRTF() {
    var tp = collectTitlePage();
    var elements = WTScreenplay.extractElements(collectScriptElements());
    var rtf = WTScreenplay.buildRtf({ title: tp.title, author: tp.author, contact: tp.contact, elements: elements });
    var blob = new Blob([rtf], { type: 'application/rtf' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'script.rtf';
    a.click();
    URL.revokeObjectURL(a.href);
}
```
Delete the local `escapeXml`, `escapeRtf`, `paragraphPrefixForType`, and `buildRtfDocument` definitions (now in `courius-format.js`). Search for any other callers of those names before deleting; if `escapeXml`/`escapeHtml` is used elsewhere in Courius, keep that other copy or point it at `WTScreenplay.escapeXml`.

- [ ] **Step 5: Verify exports manually**

Open Courius via local server. Create a script with: title page, one of each element type, and one imported block (use another tool's "Send to Courius" so a `courius-import-marker` div exists). Click Export RTF and Export FDX.
Expected:
- RTF opens in Word/TextEdit as 12pt Courier throughout, character indented, dialogue narrower, transition right-aligned, title page centered 12pt.
- **Neither file contains the text "imported" or the source badge.**

- [ ] **Step 6: Commit**

```bash
git add Courius.html
git commit -m "refactor: Courius exports use WTScreenplay, strip artifacts"
```

### Task B6: Fix print/PDF page-number size and confirm artifact hiding

**Files:**
- Modify: `Courius.html` (`@page` block ~365–377, `@media print` ~379–391)

- [ ] **Step 1: Change page-number font-size to 12pt**

In the `@page { @bottom-right { ... } }` rule, change `font-size: 16pt;` to `font-size: 12pt;`.

- [ ] **Step 2: Extend marker hiding in `@media print`**

Ensure the print block hides every injected marker. Current line hides `.courius-import-marker`; add snapshot markers if they use a different class:
```css
.courius-import-marker, .snapshot-marker { display: none !important; }
```
(Confirm the actual snapshot class name by grepping the snapshot-render code around lines ~962–965; match whatever class it emits.)

- [ ] **Step 3: Verify print output**

Open Courius with an imported block present → browser Print → Save as PDF.
Expected: PDF shows only the script and 12pt page numbers; no import badge, no suite link, no toolbars/icons.

- [ ] **Step 4: Commit**

```bash
git add Courius.html
git commit -m "fix: 12pt page numbers; hide all tool artifacts in print"
```

---

## STREAM C — CharacterForge → Socratic interview

### Task C1: Create the question bank `characterforge-questions.js`

**Files:**
- Create: `characterforge-questions.js`
- Test: `tests/characterforge-questions.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/characterforge-questions.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const BANK = require('../characterforge-questions.js');

test('bank has the six themes in order', () => {
  assert.deepStrictEqual(BANK.themes.map(t => t.id),
    ['wound', 'fear', 'contradiction', 'desire', 'mask', 'relationships']);
});
test('every theme has at least 4 questions, each with id+prompt', () => {
  BANK.themes.forEach(theme => {
    assert.ok(theme.questions.length >= 4, theme.id + ' needs >=4 questions');
    theme.questions.forEach(q => {
      assert.ok(typeof q.id === 'string' && q.id.length > 0);
      assert.ok(typeof q.prompt === 'string' && q.prompt.length > 0);
    });
  });
});
test('all question ids are globally unique', () => {
  const ids = BANK.themes.flatMap(t => t.questions.map(q => q.id));
  assert.strictEqual(new Set(ids).size, ids.length);
});
test('follow-ups, when present, declare a trigger and prompt', () => {
  BANK.themes.flatMap(t => t.questions).forEach(q => {
    (q.followUps || []).forEach(f => {
      assert.ok(['minLength', 'keyword'].includes(f.trigger.type));
      assert.ok(typeof f.prompt === 'string' && f.prompt.length > 0);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/characterforge-questions.test.js`
Expected: FAIL — `Cannot find module '../characterforge-questions.js'`.

- [ ] **Step 3: Write the question bank**

Author real questions (4–8 per theme). Example content (expand each theme to ≥4):
```js
(function (root) {
  'use strict';
  var BANK = {
    themes: [
      { id: 'wound', label: 'The Wound', questions: [
        { id: 'wound-origin', prompt: 'What happened to your character that they have never fully told anyone?',
          followUps: [{ trigger: { type: 'keyword', value: 'family' }, prompt: 'Who in the family knows, and why has no one spoken of it?' }] },
        { id: 'wound-scar', prompt: 'What does your character do now, in small daily ways, because of that old hurt?' },
        { id: 'wound-blame', prompt: 'Who does your character blame for it — and is that the truth?' },
        { id: 'wound-cost', prompt: 'What has carrying this wound cost them that they pretend not to miss?',
          followUps: [{ trigger: { type: 'minLength', value: 240 }, prompt: 'You wrote a lot. What is the one sentence underneath all of it?' }] }
      ]},
      { id: 'fear', label: 'The Fear', questions: [
        { id: 'fear-worst', prompt: 'What is the outcome your character would do almost anything to avoid?' },
        { id: 'fear-tell', prompt: 'How does their body betray that fear before their words do?' },
        { id: 'fear-mask', prompt: 'What do they pretend to fear instead, to hide the real one?' },
        { id: 'fear-trigger', prompt: 'What ordinary thing can suddenly bring the fear roaring back?' }
      ]},
      { id: 'contradiction', label: 'The Contradiction', questions: [
        { id: 'contra-belief', prompt: 'What is your character certain they are right about — and quietly wrong about?' },
        { id: 'contra-act', prompt: 'Where do their actions contradict the values they claim?' },
        { id: 'contra-defend', prompt: 'How do they explain that gap to themselves?' },
        { id: 'contra-witness', prompt: 'Who has noticed the contradiction, and what did they do about it?' }
      ]},
      { id: 'desire', label: 'The Desire', questions: [
        { id: 'desire-want', prompt: 'What does your character want badly enough to risk looking foolish for?' },
        { id: 'desire-secret', prompt: 'What do they want that they would never admit out loud?' },
        { id: 'desire-price', prompt: 'What are they willing to sacrifice to get it — and what should they not be?' },
        { id: 'desire-substitute', prompt: 'What smaller thing do they chase instead, because the real desire feels impossible?' }
      ]},
      { id: 'mask', label: 'The Mask', questions: [
        { id: 'mask-public', prompt: 'Who does your character pretend to be when they walk into a room?' },
        { id: 'mask-slip', prompt: 'In what moment does the mask slip, and who gets to see it?' },
        { id: 'mask-cost', prompt: 'What does maintaining the mask exhaust in them?' },
        { id: 'mask-origin', prompt: 'When did they first learn they needed it?' }
      ]},
      { id: 'relationships', label: 'The Relationships', questions: [
        { id: 'rel-closest', prompt: 'Who knows your character best, and what do they still get wrong about them?' },
        { id: 'rel-debt', prompt: 'Who does your character owe — a debt of money, guilt, or love — and how do they carry it?' },
        { id: 'rel-enemy', prompt: 'Who would your character cross the street to avoid, and why?' },
        { id: 'rel-change', prompt: 'Which relationship is quietly changing them right now, for better or worse?' }
      ]}
    ]
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = BANK;
  if (root) root.WTCharacterQuestions = BANK;
})(typeof window !== 'undefined' ? window : null);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/characterforge-questions.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add characterforge-questions.js tests/characterforge-questions.test.js
git commit -m "feat: CharacterForge Socratic question bank (6 themes)"
```

### Task C2: Create interview engine `characterforge-engine.js` (pure)

**Files:**
- Create: `characterforge-engine.js`
- Test: `tests/characterforge-engine.test.js`

- [ ] **Step 1: Write the failing test**

```js
const { test } = require('node:test');
const assert = require('node:assert');
const Engine = require('../characterforge-engine.js');
const BANK = require('../characterforge-questions.js');

test('buildQueue flattens themes into ordered base questions', () => {
  const q = Engine.buildQueue(BANK);
  assert.strictEqual(q[0].id, 'wound-origin');
  assert.ok(q.every(item => item.themeId && item.id && item.prompt));
});
test('evalFollowUps fires minLength trigger', () => {
  const q = { id: 'x', prompt: 'p', followUps: [{ trigger: { type: 'minLength', value: 10 }, prompt: 'deeper' }] };
  assert.deepStrictEqual(Engine.evalFollowUps(q, 'short'), []);
  assert.deepStrictEqual(
    Engine.evalFollowUps(q, 'this is definitely long enough').map(f => f.prompt),
    ['deeper']);
});
test('evalFollowUps fires keyword trigger case-insensitively', () => {
  const q = { id: 'x', prompt: 'p', followUps: [{ trigger: { type: 'keyword', value: 'family' }, prompt: 'who?' }] };
  assert.deepStrictEqual(Engine.evalFollowUps(q, 'My FAMILY did').map(f => f.prompt), ['who?']);
  assert.deepStrictEqual(Engine.evalFollowUps(q, 'nobody'), []);
});
test('buildSheet renders only answered sections as prose with theme headings', () => {
  const sheet = Engine.buildSheet(BANK, {
    'wound-origin': 'A car crash.',
    'fear-worst': 'Being forgotten.'
  });
  assert.ok(sheet.includes('The Wound'));
  assert.ok(sheet.includes('A car crash.'));
  assert.ok(sheet.includes('The Fear'));
  assert.ok(!sheet.includes('The Mask')); // no answers in that theme
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/characterforge-engine.test.js`
Expected: FAIL — `Cannot find module '../characterforge-engine.js'`.

- [ ] **Step 3: Write the engine**

```js
(function (root) {
  'use strict';

  function buildQueue(bank) {
    var out = [];
    (bank.themes || []).forEach(function (theme) {
      (theme.questions || []).forEach(function (q) {
        out.push({ themeId: theme.id, themeLabel: theme.label, id: q.id, prompt: q.prompt, followUps: q.followUps || [] });
      });
    });
    return out;
  }

  function evalFollowUps(question, answer) {
    var text = String(answer || '');
    return (question.followUps || []).filter(function (f) {
      var t = f.trigger || {};
      if (t.type === 'minLength') return text.length >= Number(t.value || 0);
      if (t.type === 'keyword') return text.toLowerCase().indexOf(String(t.value || '').toLowerCase()) !== -1;
      return false;
    });
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>]/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;';
    });
  }

  function buildSheet(bank, answers) {
    var a = answers || {};
    var parts = [];
    (bank.themes || []).forEach(function (theme) {
      var answered = (theme.questions || []).filter(function (q) {
        return a[q.id] && String(a[q.id]).trim();
      });
      if (!answered.length) return;
      parts.push('<h2 class="cf-theme">' + escapeHtml(theme.label) + '</h2>');
      answered.forEach(function (q) {
        parts.push('<p class="cf-answer">' + escapeHtml(String(a[q.id]).trim()) + '</p>');
      });
    });
    return parts.join('\n');
  }

  var Engine = { buildQueue: buildQueue, evalFollowUps: evalFollowUps, buildSheet: buildSheet };
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
  if (root) root.WTCharacterEngine = Engine;
})(typeof window !== 'undefined' ? window : null);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/characterforge-engine.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add characterforge-engine.js tests/characterforge-engine.test.js
git commit -m "feat: CharacterForge interview engine (queue, branching, sheet)"
```

### Task C3: Rebuild CharacterForge.html UI

**Files:**
- Modify: `CharacterForge.html` (full body/script replacement; remove word-bank arrays ~700–800 and dice/generate UI; remove `useCardInContext`/`inferContext`/`sendCardToCourius` card logic)

- [ ] **Step 1: Remove the old engine**

Delete the randomizer data arrays (`noun`/`adjective`/role banks), the dice/generate buttons and handlers, `render()` for cards, `useCardInContext`, `inferContext`, and card-state. Keep the page shell, header, fonts, and `shared-design.css` link.

- [ ] **Step 2: Add script includes** (before the inline script):
```html
<script src="shared-toast.js"></script>
<script src="shared-courius.js"></script>
<script src="characterforge-questions.js"></script>
<script src="characterforge-engine.js"></script>
```

- [ ] **Step 3: Add interview markup** — a single-question view:
```html
<main id="cf-app">
  <div id="cf-progress" class="cf-progress"></div>
  <h1 id="cf-theme-label" class="cf-theme-label"></h1>
  <p id="cf-question" class="cf-question"></p>
  <textarea id="cf-answer" class="cf-answer-input" rows="6"
            placeholder="Write in your own words…"></textarea>
  <div class="cf-nav">
    <button id="cf-back" type="button">Back</button>
    <button id="cf-next" type="button">Next</button>
  </div>
  <div id="cf-sheet" class="cf-sheet" hidden></div>
  <div class="cf-actions" hidden id="cf-finish-actions">
    <button id="cf-save" type="button">Save character</button>
    <button id="cf-to-courius" type="button">Send to Courius</button>
  </div>
</main>
```

- [ ] **Step 4: Add controller script** — drives queue, branching, persistence:
```js
(function () {
  'use strict';
  var BANK = window.WTCharacterQuestions;
  var Engine = window.WTCharacterEngine;
  var LIB_KEY = 'writingtools_characterforge_v2';

  var state = { queue: Engine.buildQueue(BANK), index: 0, answers: {}, inserted: {} };

  var els = {
    progress: document.getElementById('cf-progress'),
    themeLabel: document.getElementById('cf-theme-label'),
    question: document.getElementById('cf-question'),
    answer: document.getElementById('cf-answer'),
    back: document.getElementById('cf-back'),
    next: document.getElementById('cf-next'),
    sheet: document.getElementById('cf-sheet'),
    finishActions: document.getElementById('cf-finish-actions'),
    save: document.getElementById('cf-save'),
    toCourius: document.getElementById('cf-to-courius')
  };

  function current() { return state.queue[state.index]; }

  function render() {
    var q = current();
    if (!q) { return finish(); }
    var themeNum = BANK.themes.findIndex(function (t) { return t.id === q.themeId; }) + 1;
    els.progress.textContent = 'Theme ' + themeNum + ' of ' + BANK.themes.length;
    els.themeLabel.textContent = q.themeLabel || '';
    els.question.textContent = q.prompt;
    els.answer.value = state.answers[q.id] || '';
    els.back.disabled = state.index === 0;
    els.next.textContent = state.index === state.queue.length - 1 ? 'Finish' : 'Next';
  }

  function saveAnswer() {
    var q = current();
    if (!q) return;
    state.answers[q.id] = els.answer.value;
    // Insert follow-ups right after current question, once.
    if (!state.inserted[q.id]) {
      var ups = Engine.evalFollowUps(q, els.answer.value);
      if (ups.length) {
        var injected = ups.map(function (f, i) {
          return { themeId: q.themeId, themeLabel: q.themeLabel, id: q.id + '-fu' + i, prompt: f.prompt, followUps: [] };
        });
        state.queue.splice.apply(state.queue, [state.index + 1, 0].concat(injected));
        state.inserted[q.id] = true;
      }
    }
  }

  function finish() {
    var sheet = Engine.buildSheet(BANK, state.answers);
    els.sheet.innerHTML = sheet || '<p>No answers yet.</p>';
    els.sheet.hidden = false;
    els.finishActions.hidden = false;
    els.themeLabel.textContent = 'Your character';
    els.question.textContent = '';
    els.answer.hidden = true;
    els.next.hidden = true;
    els.back.hidden = true;
  }

  els.next.addEventListener('click', function () {
    saveAnswer();
    if (state.index < state.queue.length - 1) { state.index += 1; render(); }
    else finish();
  });
  els.back.addEventListener('click', function () {
    saveAnswer();
    if (state.index > 0) { state.index -= 1; render(); }
  });
  els.save.addEventListener('click', function () {
    var name = prompt('Name this character:');
    if (!name) return;
    var lib = readLib();
    lib[Date.now()] = { name: name, answers: state.answers, createdAt: new Date().toISOString() };
    try { localStorage.setItem(LIB_KEY, JSON.stringify(lib)); } catch (_) {}
    window.WTToast && window.WTToast.notify('Character saved.');
  });
  els.toCourius.addEventListener('click', function () {
    var html = Engine.buildSheet(BANK, state.answers);
    var ok = window.WTCourius && window.WTCourius.append(html, 'CharacterForge');
    window.WTToast && window.WTToast.notify(ok ? 'Sent to Courius.' : 'Could not send.', ok ? 'info' : 'error');
  });

  function readLib() {
    try { return JSON.parse(localStorage.getItem(LIB_KEY) || '{}') || {}; } catch (_) { return {}; }
  }

  render();
})();
```

- [ ] **Step 5: Add styles** — append CharacterForge-specific rules (reuse `shared-design.css` tokens for color/spacing). Minimal:
```css
#cf-app { max-width: 680px; margin: 0 auto; padding: 2rem 1rem; }
.cf-progress { font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.6; }
.cf-theme-label { font-size: 1rem; opacity: 0.7; margin: 0.5rem 0; }
.cf-question { font-size: 1.4rem; line-height: 1.4; margin: 0.5rem 0 1rem; }
.cf-answer-input { width: 100%; font: inherit; padding: 0.75rem; }
.cf-nav { display: flex; gap: 0.5rem; margin-top: 1rem; }
.cf-sheet .cf-theme { margin-top: 1.5rem; }
.cf-sheet .cf-answer { white-space: pre-wrap; }
```

- [ ] **Step 6: Verify in browser** — open CharacterForge; walk the full interview; confirm a `minLength`/`keyword` follow-up appears; finish to see the prose sheet; Save (check localStorage `writingtools_characterforge_v2`); Send to Courius and confirm it lands.

- [ ] **Step 7: Run smoke suite**

Run: `bash scripts/smoke-suite.sh`
Expected: all tools including CharacterForge pass.

- [ ] **Step 8: Commit**

```bash
git add CharacterForge.html
git commit -m "feat: rebuild CharacterForge as Socratic interview"
```

### Task C4: Character library (list/open/rename/delete/duplicate)

**Files:**
- Modify: `CharacterForge.html`

- [ ] **Step 1: Add library markup** — a panel listing saved characters:
```html
<aside id="cf-library" class="cf-library">
  <h2>Saved characters</h2>
  <ul id="cf-library-list"></ul>
</aside>
```

- [ ] **Step 2: Add library controller**

```js
function renderLibrary() {
  var lib = readLib();
  var list = document.getElementById('cf-library-list');
  list.innerHTML = '';
  Object.keys(lib).sort().reverse().forEach(function (key) {
    var entry = lib[key];
    var li = document.createElement('li');
    li.innerHTML =
      '<span class="cf-lib-name"></span> ' +
      '<button data-act="open">Open</button>' +
      '<button data-act="rename">Rename</button>' +
      '<button data-act="dup">Duplicate</button>' +
      '<button data-act="del">Delete</button>';
    li.querySelector('.cf-lib-name').textContent = entry.name;
    li.querySelector('[data-act=open]').onclick = function () {
      state.answers = Object.assign({}, entry.answers); state.index = 0;
      state.queue = Engine.buildQueue(BANK); state.inserted = {};
      els.answer.hidden = false; els.next.hidden = false; els.back.hidden = false;
      els.sheet.hidden = true; els.finishActions.hidden = true; render();
    };
    li.querySelector('[data-act=rename]').onclick = function () {
      var n = prompt('New name:', entry.name); if (!n) return;
      lib[key].name = n; writeLib(lib); renderLibrary();
    };
    li.querySelector('[data-act=dup]').onclick = function () {
      var copy = JSON.parse(JSON.stringify(entry)); copy.name = entry.name + ' (copy)';
      lib[Date.now()] = copy; writeLib(lib); renderLibrary();
    };
    li.querySelector('[data-act=del]').onclick = function () {
      if (!confirm('Delete "' + entry.name + '"?')) return;
      delete lib[key]; writeLib(lib); renderLibrary();
    };
    list.appendChild(li);
  });
}
function writeLib(lib) { try { localStorage.setItem(LIB_KEY, JSON.stringify(lib)); } catch (_) {} }
```
Call `renderLibrary()` at startup and after every save.

- [ ] **Step 3: Verify** — save two characters; rename, duplicate, open, delete; confirm localStorage reflects each operation and no XSS (names render via `textContent`).

- [ ] **Step 4: Run smoke suite** — `bash scripts/smoke-suite.sh`.

- [ ] **Step 5: Commit**

```bash
git add CharacterForge.html
git commit -m "feat: CharacterForge character library"
```

---

## Final verification

- [ ] `node --test tests/` — all unit suites pass.
- [ ] `grep -rn "WTContextBus\|shared-context.js" *.html *.js` — no matches.
- [ ] `bash scripts/smoke-suite.sh` — all tools pass.
- [ ] Manual: export a full screenplay (FDX + RTF) with an imported block; confirm 12pt Courier, correct indents, and zero "imported" artifacts; print to PDF and confirm clean output.
- [ ] Update `README.md` / `ROADMAP.md` / `progress.md` to reflect the new module names and CharacterForge's new purpose. Commit.
```
