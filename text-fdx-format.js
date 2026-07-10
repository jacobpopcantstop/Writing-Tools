(function (root) {
  'use strict';

  var KNOWN_TYPES = ['scene-heading', 'action', 'character', 'dialogue', 'parenthetical', 'transition'];
  var COURIUS_STORAGE_KEY = 'writingtools_courius_storage';
  var COURIUS_REV_KEY = 'writingtools_courius_revision_v1';
  var COURIUS_UPDATED_KEY = 'writingtools_courius_updated_at';
  var MAX_INPUT_CHARS = 60000;

  function normalizeType(type) {
    var value = String(type || '').trim().toLowerCase();
    if (value === 'scene-heading' || value === 'scene heading' || value === 'scene') return 'scene-heading';
    if (value === 'parenthetical') return 'parenthetical';
    if (value === 'character') return 'character';
    if (value === 'dialog') return 'dialogue';
    if (value === 'dialogue') return 'dialogue';
    if (value === 'transition') return 'transition';
    if (value === 'action') return 'action';
    return 'action';
  }

  function cleanText(text) {
    return String(text || '')
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map(function (line) { return line.replace(/[ \t]+$/g, ''); })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function cleanMetaText(text, placeholders) {
    var value = cleanText(text);
    var lowered = value.toLowerCase();
    if ((placeholders || []).indexOf(lowered) !== -1) return '';
    return value;
  }

  function cleanNotes(text) {
    var value = cleanText(text);
    var lowered = value.toLowerCase();
    var genericNotes = [
      'screenplay draft conversion',
      'screenplay elements for final draft export',
      'formatted screenplay elements',
      'converted to screenplay format'
    ];
    if (genericNotes.indexOf(lowered) !== -1) return '';
    return value;
  }

  function normalizeFormatterResult(raw) {
    var source = raw;
    if (typeof source === 'string') {
      source = JSON.parse(source);
    }
    source = source || {};
    var elements = Array.isArray(source.elements) ? source.elements : [];
    return {
      title: cleanMetaText(source.title || '', ['untitled', 'unknown title', 'title']),
      author: cleanMetaText(source.author || '', ['unknown', 'unknown author', 'author']),
      notes: cleanNotes(source.notes || ''),
      elements: elements.reduce(function (acc, item) {
        var text = cleanText(item && item.text);
        if (!text) return acc;
        acc.push({
          type: normalizeType(item && item.type),
          text: text
        });
        return acc;
      }, [])
    };
  }

  function stripJsonFence(text) {
    var value = String(text || '').trim();
    var match = value.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    return match ? match[1].trim() : value;
  }

  // LLM replies often wrap the JSON in prose or code fences. Accept the reply
  // as-is when possible, then fall back to the outermost {...} block.
  function extractJsonPayload(text) {
    var value = stripJsonFence(text);
    if (!value) return '';
    var fenced = value.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced && fenced[1]) {
      var inner = fenced[1].trim();
      if (inner.charAt(0) === '{') return inner;
    }
    if (value.charAt(0) === '{') return value;
    var start = value.indexOf('{');
    var end = value.lastIndexOf('}');
    if (start >= 0 && end > start) return value.slice(start, end + 1);
    return value;
  }

  function parseStructuredJson(text) {
    var raw = String(text || '');
    if (!raw.trim()) {
      throw new Error('Paste the JSON reply from your LLM first.');
    }
    var payload = extractJsonPayload(raw);
    var parsed;
    try {
      parsed = JSON.parse(payload);
    } catch (_) {
      throw new Error('Could not find valid JSON in that reply. Make sure you copied the whole response.');
    }
    return normalizeFormatterResult(parsed);
  }

  function buildManualPrompt(sourceText, titleHint, authorHint) {
    return [
      'Convert the raw draft below into strict JSON for a screenplay FDX formatter.',
      '',
      'Preserve the writer\'s words as much as possible. Do not punch up, summarize, censor, or rewrite jokes.',
      'Infer only these block types: scene-heading, action, character, dialogue, parenthetical, transition.',
      'Uppercase scene headings, character cues, and transitions. Keep dialogue casing natural.',
      'Convert the ENTIRE draft. Never truncate, skip lines, or stop early.',
      'Return only JSON. Do not wrap it in Markdown.',
      '',
      'Schema:',
      '{',
      '  "title": "string",',
      '  "author": "string",',
      '  "notes": "string",',
      '  "elements": [',
      '    { "type": "scene-heading|action|character|dialogue|parenthetical|transition", "text": "string" }',
      '  ]',
      '}',
      '',
      'Title hint: ' + String(titleHint || ''),
      'Author hint: ' + String(authorHint || ''),
      '',
      'Raw text:',
      String(sourceText || '')
    ].join('\n');
  }

  function validateInputText(text) {
    var value = cleanText(text);
    if (!value) {
      return { ok: false, text: '', message: 'Paste or upload text before formatting.' };
    }
    if (value.length > MAX_INPUT_CHARS) {
      return {
        ok: false,
        text: value,
        message: 'This draft is too long for one pass. Keep it under ' + MAX_INPUT_CHARS.toLocaleString() + ' characters.'
      };
    }
    return { ok: true, text: value, message: '' };
  }

  function escapeHtml(text) {
    var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(text || '').replace(/[&<>"']/g, function (char) { return map[char]; });
  }

  function blockToHtml(element) {
    var type = normalizeType(element && element.type);
    var text = cleanText(element && element.text);
    return '<div class="' + type + '">' + escapeHtml(text).replace(/\n/g, '<br>') + '</div>';
  }

  function buildCouriusHtml(doc) {
    var normalized = normalizeFormatterResult(doc);
    var chunks = [];
    if (normalized.title || normalized.author) {
      chunks.push(
        '<div class="title-page-container" contenteditable="false">' +
          '<div class="tp-title" contenteditable="true" data-placeholder="TITLE">' + escapeHtml(normalized.title || 'TITLE') + '</div>' +
          '<div class="tp-by">by</div>' +
          '<div class="tp-author" contenteditable="true" data-placeholder="Author Name">' + escapeHtml(normalized.author || 'Author Name') + '</div>' +
          '<div class="tp-contact" contenteditable="true" data-placeholder="Contact Info"></div>' +
        '</div>'
      );
    }
    normalized.elements.forEach(function (element) {
      chunks.push(blockToHtml(element));
    });
    return chunks.join('');
  }

  function saveToCourius(doc, storage) {
    var target = storage || (root && root.localStorage);
    if (!target) throw new Error('localStorage is not available.');
    var html = buildCouriusHtml(doc);
    var currentRev = parseInt(target.getItem(COURIUS_REV_KEY) || '0', 10) || 0;
    target.setItem(COURIUS_STORAGE_KEY, html);
    target.setItem(COURIUS_REV_KEY, String(currentRev + 1));
    target.setItem(COURIUS_UPDATED_KEY, String(Date.now()));
    return html;
  }

  function buildFdx(doc, screenplayApi) {
    var normalized = normalizeFormatterResult(doc);
    var api = screenplayApi || (root && root.WTScreenplay);
    if (!api || typeof api.buildFdx !== 'function') {
      throw new Error('WTScreenplay.buildFdx is not available.');
    }
    return api.buildFdx({
      title: normalized.title,
      author: normalized.author,
      elements: normalized.elements
    });
  }

  function documentFromPreviewRows(rows, title, author) {
    return normalizeFormatterResult({
      title: title || '',
      author: author || '',
      elements: (rows || []).map(function (row) {
        return {
          type: row && row.type,
          text: row && row.text
        };
      })
    });
  }

  var api = {
    KNOWN_TYPES: KNOWN_TYPES.slice(),
    MAX_INPUT_CHARS: MAX_INPUT_CHARS,
    normalizeType: normalizeType,
    cleanText: cleanText,
    normalizeFormatterResult: normalizeFormatterResult,
    extractJsonPayload: extractJsonPayload,
    parseStructuredJson: parseStructuredJson,
    buildManualPrompt: buildManualPrompt,
    validateInputText: validateInputText,
    escapeHtml: escapeHtml,
    buildCouriusHtml: buildCouriusHtml,
    saveToCourius: saveToCourius,
    buildFdx: buildFdx,
    documentFromPreviewRows: documentFromPreviewRows
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.WTTextFDX = api;
})(typeof window !== 'undefined' ? window : null);
