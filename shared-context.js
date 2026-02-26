(function () {
  'use strict';

  var KEY = 'writingtools_context_v1';
  var EVENT = 'wt-context-updated';

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

  window.WTContextBus = {
    key: KEY,
    getContext: read,
    setContext: write,
    mergeContext: merge,
    clearContext: clear,
    subscribe: subscribe
  };
})();
