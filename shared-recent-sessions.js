(function () {
  'use strict';

  function wordCount(text) {
    return (String(text || '').trim().match(/\S+/g) || []).length;
  }

  function trimTitle(text, maxLen) {
    var s = String(text || '').trim();
    return s.length > maxLen ? s.slice(0, maxLen) + '...' : s;
  }

  function relativeTime(timestamp) {
    if (!timestamp) return '';
    var delta = Date.now() - timestamp;
    var minutes = Math.round(delta / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return minutes + 'm ago';
    var hours = Math.round(minutes / 60);
    if (hours < 24) return hours + 'h ago';
    var days = Math.round(hours / 24);
    if (days < 7) return days + 'd ago';
    return new Date(timestamp).toLocaleDateString();
  }

  function readMillis(key) {
    try {
      var raw = localStorage.getItem(key);
      var value = parseInt(raw || '0', 10);
      return Number.isFinite(value) ? value : 0;
    } catch (_) {
      return 0;
    }
  }

  function categoryForTool(tool) {
    if (tool === 'Synax' || tool === 'ThisButThat' || tool === 'Joterie') return 'Ideation';
    if (tool === 'BeatHive') return 'Drafting';
    if (tool === 'Courius' || tool === 'TextToFDX') return 'Output';
    return 'Other';
  }

  function list() {
    var out = [];

    try {
      var couriusHtml = localStorage.getItem('writingtools_courius_storage') || '';
      var couriusWords = wordCount(couriusHtml.replace(/<[^>]+>/g, ' '));
      if (couriusWords > 0) {
        var couriusUpdatedAt = readMillis('writingtools_courius_updated_at');
        out.push({
          id: 'recent-courius',
          tool: 'Courius',
          category: categoryForTool('Courius'),
          title: 'Courius Script',
          meta: couriusWords + ' words in screenplay buffer',
          path: 'Courius.html',
          updatedAt: couriusUpdatedAt,
          updatedLabel: ''
        });
      }
    } catch (_) {}

    try {
      var rawBeats = localStorage.getItem('writingtools_beathive_sketches');
      var sketches = rawBeats ? JSON.parse(rawBeats) : [];
      if (Array.isArray(sketches) && sketches.length) {
        var recentBeat = sketches
          .slice()
          .sort(function (a, b) {
            return new Date(b && (b.updatedAt || b.createdAt) || 0).getTime() - new Date(a && (a.updatedAt || a.createdAt) || 0).getTime();
          })[0];
        var beatCount = Array.isArray(recentBeat && recentBeat.cells)
          ? recentBeat.cells.filter(function (c) { return c && c.content && String(c.content).trim(); }).length
          : 0;
        out.push({
          signature: recentBeat && recentBeat.id ? String(recentBeat.id) : '',
          id: 'recent-beathive',
          tool: 'BeatHive',
          category: categoryForTool('BeatHive'),
          title: trimTitle((recentBeat && recentBeat.name) || 'Untitled Hive', 28),
          meta: beatCount + ' populated beats',
          path: 'BeatHive.html',
          updatedAt: new Date(recentBeat && (recentBeat.updatedAt || recentBeat.createdAt) || 0).getTime() || 0,
          updatedLabel: ''
        });
      }
    } catch (_) {}

    try {
      var synaxText = localStorage.getItem('writingtools_synax_editor') || '';
      var synaxWords = wordCount(synaxText);
      if (synaxWords > 0) {
        var synaxUpdatedAt = readMillis('writingtools_synax_updated_at');
        out.push({
          id: 'recent-synax',
          tool: 'Synax',
          category: categoryForTool('Synax'),
          title: 'Synax Idea Canvas',
          meta: synaxWords + ' words in editor',
          path: 'Synax.html',
          updatedAt: synaxUpdatedAt,
          updatedLabel: ''
        });
      }
    } catch (_) {}

    try {
      var joterieRaw = localStorage.getItem('writingtools_joterie_archives');
      var archives = joterieRaw ? JSON.parse(joterieRaw) : [];
      if (Array.isArray(archives) && archives.length) {
        var recentArchive = archives[0] || {};
        var keepCount = Array.isArray(recentArchive.cards) ? recentArchive.cards.length : 0;
        var joterieUpdatedAt = new Date(recentArchive.createdAt || recentArchive.updatedAt || recentArchive.date || 0).getTime() || 0;
        out.push({
          id: 'recent-joterie',
          tool: 'Joterie',
          category: categoryForTool('Joterie'),
          title: trimTitle(recentArchive.prompt || 'Joterie Harvest', 28),
          meta: keepCount + ' kept cards',
          path: 'Joterie.html',
          updatedAt: joterieUpdatedAt,
          updatedLabel: ''
        });
      }
    } catch (_) {}

    try {
      var twistRaw = localStorage.getItem('writingtools_thisbutthat_cache_v1');
      var batches = twistRaw ? JSON.parse(twistRaw) : [];
      if (Array.isArray(batches) && batches.length) {
        var latestBatch = batches[batches.length - 1] || {};
        var latestTopic = latestBatch.topic && latestBatch.topic.text ? latestBatch.topic.text : 'This But That Session';
        var twistCount = Array.isArray(latestBatch.twists) ? latestBatch.twists.length : 0;
        out.push({
          id: 'recent-thisbutthat',
          tool: 'ThisButThat',
          category: categoryForTool('ThisButThat'),
          title: trimTitle(latestTopic, 28),
          meta: twistCount + ' twists cached',
          path: 'ThisButThat.html',
          updatedAt: new Date(latestBatch.timestamp || 0).getTime() || 0,
          updatedLabel: ''
        });
      }
    } catch (_) {}

    return out
      .sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); })
      .map(function (item) {
        item.updatedLabel = relativeTime(item.updatedAt || 0);
        return item;
      });
  }

  window.WTRecentSessions = {
    list: list
  };
})();
