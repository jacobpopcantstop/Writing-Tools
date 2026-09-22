(function (root) {
  'use strict';

  var COURIUS_KEY = 'writingtools_courius_storage';
  // Multi-script keys (mirrors Courius.html). Inactive scripts are parked
  // under DOC_PREFIX + id; OPEN_REQUEST_KEY asks Courius to switch to one.
  var DOCS_INDEX_KEY = 'writingtools_courius_docs_v1';
  var ACTIVE_DOC_KEY = 'writingtools_courius_active_doc_v1';
  var DOC_PREFIX = 'writingtools_courius_doc_';
  var OPEN_REQUEST_KEY = 'writingtools_courius_open_request_v1';
  var COURIUS_REV_KEY = 'writingtools_courius_revision_v1';
  var COURIUS_IMPORTS_KEY = 'writingtools_courius_imports_v1';
  var DEAD_CONTEXT_KEY = 'writingtools_context_v1';

  function nowIso() { return new Date().toISOString(); }

  function defaultStorage() {
    try { return root && root.localStorage ? root.localStorage : null; } catch (_) { return null; }
  }

  // One-time removal of the retired global context bus key.
  try { var ls = defaultStorage(); if (ls) ls.removeItem(DEAD_CONTEXT_KEY); } catch (_) {}

  function getImportHistory(storage) {
    try {
      var raw = (storage || defaultStorage()).getItem(COURIUS_IMPORTS_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }

  function writeImportHistory(items, storage) {
    try { (storage || defaultStorage()).setItem(COURIUS_IMPORTS_KEY, JSON.stringify(items.slice(0, 30))); } catch (_) {}
  }

  function recordImport(source, mode, stampIso, payload, storage) {
    var history = getImportHistory(storage);
    history.unshift({
      id: 'imp_' + Date.now() + '_' + Math.floor(Math.random() * 100000),
      source: source, mode: mode, createdAt: stampIso, payload: payload
    });
    writeImportHistory(history, storage);
  }

  function readDocs(storage) {
    try {
      var parsed = JSON.parse(storage.getItem(DOCS_INDEX_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }

  function newDocId() {
    return 'doc_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
  }

  // Adds a handoff as a brand-new Courius script instead of replacing the one
  // the writer has open. The script is parked, then Courius is asked to open
  // it (immediately if a Courius tab is open, otherwise on its next load).
  // Returns the new script id, or '' on failure.
  function createScript(html, sourceLabel, name, storage) {
    var target = storage || defaultStorage();
    if (!target) return '';
    var payload = sanitizePayload(html).trim();
    if (!payload) return '';
    var source = String(sourceLabel || 'tool').trim() || 'tool';
    try {
      var docs = readDocs(target);
      if (!docs.length) {
        // Courius has never indexed its scripts: register the existing
        // buffer first so it is not mistaken for the new script.
        var legacyId = newDocId() + '_0';
        docs.push({ id: legacyId, name: 'Untitled Script', auto: true, updatedAt: Date.now() - 1 });
        target.setItem(ACTIVE_DOC_KEY, legacyId);
      }
      var id = newDocId();
      var cleanName = String(name || '').trim() || ('From ' + source);
      target.setItem(DOC_PREFIX + id, payload);
      docs.unshift({ id: id, name: cleanName.slice(0, 80), auto: false, updatedAt: Date.now() });
      target.setItem(DOCS_INDEX_KEY, JSON.stringify(docs));
      target.setItem(OPEN_REQUEST_KEY, JSON.stringify({ id: id, at: Date.now() }));
      recordImport(source, 'new-script', nowIso(), payload, target);
      return id;
    } catch (_) {
      return '';
    }
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
    // "Replace" used to overwrite whatever script was open. It now lands as a
    // new script so a handoff can never destroy existing work.
    if (String(modeLabel || 'append').trim().toLowerCase() === 'overwrite') {
      return !!createScript(payload, source, '');
    }
    var storage = defaultStorage();
    if (!storage) return false;
    var stampIso = nowIso();
    var header = buildImportHeader(source, stampIso);

    for (var i = 0; i < 3; i += 1) {
      var current = '', rev = 0;
      try {
        current = storage.getItem(COURIUS_KEY) || '';
        rev = parseInt(storage.getItem(COURIUS_REV_KEY) || '0', 10) || 0;
      } catch (_) {}
      var hasCurrent = !!(current && current.trim());
      var next = !hasCurrent
        ? header + payload
        : current + '<div class="action"><br></div>' + header + payload;
      try {
        storage.setItem(COURIUS_KEY, next);
        storage.setItem(COURIUS_REV_KEY, String(rev + 1));
        recordImport(source, 'append', stampIso, payload, storage);
        return true;
      } catch (_) {}
    }
    return false;
  }

  var WTCourius = {
    storageKey: COURIUS_KEY,
    openRequestKey: OPEN_REQUEST_KEY,
    append: function (html, source) { return transfer(html, source, 'append'); },
    overwrite: function (html, source) { return transfer(html, source, 'overwrite'); },
    createScript: createScript,
    sanitize: sanitizePayload,
    getImportHistory: getImportHistory
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = WTCourius;
  if (root) root.WTCourius = WTCourius;
})(typeof window !== 'undefined' ? window : null);
