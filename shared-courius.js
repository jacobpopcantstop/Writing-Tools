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
