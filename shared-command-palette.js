(function () {
  'use strict';

  if (window.WTCommandPaletteLoaded) return;
  window.WTCommandPaletteLoaded = true;

  var TOOL_LABEL = (function () {
    var path = (location.pathname || '').split('/').pop() || '';
    return path.replace('.html', '') || 'tool';
  })();

  function openTool(path) {
    window.open(path, '_blank', 'noopener');
  }

  function saveContext() {
    // no-op: context bus retired
  }

  function clearContext() {
    // no-op: context bus retired
  }

  function toggleTheme() {
    var htmlTheme = document.documentElement && document.documentElement.getAttribute('data-wt-theme');
    if (htmlTheme) {
      var nextTheme = htmlTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-wt-theme', nextTheme);
      try { localStorage.setItem('writingtools_theme', nextTheme); } catch (_) {}
      return;
    }
    var rootTheme = document.documentElement && document.documentElement.getAttribute('data-theme');
    if (rootTheme) {
      var nextRootTheme = rootTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nextRootTheme);
      try { localStorage.setItem('writingtools_theme', nextRootTheme); } catch (_) {}
      return;
    }
    if (document.body) document.body.classList.toggle('day-mode');
    try {
      var saved = localStorage.getItem('writingtools_theme') || 'dark';
      localStorage.setItem('writingtools_theme', saved === 'dark' ? 'light' : 'dark');
    } catch (_) {}
  }

  function getRecentCommands() {
    var sessions = window.WTRecentSessions && typeof window.WTRecentSessions.list === 'function'
      ? window.WTRecentSessions.list()
      : [];
    return sessions.map(function (session) {
      return {
        id: session.id,
        title: 'Resume ' + session.tool,
        desc: session.meta,
        keys: 'recent ' + String(session.tool || '').toLowerCase() + ' resume session',
        run: function () { openTool(session.path); }
      };
    });
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
    if (actions && typeof actions.handoffPrimary === 'function') {
      list.unshift({
        id: 'handoff-current',
        title: 'Send Current Session Forward',
        desc: 'Run this tool\'s primary downstream handoff',
        keys: 'handoff send beat hive courius next',
        run: function () { actions.handoffPrimary(); }
      });
    }
    return list;
  }

  // Detect whether the host tool is currently on a light surface, regardless
  // of which theme mechanism it uses, by sampling the effective background.
  function isLightSurface() {
    if (!document.body) return false;
    var nodes = [document.body, document.documentElement];
    for (var i = 0; i < nodes.length; i++) {
      var bg = getComputedStyle(nodes[i]).backgroundColor || '';
      var m = bg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
      if (!m) continue;
      if (m[4] !== undefined && parseFloat(m[4]) === 0) continue;
      var lum = (0.2126 * Number(m[1]) + 0.7152 * Number(m[2]) + 0.0722 * Number(m[3])) / 255;
      return lum > 0.55;
    }
    return false;
  }

  function injectStyles() {
    var EASE = 'cubic-bezier(.22,1,.36,1)';
    var style = document.createElement('style');
    style.textContent = [
      '.wtp-trigger{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:1600;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(18,20,26,.82);color:#f3f5f8;padding:9px 12px 9px 14px;font:600 11px/1.1 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.07em;text-transform:uppercase;display:inline-flex;align-items:center;gap:8px;cursor:pointer;-webkit-backdrop-filter:blur(10px) saturate(1.3);backdrop-filter:blur(10px) saturate(1.3);box-shadow:0 4px 16px rgba(0,0,0,.28);transition:transform 180ms ' + EASE + ',box-shadow 180ms ' + EASE + ',border-color 180ms ' + EASE + ',opacity 180ms ' + EASE + ';opacity:.82;}',
      '.wtp-trigger:hover{opacity:1;transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.34);border-color:rgba(253,25,200,.5);}',
      '.wtp-trigger:active{transform:translateY(0);}',
      '.wtp-trigger kbd{font:700 10px/1 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.04em;padding:3px 5px;border-radius:5px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);text-transform:none;}',
      '.wtp-light .wtp-trigger,.wtp-trigger.wtp-light{background:rgba(255,255,255,.85);color:#1c1c21;border-color:rgba(0,0,0,.14);box-shadow:0 4px 16px rgba(0,0,0,.12);}',
      '.wtp-trigger.wtp-light kbd{border-color:rgba(0,0,0,.18);background:rgba(0,0,0,.05);}',
      '.wtp-trigger.wtp-light:hover{border-color:rgba(201,20,159,.55);box-shadow:0 8px 24px rgba(0,0,0,.16);}',
      '@media (max-width:600px){.wtp-trigger kbd{display:none;}}',
      '.wtp-overlay{position:fixed;inset:0;background:rgba(8,8,12,.45);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);z-index:1700;display:none;align-items:flex-start;justify-content:center;padding:10vh 14px 20px;}',
      '.wtp-overlay.open{display:flex;animation:wtpFade 160ms ' + EASE + ';}',
      '.wtp-panel{width:min(640px,100%);background:rgba(19,21,28,.97);color:#f3f5f8;border:1px solid rgba(255,255,255,.12);border-radius:16px;overflow:hidden;box-shadow:0 32px 90px rgba(0,0,0,.5),0 8px 28px rgba(0,0,0,.35);}',
      '.wtp-overlay.open .wtp-panel{animation:wtpRise 200ms ' + EASE + ';}',
      '.wtp-search{display:flex;align-items:center;gap:10px;padding:4px 16px;border-bottom:1px solid rgba(255,255,255,.1);}',
      '.wtp-search svg{flex:none;width:16px;height:16px;opacity:.55;}',
      '.wtp-input{flex:1;padding:14px 0;background:transparent;border:none;color:inherit;font:500 15px/1.3 "Space Grotesk","Inter",system-ui,sans-serif;}',
      '.wtp-input::placeholder{color:currentColor;opacity:.45;}',
      '.wtp-input:focus{outline:none;}',
      '.wtp-list{max-height:min(58vh,440px);overflow:auto;padding:7px;scrollbar-width:thin;}',
      '.wtp-item{width:100%;border:none;background:transparent;color:inherit;text-align:left;padding:10px 12px;border-radius:10px;display:grid;gap:3px;cursor:pointer;position:relative;}',
      '.wtp-item strong{font:700 11px/1.3 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase;}',
      '.wtp-item span{font:500 13px/1.35 "Space Grotesk","Inter",system-ui,sans-serif;opacity:.68;}',
      '.wtp-item.active,.wtp-item:hover{background:rgba(253,25,200,.13);}',
      '.wtp-item.active strong{color:#ff6ddd;}',
      '.wtp-item.active::before{content:"";position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:999px;background:#fd19c8;}',
      '.wtp-empty{padding:22px 16px;color:currentColor;opacity:.6;font:500 13px/1.4 "Space Grotesk","Inter",system-ui,sans-serif;text-align:center;}',
      '.wtp-foot{display:flex;flex-wrap:wrap;gap:12px;padding:9px 14px;border-top:1px solid rgba(255,255,255,.1);font:600 10px/1.4 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase;opacity:.62;}',
      '.wtp-foot kbd{font:inherit;padding:1px 5px;border-radius:4px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.07);text-transform:none;}',
      '.wtp-light .wtp-panel{background:rgba(255,255,255,.97);color:#1c1c21;border-color:rgba(0,0,0,.1);box-shadow:0 32px 90px rgba(0,0,0,.22),0 8px 28px rgba(0,0,0,.12);}',
      '.wtp-light .wtp-search{border-bottom-color:rgba(0,0,0,.09);}',
      '.wtp-light .wtp-item.active,.wtp-light .wtp-item:hover{background:rgba(201,20,159,.1);}',
      '.wtp-light .wtp-item.active strong{color:#c9149f;}',
      '.wtp-light .wtp-item.active::before{background:#c9149f;}',
      '.wtp-light .wtp-foot{border-top-color:rgba(0,0,0,.09);}',
      '.wtp-light .wtp-foot kbd{border-color:rgba(0,0,0,.16);background:rgba(0,0,0,.04);}',
      '.wtp-light.wtp-overlay{background:rgba(40,36,48,.32);}',
      '@keyframes wtpFade{from{opacity:0;}to{opacity:1;}}',
      '@keyframes wtpRise{from{opacity:0;transform:translateY(10px) scale(.985);}to{opacity:1;transform:translateY(0) scale(1);}}',
      '@media (prefers-reduced-motion:reduce){.wtp-overlay.open,.wtp-overlay.open .wtp-panel{animation:none;}.wtp-trigger{transition:none;}}',
      '@media print{.wtp-trigger,.wtp-overlay{display:none !important;}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function init() {
    injectStyles();

    var isMac = /Mac|iP(hone|ad|od)/.test(navigator.platform || '');

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'wtp-trigger';
    trigger.id = 'wtp-trigger';
    trigger.setAttribute('aria-label', 'Open quick actions');
    trigger.innerHTML = 'Actions <kbd>' + (isMac ? '⌘K' : 'Ctrl K') + '</kbd>';

    var overlay = document.createElement('div');
    overlay.className = 'wtp-overlay';
    overlay.id = 'wtp-overlay';
    overlay.innerHTML = '' +
      '<div class="wtp-panel" role="dialog" aria-modal="true" aria-label="Command Palette">' +
        '<div class="wtp-search">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>' +
          '<input id="wtp-input" class="wtp-input" type="text" placeholder="Jump to a tool or run an action..." autocomplete="off" aria-label="Search tools and actions">' +
        '</div>' +
        '<div id="wtp-list" class="wtp-list"></div>' +
        '<div class="wtp-foot">' +
          '<span><kbd>↵</kbd> run</span>' +
          '<span><kbd>↑↓</kbd> navigate</span>' +
          '<span><kbd>esc</kbd> close</span>' +
          '<span><kbd>' + (isMac ? '⌘K' : 'Ctrl K') + '</kbd> toggle</span>' +
        '</div>' +
      '</div>';

    document.body.appendChild(trigger);
    document.body.appendChild(overlay);

    // Keep palette chrome in sync with the host tool's current theme,
    // whichever theming mechanism the tool uses.
    function syncTheme() {
      var light = isLightSurface();
      overlay.classList.toggle('wtp-light', light);
      trigger.classList.toggle('wtp-light', light);
    }
    syncTheme();
    try {
      var themeObserver = new MutationObserver(syncTheme);
      themeObserver.observe(document.documentElement, { attributes: true });
      themeObserver.observe(document.body, { attributes: true });
    } catch (_) {}

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
        return '<button type="button" class="wtp-item ' + (idx === activeIndex ? 'active' : '') + '" data-cmd-idx="' + idx + '">' +
          '<strong>' + escapeHtml(cmd.title) + '</strong>' +
          '<span>' + escapeHtml(cmd.desc) + '</span>' +
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
      var btn = e.target.closest('[data-cmd-idx]');
      if (!btn) return;
      var idx = Number(btn.getAttribute('data-cmd-idx'));
      if (!Number.isNaN(idx) && idx >= 0 && idx < filtered.length) {
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
