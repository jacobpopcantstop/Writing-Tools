(function () {
  'use strict';

  var EVENTS_KEY = 'writingtools_export_events_v1';
  var MAX_EVENTS = 80;
  var DEFAULT_MAX_URL_BODY = 1600;

  function isMobileClient() {
    try {
      return window.matchMedia('(max-width: 820px)').matches ||
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    } catch (_) {
      return false;
    }
  }

  function safeEncode(value) {
    return encodeURIComponent(String(value || ''));
  }

  function buildGmailUrl(subject, body) {
    return 'https://mail.google.com/mail/?view=cm&fs=1&tf=1' +
      '&su=' + safeEncode(subject) +
      '&body=' + safeEncode(body);
  }

  function buildMailtoUrl(subject, body) {
    return 'mailto:?subject=' + safeEncode(subject) + '&body=' + safeEncode(body);
  }

  function logEvent(payload) {
    try {
      var raw = localStorage.getItem(EVENTS_KEY);
      var entries = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(entries)) entries = [];
      entries.unshift({
        at: Date.now(),
        tool: String(payload && payload.tool || 'tool'),
        kind: String(payload && payload.kind || 'export'),
        transport: String(payload && payload.transport || 'unknown'),
        trimmed: !!(payload && payload.trimmed)
      });
      localStorage.setItem(EVENTS_KEY, JSON.stringify(entries.slice(0, MAX_EVENTS)));
    } catch (_) {}
  }

  function tryCopy(text) {
    var value = String(text || '');
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(value).catch(function () { legacyCopy(value); });
        return;
      }
    } catch (_) {}
    legacyCopy(value);
  }

  function legacyCopy(value) {
    try {
      var area = document.createElement('textarea');
      area.value = value;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    } catch (_) {}
  }

  function notifyTrimmed() {
    try {
      if (window.WTToast && typeof window.WTToast.notify === 'function') {
        window.WTToast.notify('Long export: Gmail preview truncated — full text copied, paste it into the draft', 'info');
      }
    } catch (_) {}
  }

  function openMailtoCompose(options) {
    var subjectText = String(options && options.subject || '').trim();
    var bodyText = String(options && options.body || '');
    if (!subjectText && !bodyText) return false;
    var mailtoUrl = buildMailtoUrl(subjectText, bodyText);
    try {
      window.open(mailtoUrl);
      logEvent({ tool: options && options.tool, kind: 'mailto', transport: 'mailto-window', trimmed: false });
      return true;
    } catch (_) {
      try {
        window.location.assign(mailtoUrl);
        logEvent({ tool: options && options.tool, kind: 'mailto', transport: 'mailto-location', trimmed: false });
        return true;
      } catch (_) {
        logEvent({ tool: options && options.tool, kind: 'mailto', transport: 'mailto-failed', trimmed: false });
      }
    }
    return false;
  }

  function openGmailCompose(options) {
    var opts = options && typeof options === 'object' ? options : {};
    var subjectText = String(opts.subject || '').trim();
    var fullBodyText = String(opts.body || '');
    var tool = String(opts.tool || 'tool');
    if (!subjectText && !fullBodyText.trim()) return { ok: false };

    var maxUrlBodyLength = Number.isFinite(opts.maxUrlBodyLength) ? Math.max(200, opts.maxUrlBodyLength) : DEFAULT_MAX_URL_BODY;
    var bodyForUrl = fullBodyText;
    var trimmed = false;
    if (bodyForUrl.length > maxUrlBodyLength) {
      trimmed = true;
      var head = Math.max(200, maxUrlBodyLength - 160);
      bodyForUrl = bodyForUrl.slice(0, head) +
        '\n\n[Preview truncated: Gmail links have a length limit. The complete text is on your clipboard — paste it here to replace this preview.]';
      // Always preserve the full text on the clipboard when trimming,
      // unless a caller explicitly opts out (it owns the copy itself).
      if (opts.copyFullBodyOnTrim !== false) {
        tryCopy(fullBodyText);
      }
      notifyTrimmed();
    }

    var gmailUrl = buildGmailUrl(subjectText, bodyForUrl);
    var mailtoUrl = buildMailtoUrl(subjectText, fullBodyText);

    if (isMobileClient()) {
      window.location.assign(gmailUrl);
      logEvent({ tool: tool, kind: 'gmail', transport: 'gmail-mobile-redirect', trimmed: trimmed });
      return { ok: true, transport: 'gmail-mobile-redirect', trimmed: trimmed, gmailUrl: gmailUrl, mailtoUrl: mailtoUrl };
    }

    var popup = null;
    try {
      popup = window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    } catch (_) {}
    if (popup && !popup.closed) {
      logEvent({ tool: tool, kind: 'gmail', transport: 'gmail-popup', trimmed: trimmed });
      return { ok: true, transport: 'gmail-popup', trimmed: trimmed, gmailUrl: gmailUrl, mailtoUrl: mailtoUrl };
    }

    try {
      var link = document.createElement('a');
      link.href = gmailUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
      logEvent({ tool: tool, kind: 'gmail', transport: 'gmail-anchor', trimmed: trimmed });
    } catch (_) {
      logEvent({ tool: tool, kind: 'gmail', transport: 'gmail-anchor-failed', trimmed: trimmed });
    }

    setTimeout(function () {
      try {
        if (document.visibilityState === 'visible' && document.hasFocus()) {
          window.location.assign(mailtoUrl);
          logEvent({ tool: tool, kind: 'gmail', transport: 'mailto-fallback', trimmed: trimmed });
        }
      } catch (_) {}
    }, 900);

    return { ok: true, transport: 'gmail-anchor', trimmed: trimmed, gmailUrl: gmailUrl, mailtoUrl: mailtoUrl };
  }

  window.WTExport = {
    openMailtoCompose: openMailtoCompose,
    openGmailCompose: openGmailCompose,
    logEvent: logEvent
  };
})();
