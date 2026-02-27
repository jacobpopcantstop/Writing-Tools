(function () {
  'use strict';

  var KEY = 'writingtools_context_v1';
  var EVENT = 'wt-context-updated';
  var COURIUS_KEY = 'writingtools_courius_storage';
  var COURIUS_REV_KEY = 'writingtools_courius_revision_v1';
  var COURIUS_IMPORTS_KEY = 'writingtools_courius_imports_v1';

  function nowIso() {
    return new Date().toISOString();
  }

  function normalize(input) {
    var base = input && typeof input === 'object' ? input : {};
    return {
      topic: typeof base.topic === 'string' ? base.topic : '',
      tone: typeof base.tone === 'string' ? base.tone : '',
      audience: typeof base.audience === 'string' ? base.audience : '',
      constraints: typeof base.constraints === 'string' ? base.constraints : '',
      lastTool: typeof base.lastTool === 'string' ? base.lastTool : '',
      updatedAt: typeof base.updatedAt === 'string' ? base.updatedAt : nowIso()
    };
  }

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return normalize({});
      return normalize(JSON.parse(raw));
    } catch (_) {
      return normalize({});
    }
  }

  function write(value) {
    var next = normalize(value);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch (_) {}

    try {
      window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
    } catch (_) {}

    return next;
  }

  function merge(partial) {
    var current = read();
    var patch = partial && typeof partial === 'object' ? partial : {};
    return write({
      topic: patch.topic !== undefined ? String(patch.topic || '').trim() : current.topic,
      tone: patch.tone !== undefined ? String(patch.tone || '').trim() : current.tone,
      audience: patch.audience !== undefined ? String(patch.audience || '').trim() : current.audience,
      constraints: patch.constraints !== undefined ? String(patch.constraints || '').trim() : current.constraints,
      lastTool: patch.lastTool !== undefined ? String(patch.lastTool || '').trim() : current.lastTool,
      updatedAt: nowIso()
    });
  }

  function clear() {
    return write({
      topic: '',
      tone: '',
      audience: '',
      constraints: '',
      lastTool: '',
      updatedAt: nowIso()
    });
  }

  function subscribe(callback) {
    if (typeof callback !== 'function') return function () {};

    var onCustom = function (e) {
      callback(normalize(e && e.detail ? e.detail : read()));
    };
    var onStorage = function (e) {
      if (e && e.key === KEY) callback(read());
    };

    window.addEventListener(EVENT, onCustom);
    window.addEventListener('storage', onStorage);

    return function unsubscribe() {
      window.removeEventListener(EVENT, onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }

  function getCouriusImportHistory() {
    try {
      var raw = localStorage.getItem(COURIUS_IMPORTS_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function writeCouriusImportHistory(items) {
    try {
      localStorage.setItem(COURIUS_IMPORTS_KEY, JSON.stringify(items.slice(0, 30)));
    } catch (_) {}
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

  function sanitizeCouriusPayload(html) {
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
    container.querySelectorAll('script,iframe,object,embed,link,meta').forEach(function (node) {
      node.remove();
    });
    container.querySelectorAll('*').forEach(function (el) {
      var attrs = Array.prototype.slice.call(el.attributes || []);
      attrs.forEach(function (attr) {
        var name = String(attr && attr.name || '').toLowerCase();
        var value = String(attr && attr.value || '');
        if (!name) return;
        if (name.indexOf('on') === 0) {
          el.removeAttribute(attr.name);
          return;
        }
        if ((name === 'href' || name === 'src') && /^\s*javascript:/i.test(value)) {
          el.removeAttribute(attr.name);
        }
      });
    });
    return container.innerHTML;
  }

  function transferToCourius(htmlPayload, sourceLabel, modeLabel) {
    var payload = sanitizeCouriusPayload(htmlPayload).trim();
    if (!payload) return false;

    var source = String(sourceLabel || 'tool').trim() || 'tool';
    var mode = String(modeLabel || 'append').trim().toLowerCase() === 'overwrite' ? 'overwrite' : 'append';
    var stampIso = nowIso();
    var header = buildImportHeader(source, stampIso);

    // Simple compare-and-retry to reduce overwrite risk across tabs.
    for (var i = 0; i < 3; i += 1) {
      var current = '';
      var rev = 0;
      try {
        current = localStorage.getItem(COURIUS_KEY) || '';
        rev = parseInt(localStorage.getItem(COURIUS_REV_KEY) || '0', 10) || 0;
      } catch (_) {}

      var hasCurrent = !!(current && current.trim());
      var next = '';
      if (mode === 'overwrite' || !hasCurrent) {
        next = header + payload;
      } else {
        next = current + '<div class="action"><br></div>' + header + payload;
      }

      try {
        localStorage.setItem(COURIUS_KEY, next);
        localStorage.setItem(COURIUS_REV_KEY, String(rev + 1));
        var history = getCouriusImportHistory();
        history.unshift({
          id: 'imp_' + Date.now() + '_' + Math.floor(Math.random() * 100000),
          source: source,
          mode: mode,
          createdAt: stampIso,
          payload: payload
        });
        writeCouriusImportHistory(history);
        return true;
      } catch (_) {}
    }
    return false;
  }

  function appendToCourius(htmlPayload, sourceLabel) {
    return transferToCourius(htmlPayload, sourceLabel, 'append');
  }

  function overwriteCourius(htmlPayload, sourceLabel) {
    return transferToCourius(htmlPayload, sourceLabel, 'overwrite');
  }

  window.WTContextBus = {
    key: KEY,
    getContext: read,
    setContext: write,
    mergeContext: merge,
    clearContext: clear,
    subscribe: subscribe,
    appendToCourius: appendToCourius,
    overwriteCourius: overwriteCourius,
    transferToCourius: transferToCourius,
    getCouriusImportHistory: getCouriusImportHistory
  };
})();
