(function () {
  'use strict';

  if (window.WTCommandPaletteLoaded) return;
  window.WTCommandPaletteLoaded = true;

  var TOOL_LABEL = (function () {
    var path = (location.pathname || '').split('/').pop() || '';
    return path.replace('.html', '') || 'tool';
  })();

  function openTool(path) {
    var bus = window.WTContextBus;
    if (bus && typeof bus.mergeContext === 'function') {
      try { bus.mergeContext({ lastTool: TOOL_LABEL }); } catch (_) {}
    }
    window.open(path, '_blank', 'noopener');
  }

  function saveContext() {
    var bus = window.WTContextBus;
    if (bus && typeof bus.mergeContext === 'function') {
      try { bus.mergeContext({ lastTool: TOOL_LABEL }); } catch (_) {}
    }
  }

  function clearContext() {
    var bus = window.WTContextBus;
    if (bus && typeof bus.clearContext === 'function') {
      try { bus.clearContext(); } catch (_) {}
    }
  }

  function toggleTheme() {
    var htmlTheme = document.documentElement && document.documentElement.getAttribute('data-wt-theme');
    if (htmlTheme) {
      var nextTheme = htmlTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-wt-theme', nextTheme);
      try { localStorage.setItem('writingtools_theme', nextTheme); } catch (_) {}
      return;
    }
    if (document.body) document.body.classList.toggle('day-mode');
    try {
      var saved = localStorage.getItem('writingtools_theme') || 'dark';
      localStorage.setItem('writingtools_theme', saved === 'dark' ? 'light' : 'dark');
    } catch (_) {}
  }

  function wordCountFromText(text) {
    return (String(text || '').trim().match(/\S+/g) || []).length;
  }

  function getRecentCommands() {
    var out = [];
    try {
      var wribbonText = localStorage.getItem('writingtools_wribbon_text') || '';
      var wribbonWords = wordCountFromText(wribbonText);
      if (wribbonWords > 0) {
        out.push({
          id: 'recent-wribbon',
          title: 'Resume Wribbon Draft',
          desc: wribbonWords + ' words cached',
          keys: 'recent wribbon resume draft',
          run: function () { openTool('Wribbon.html'); }
        });
      }
    } catch (_) {}

    try {
      var couriusHtml = localStorage.getItem('writingtools_courius_storage') || '';
      var couriusWords = wordCountFromText(couriusHtml.replace(/<[^>]+>/g, ' '));
      if (couriusWords > 0) {
        out.push({
          id: 'recent-courius',
          title: 'Resume Courius Script',
          desc: couriusWords + ' words in screenplay buffer',
          keys: 'recent courius screenplay script',
          run: function () { openTool('Courius.html'); }
        });
      }
    } catch (_) {}

    try {
      var raw = localStorage.getItem('writingtools_beathive_sketches');
      var sketches = raw ? JSON.parse(raw) : [];
      if (Array.isArray(sketches) && sketches.length) {
        var recent = sketches
          .slice()
          .sort(function (a, b) {
            var ta = new Date(a && (a.updatedAt || a.createdAt) || 0).getTime();
            var tb = new Date(b && (b.updatedAt || b.createdAt) || 0).getTime();
            return tb - ta;
          })[0];
        var beatCount = Array.isArray(recent && recent.cells)
          ? recent.cells.filter(function (c) { return c && c.content && String(c.content).trim(); }).length
          : 0;
        out.push({
          id: 'recent-beathive',
          title: 'Resume BeatHive: ' + String((recent && recent.name) || 'Untitled').slice(0, 24),
          desc: beatCount + ' populated beats',
          keys: 'recent beathive beats structure',
          run: function () { openTool('BeatHive.html'); }
        });
      }
    } catch (_) {}

    try {
      var historyRaw = localStorage.getItem('flowstate_history_v13');
      var history = historyRaw ? JSON.parse(historyRaw) : [];
      if (Array.isArray(history) && history.length) {
        var latest = history[history.length - 1] || {};
        var words = parseInt(latest.words || 0, 10) || 0;
        out.push({
          id: 'recent-withernaught',
          title: 'Resume WitherNaught',
          desc: words > 0 ? ('last session ' + words + ' words') : 'resume session flow',
          keys: 'recent withernaught flow draft',
          run: function () { openTool('WitherNaught.html'); }
        });
      }
    } catch (_) {}

    return out;
  }

  function buildBaseCommands() {
    var list = [];
    if (window.WTCommands && typeof window.WTCommands.build === 'function') {
      list = window.WTCommands.build({
        openTool: openTool,
        saveContext: saveContext,
        clearContext: clearContext,
        toggleTheme: toggleTheme
      });
    } else {
      list = [
        { id: 'open-courius', title: 'Open Courius', desc: 'Screenplay editing and output', keys: 'screenplay courius', run: function () { openTool('Courius.html'); } }
      ];
    }
    var actions = window.WTToolActions && typeof window.WTToolActions === 'object' ? window.WTToolActions : null;
    if (actions && typeof actions.exportPrimary === 'function') {
      list.unshift({
        id: 'export-current',
        title: 'Export Current Session',
        desc: 'Run this tool\'s primary export action',
        keys: 'export save download print',
        run: function () { actions.exportPrimary(); }
      });
    }
    return list;
  }

  function injectStyles() {
    var style = document.createElement('style');
    style.textContent = [
      '.wtp-trigger{position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:1600;border:1px solid rgba(255,255,255,0.2);border-radius:999px;background:rgba(12,14,20,0.92);color:#fff;padding:10px 12px;font:600 11px/1.1 "IBM Plex Mono", monospace;letter-spacing:.06em;text-transform:uppercase;display:none;align-items:center;gap:6px;cursor:pointer;}',
      '.wtp-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.52);z-index:1700;display:none;align-items:flex-start;justify-content:center;padding:8vh 12px 18px;}',
      '.wtp-overlay.open{display:flex;}',
      '.wtp-panel{width:min(700px,100%);background:rgba(16,20,29,0.97);color:#f3f5f8;border:1px solid rgba(255,255,255,0.14);border-radius:12px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.42);}',
      '.wtp-input{width:100%;padding:13px 14px;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,0.12);color:inherit;font:500 15px/1.2 "Space Grotesk", sans-serif;}',
      '.wtp-input:focus{outline:none;}',
      '.wtp-list{max-height:min(62vh,480px);overflow:auto;}',
      '.wtp-item{width:100%;border:none;background:transparent;color:inherit;text-align:left;padding:11px 14px;border-bottom:1px solid rgba(255,255,255,0.08);display:grid;gap:4px;cursor:pointer;}',
      '.wtp-item:last-child{border-bottom:none;}',
      '.wtp-item strong{font:700 11px/1.2 "IBM Plex Mono", monospace;letter-spacing:.06em;text-transform:uppercase;}',
      '.wtp-item span{font:500 13px/1.3 "Space Grotesk", sans-serif;opacity:.75;}',
      '.wtp-item.active,.wtp-item:hover{background:rgba(255,255,255,0.09);}',
      '.wtp-empty{padding:14px;color:rgba(255,255,255,0.7);font:500 13px/1.3 "Space Grotesk", sans-serif;}',
      '.wtp-foot{padding:8px 12px;border-top:1px solid rgba(255,255,255,0.1);font:600 10px/1.2 "IBM Plex Mono", monospace;letter-spacing:.08em;text-transform:uppercase;opacity:.7;}',
      '@media (max-width: 1024px){.wtp-trigger{display:inline-flex;}}'
    ].join('');
    document.head.appendChild(style);
  }

  function init() {
    injectStyles();

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'wtp-trigger';
    trigger.id = 'wtp-trigger';
    trigger.setAttribute('aria-label', 'Open quick actions');
    trigger.textContent = 'Actions';

    var overlay = document.createElement('div');
    overlay.className = 'wtp-overlay';
    overlay.id = 'wtp-overlay';
    overlay.innerHTML = '' +
      '<div class="wtp-panel" role="dialog" aria-modal="true" aria-label="Command Palette">' +
        '<input id="wtp-input" class="wtp-input" type="text" placeholder="Jump to a tool or run an action..." autocomplete="off">' +
        '<div id="wtp-list" class="wtp-list"></div>' +
        '<div class="wtp-foot">Enter run · ↑↓ navigate · Esc close · Cmd/Ctrl+K toggle</div>' +
      '</div>';

    document.body.appendChild(trigger);
    document.body.appendChild(overlay);

    var input = document.getElementById('wtp-input');
    var list = document.getElementById('wtp-list');

    var commands = [];
    var filtered = [];
    var activeIndex = 0;
    var isOpen = false;

    function render() {
      if (!filtered.length) {
        list.innerHTML = '<div class="wtp-empty">No matching actions.</div>';
        return;
      }
      list.innerHTML = filtered.map(function (cmd, idx) {
        return '<button type="button" class="wtp-item ' + (idx === activeIndex ? 'active' : '') + '" data-cmd="' + cmd.id + '">' +
          '<strong>' + cmd.title + '</strong>' +
          '<span>' + cmd.desc + '</span>' +
        '</button>';
      }).join('');
    }

    function filterCommands(query) {
      var q = String(query || '').trim().toLowerCase();
      filtered = !q ? commands.slice() : commands.filter(function (cmd) {
        var hay = (cmd.title + ' ' + cmd.desc + ' ' + (cmd.keys || '')).toLowerCase();
        return hay.indexOf(q) >= 0;
      });
      activeIndex = 0;
      render();
    }

    function setOpen(next) {
      isOpen = !!next;
      overlay.classList.toggle('open', isOpen);
      if (isOpen) {
        commands = getRecentCommands().concat(buildBaseCommands());
        input.value = '';
        filtered = commands.slice();
        activeIndex = 0;
        render();
        setTimeout(function () { input.focus(); }, 0);
      }
    }

    function runActive() {
      var cmd = filtered[activeIndex];
      if (!cmd) return;
      setOpen(false);
      if (typeof cmd.run === 'function') cmd.run();
    }

    document.addEventListener('keydown', function (e) {
      var modK = (e.metaKey || e.ctrlKey) && String(e.key || '').toLowerCase() === 'k';
      if (modK) {
        e.preventDefault();
        setOpen(!isOpen);
        return;
      }
      if (!isOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = Math.min(activeIndex + 1, filtered.length - 1); render(); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = Math.max(activeIndex - 1, 0); render(); return; }
      if (e.key === 'Enter') { e.preventDefault(); runActive(); return; }
    });

    input.addEventListener('input', function () { filterCommands(input.value); });
    list.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-cmd]');
      if (!btn) return;
      var id = btn.getAttribute('data-cmd');
      var idx = filtered.findIndex(function (item) { return item.id === id; });
      if (idx >= 0) {
        activeIndex = idx;
        runActive();
      }
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) setOpen(false);
    });
    trigger.addEventListener('click', function () { setOpen(true); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
