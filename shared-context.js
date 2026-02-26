(function () {
  'use strict';

  var KEY = 'writingtools_context_v1';
  var EVENT = 'wt-context-updated';
  var COURIUS_KEY = 'writingtools_courius_storage';
  var COURIUS_REV_KEY = 'writingtools_courius_revision_v1';

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

  function appendToCourius(htmlPayload, sourceLabel) {
    var payload = String(htmlPayload || '').trim();
    if (!payload) return false;

    var source = String(sourceLabel || 'tool').trim() || 'tool';
    var stamp = new Date().toLocaleString();
    var header = '<div class="action"><br></div><div class="action">--- ' +
      source.toUpperCase() + ' · ' + stamp + ' ---</div>';

    // Simple compare-and-retry to reduce overwrite risk across tabs.
    for (var i = 0; i < 3; i += 1) {
      var current = '';
      var rev = 0;
      try {
        current = localStorage.getItem(COURIUS_KEY) || '';
        rev = parseInt(localStorage.getItem(COURIUS_REV_KEY) || '0', 10) || 0;
      } catch (_) {}

      var divider = current && current.trim() ? header : '';
      var next = current + divider + payload;

      try {
        localStorage.setItem(COURIUS_KEY, next);
        localStorage.setItem(COURIUS_REV_KEY, String(rev + 1));
        return true;
      } catch (_) {}
    }
    return false;
  }

  window.WTContextBus = {
    key: KEY,
    getContext: read,
    setContext: write,
    mergeContext: merge,
    clearContext: clear,
    subscribe: subscribe,
    appendToCourius: appendToCourius
  };
})();
