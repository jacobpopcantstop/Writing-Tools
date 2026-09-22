(function (root) {
  'use strict';

  // BeatHive: a premise inbox feeding "game ladders" — the sketch structure of
  // base reality -> first unusual thing -> the game -> heightening rungs ->
  // button. Pure data helpers live here so they can be unit tested.

  var MAX_INBOX = 300;
  var MAX_LADDERS = 200;
  var MAX_RUNGS = 40;
  var MAX_TEXT = 4000;

  var LEGACY_WELCOME_PREFIXES = ['WELCOME TO BEATHIVE', 'NAVIGATION', 'CONSTRUCTION', 'EDITING', 'WORKFLOW'];

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function cleanText(value) {
    return String(value == null ? '' : value).replace(/\r\n?/g, '\n').slice(0, MAX_TEXT);
  }

  function toMillis(value, fallback) {
    var n = typeof value === 'number' ? value : new Date(value || 0).getTime();
    return Number.isFinite(n) && n > 0 ? n : (fallback || Date.now());
  }

  function newLadder(fields) {
    var f = fields || {};
    var now = Date.now();
    return {
      id: f.id || uid('ladder'),
      name: cleanText(f.name || '').trim() || 'Untitled Sketch',
      premise: cleanText(f.premise || ''),
      source: cleanText(f.source || ''),
      base: cleanText(f.base || ''),
      weird: cleanText(f.weird || ''),
      game: cleanText(f.game || ''),
      rungs: Array.isArray(f.rungs) ? f.rungs.map(normalizeRung).filter(Boolean).slice(0, MAX_RUNGS) : [],
      button: cleanText(f.button || ''),
      notes: cleanText(f.notes || ''),
      createdAt: toMillis(f.createdAt, now),
      updatedAt: toMillis(f.updatedAt, now)
    };
  }

  function normalizeRung(rung) {
    if (rung == null) return null;
    if (typeof rung === 'string') return { id: uid('rung'), text: cleanText(rung), tops: false };
    if (typeof rung !== 'object') return null;
    return { id: String(rung.id || uid('rung')), text: cleanText(rung.text), tops: !!rung.tops };
  }

  function newInboxItem(fields) {
    var f = fields || {};
    var text = cleanText(f.text || '').trim();
    if (!text) return null;
    return {
      id: f.id || uid('premise'),
      text: text,
      detail: cleanText(f.detail || '').trim(),
      source: cleanText(f.source || 'You').trim() || 'You',
      createdAt: toMillis(f.createdAt, Date.now())
    };
  }

  function emptyState() {
    return { version: 2, inbox: [], ladders: [], activeId: '' };
  }

  function normalizeState(raw) {
    var src = raw && typeof raw === 'object' ? raw : {};
    var state = emptyState();
    state.inbox = (Array.isArray(src.inbox) ? src.inbox : [])
      .map(newInboxItem).filter(Boolean).slice(0, MAX_INBOX);
    state.ladders = (Array.isArray(src.ladders) ? src.ladders : [])
      .filter(function (l) { return l && typeof l === 'object'; })
      .map(newLadder).slice(0, MAX_LADDERS);
    var active = String(src.activeId || '');
    state.activeId = state.ladders.some(function (l) { return l.id === active; })
      ? active
      : (state.ladders[0] ? state.ladders[0].id : '');
    return state;
  }

  // --- Legacy hex maps -> ladders ---
  // Hex cells were typed setup / inciting / heightening / blowoff / note.
  // Reading order was column-major (q, then r), which is how writers tended
  // to lay beats out; the built-in welcome/tutorial cells are dropped.
  function isWelcomeCell(cell) {
    var text = String(cell && cell.content || '').trim().toUpperCase();
    return LEGACY_WELCOME_PREFIXES.some(function (p) { return text.indexOf(p + '\n') === 0; });
  }

  function migrateLegacySketches(sketches) {
    if (!Array.isArray(sketches)) return [];
    return sketches.map(function (sketch) {
      if (!sketch || typeof sketch !== 'object') return null;
      var cells = (Array.isArray(sketch.cells) ? sketch.cells : [])
        .filter(function (c) { return c && String(c.content || '').trim() && !isWelcomeCell(c); })
        .slice()
        .sort(function (a, b) { return (Number(a.q) - Number(b.q)) || (Number(a.r) - Number(b.r)); });
      if (!cells.length) return null;
      var pick = function (type) {
        return cells.filter(function (c) { return c.type === type; })
          .map(function (c) { return String(c.content).trim(); });
      };
      return newLadder({
        name: sketch.name && sketch.name !== 'Untitled Hive' ? sketch.name : 'Imported Hive',
        base: pick('setup').join('\n\n'),
        weird: pick('inciting').join('\n\n'),
        rungs: pick('heightening'),
        button: pick('blowoff').join('\n\n'),
        notes: pick('note').join('\n\n'),
        createdAt: sketch.createdAt,
        updatedAt: sketch.updatedAt
      });
    }).filter(Boolean);
  }

  // --- Handoffs from other tools -> inbox items ---
  // Senders write one payload object or an array of them:
  //   Joterie / ThisButThat: { topic, jots: [..], source }
  //   Synax:                 { topic, constraints, source }
  function handoffToInbox(raw) {
    var list = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    var out = [];
    list.forEach(function (payload) {
      if (!payload || typeof payload !== 'object') return;
      var source = String(payload.source || 'Handoff').trim() || 'Handoff';
      var topic = String(payload.topic || '').trim();
      var jots = Array.isArray(payload.jots) ? payload.jots : [];
      var createdAt = payload.createdAt;
      if (jots.length) {
        jots.forEach(function (jot) {
          var item = newInboxItem({ text: jot, detail: topic, source: source, createdAt: createdAt });
          if (item) out.push(item);
        });
        return;
      }
      var item = newInboxItem({
        text: topic,
        detail: String(payload.constraints || '').trim(),
        source: source,
        createdAt: createdAt
      });
      if (item) out.push(item);
    });
    return out;
  }

  // Senders (Joterie, Synax, ThisButThat) queue payloads so several handoffs
  // made before BeatHive is opened are all kept. Returns true on success.
  var HANDOFF_KEY = 'writingtools_beathive_handoff_v1';
  function queueHandoff(payload, storage) {
    var target = storage || (root && root.localStorage);
    if (!target || !payload) return false;
    try {
      var prev = JSON.parse(target.getItem(HANDOFF_KEY) || 'null');
      var queue = Array.isArray(prev) ? prev : (prev ? [prev] : []);
      queue.push(payload);
      target.setItem(HANDOFF_KEY, JSON.stringify(queue.slice(-50)));
      return true;
    } catch (_) {
      return false;
    }
  }

  // --- Ladder analysis ---
  function ladderStats(ladder) {
    var rungs = (ladder && ladder.rungs || []).filter(function (r) { return String(r.text || '').trim(); });
    var toppers = rungs.filter(function (r, i) { return i === 0 || r.tops; }).length;
    var filled = ['base', 'weird', 'game', 'button'].filter(function (k) {
      return String(ladder && ladder[k] || '').trim();
    }).length + (rungs.length ? 1 : 0);
    return { rungs: rungs.length, toppers: toppers, filled: filled, total: 5 };
  }

  // Short writer-facing nudges about what the ladder still needs.
  function ladderHints(ladder) {
    var hints = [];
    var has = function (k) { return !!String(ladder[k] || '').trim(); };
    var stats = ladderStats(ladder);
    if (!has('base')) hints.push('Set the base reality: who, where, and what normal looks like.');
    else if (!has('weird')) hints.push('What is the first unusual thing that breaks the normal?');
    else if (!has('game')) hints.push('Name the game in one sentence: if this is true, what else is true?');
    if (has('game') && stats.rungs < 3) hints.push('Most sketches want at least three heightening rungs.');
    if (stats.rungs > 1 && stats.toppers < stats.rungs) {
      var weak = stats.rungs - stats.toppers;
      hints.push(weak + ' rung' + (weak === 1 ? ' does' : 's do') + "n't top the one before it yet.");
    }
    if (stats.rungs >= 3 && !has('button')) hints.push('Find the button: how does it end?');
    return hints;
  }

  // --- Output ---
  function escapeHtml(text) {
    return String(text || '').replace(/[&<>"]/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;';
    });
  }

  function actionLine(label, text) {
    var body = String(text || '').trim();
    return '<div class="action">[' + escapeHtml(label) + '] ' + escapeHtml(body || '...').replace(/\n/g, '<br>') + '</div>';
  }

  // A Courius skeleton: a placeholder heading plus one bracketed action line
  // per beat, ready to be overwritten with real scene text.
  function ladderToCouriusHtml(ladder) {
    var l = newLadder(ladder);
    var parts = ['<div class="scene-heading">INT. LOCATION - DAY</div>'];
    if (l.premise.trim()) parts.push(actionLine('PREMISE', l.premise));
    parts.push(actionLine('BASE REALITY', l.base));
    parts.push(actionLine('FIRST UNUSUAL THING', l.weird));
    parts.push(actionLine('GAME', l.game));
    l.rungs.filter(function (r) { return r.text.trim(); }).forEach(function (r, i) {
      parts.push(actionLine('HEIGHTEN ' + (i + 1), r.text));
    });
    parts.push(actionLine('BUTTON', l.button));
    return parts.join('');
  }

  function ladderToText(ladder) {
    var l = newLadder(ladder);
    var lines = [l.name.toUpperCase(), ''];
    if (l.premise.trim()) lines.push('PREMISE: ' + l.premise.trim(), '');
    lines.push('BASE REALITY: ' + (l.base.trim() || '...'));
    lines.push('FIRST UNUSUAL THING: ' + (l.weird.trim() || '...'));
    lines.push('GAME: ' + (l.game.trim() || '...'), '');
    l.rungs.filter(function (r) { return r.text.trim(); }).forEach(function (r, i) {
      lines.push((i + 1) + '. ' + r.text.trim());
    });
    lines.push('', 'BUTTON: ' + (l.button.trim() || '...'));
    if (l.notes.trim()) lines.push('', 'NOTES: ' + l.notes.trim());
    return lines.join('\n');
  }

  var api = {
    uid: uid,
    newLadder: newLadder,
    newInboxItem: newInboxItem,
    emptyState: emptyState,
    normalizeState: normalizeState,
    migrateLegacySketches: migrateLegacySketches,
    handoffToInbox: handoffToInbox,
    queueHandoff: queueHandoff,
    ladderStats: ladderStats,
    ladderHints: ladderHints,
    ladderToCouriusHtml: ladderToCouriusHtml,
    ladderToText: ladderToText,
    MAX_RUNGS: MAX_RUNGS
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.WTBeatHive = api;
})(typeof window !== 'undefined' ? window : null);
