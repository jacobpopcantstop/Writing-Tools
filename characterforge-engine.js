(function (root) {
  'use strict';

  function buildQueue(bank) {
    var out = [];
    (bank.themes || []).forEach(function (theme) {
      (theme.questions || []).forEach(function (q) {
        out.push({ themeId: theme.id, themeLabel: theme.label, id: q.id, prompt: q.prompt, followUps: q.followUps || [] });
      });
    });
    return out;
  }

  function evalFollowUps(question, answer) {
    var text = String(answer || '');
    return (question.followUps || []).filter(function (f) {
      var t = f.trigger || {};
      if (t.type === 'minLength') return text.length >= Number(t.value || 0);
      if (t.type === 'keyword') return text.toLowerCase().indexOf(String(t.value || '').toLowerCase()) !== -1;
      return false;
    });
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>]/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;';
    });
  }

  function buildSheet(bank, answers) {
    var a = answers || {};
    var parts = [];
    (bank.themes || []).forEach(function (theme) {
      var answered = (theme.questions || []).filter(function (q) {
        return a[q.id] && String(a[q.id]).trim();
      });
      if (!answered.length) return;
      parts.push('<h2 class="cf-theme">' + escapeHtml(theme.label) + '</h2>');
      answered.forEach(function (q) {
        parts.push('<p class="cf-answer">' + escapeHtml(String(a[q.id]).trim()) + '</p>');
      });
    });
    return parts.join('\n');
  }

  var Engine = { buildQueue: buildQueue, evalFollowUps: evalFollowUps, buildSheet: buildSheet };
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
  if (root) root.WTCharacterEngine = Engine;
})(typeof window !== 'undefined' ? window : null);
