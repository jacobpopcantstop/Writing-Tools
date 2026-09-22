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
      var beatState = JSON.parse(localStorage.getItem('writingtools_beathive_v2') || 'null');
      var ladders = beatState && Array.isArray(beatState.ladders) ? beatState.ladders : [];
      var inboxCount = beatState && Array.isArray(beatState.inbox) ? beatState.inbox.length : 0;
      if (ladders.length || inboxCount) {
        var recentLadder = ladders.slice().sort(function (a, b) {
          return (Number(b && b.updatedAt) || 0) - (Number(a && a.updatedAt) || 0);
        })[0] || null;
        var rungCount = recentLadder && Array.isArray(recentLadder.rungs)
          ? recentLadder.rungs.filter(function (r) { return r && String(r.text || '').trim(); }).length
          : 0;
        out.push({
          signature: recentLadder && recentLadder.id ? String(recentLadder.id) : 'beathive-inbox',
          id: 'recent-beathive',
          tool: 'BeatHive',
          category: categoryForTool('BeatHive'),
          title: trimTitle((recentLadder && recentLadder.name) || 'Premise Inbox', 28),
          meta: recentLadder
            ? rungCount + ' rung' + (rungCount === 1 ? '' : 's') + ' · ' + inboxCount + ' in inbox'
            : inboxCount + ' premise' + (inboxCount === 1 ? '' : 's') + ' waiting',
          path: 'BeatHive.html',
          updatedAt: (recentLadder && Number(recentLadder.updatedAt)) || (inboxCount && Number(beatState.inbox[0].createdAt)) || 0,
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
