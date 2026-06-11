(function () {
  'use strict';
  var TOAST_ID = 'wt-suite-toast';
  var STYLE_ID = 'wt-suite-toast-style';

  // Detect whether the host tool is currently on a light surface, regardless
  // of which theme mechanism it uses (data-wt-theme, data-theme, body classes,
  // or none) by sampling the effective page background.
  function isLightSurface() {
    if (typeof document === 'undefined' || !document.body) return false;
    var nodes = [document.body, document.documentElement];
    for (var i = 0; i < nodes.length; i++) {
      var bg = getComputedStyle(nodes[i]).backgroundColor || '';
      var m = bg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
      if (!m) continue;
      if (m[4] !== undefined && parseFloat(m[4]) === 0) continue;
      var lum = (0.2126 * Number(m[1]) + 0.7152 * Number(m[2]) + 0.0722 * Number(m[3])) / 255;
      return lum > 0.55;
    }
    return false;
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '#' + TOAST_ID + '{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translateX(-50%) translateY(10px) scale(.97);display:inline-flex;align-items:center;gap:8px;max-width:min(92vw,480px);padding:10px 16px 10px 13px;border-radius:999px;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;font-size:13px;font-weight:600;letter-spacing:.01em;line-height:1.35;opacity:0;pointer-events:none;z-index:2147483647;transition:opacity 220ms cubic-bezier(.22,1,.36,1),transform 220ms cubic-bezier(.22,1,.36,1);-webkit-backdrop-filter:blur(12px) saturate(1.4);backdrop-filter:blur(12px) saturate(1.4);background:rgba(22,22,26,.88);color:#f4f4f5;border:1px solid rgba(255,255,255,.14);box-shadow:0 8px 24px rgba(0,0,0,.35),0 2px 8px rgba(0,0,0,.25);}',
      '#' + TOAST_ID + '.wt-toast-visible{opacity:1;transform:translateX(-50%) translateY(0) scale(1);}',
      '#' + TOAST_ID + '.wt-toast-light{background:rgba(255,255,255,.92);color:#1c1c21;border-color:rgba(0,0,0,.1);box-shadow:0 8px 24px rgba(0,0,0,.14),0 2px 8px rgba(0,0,0,.08);}',
      '#' + TOAST_ID + ' .wt-toast-dot{flex:none;width:8px;height:8px;border-radius:999px;background:#a1a1aa;box-shadow:0 0 8px rgba(161,161,170,.5);}',
      '#' + TOAST_ID + '.wt-toast-success .wt-toast-dot{background:#4ade80;box-shadow:0 0 8px rgba(74,222,128,.6);}',
      '#' + TOAST_ID + '.wt-toast-error .wt-toast-dot{background:#f87171;box-shadow:0 0 8px rgba(248,113,113,.6);}',
      '#' + TOAST_ID + '.wt-toast-error{border-color:rgba(248,113,113,.4);}',
      '@media (prefers-reduced-motion:reduce){#' + TOAST_ID + '{transition:opacity 80ms linear;transform:translateX(-50%);}#' + TOAST_ID + '.wt-toast-visible{transform:translateX(-50%);}}',
      '@media print{#' + TOAST_ID + '{display:none !important;}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function ensureToastNode() {
    if (typeof document === 'undefined' || !document.body) return null;
    ensureStyles();
    var existing = document.getElementById(TOAST_ID);
    if (existing) return existing;
    var node = document.createElement('div');
    node.id = TOAST_ID;
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    var dot = document.createElement('span');
    dot.className = 'wt-toast-dot';
    dot.setAttribute('aria-hidden', 'true');
    var text = document.createElement('span');
    text.className = 'wt-toast-text';
    node.appendChild(dot);
    node.appendChild(text);
    document.body.appendChild(node);
    return node;
  }

  function notify(message, type) {
    var node = ensureToastNode();
    if (!node) return;
    var text = String(message || '').trim();
    if (!text) return;
    var level = String(type || 'info').toLowerCase();
    node.querySelector('.wt-toast-text').textContent = text;
    node.classList.toggle('wt-toast-light', isLightSurface());
    node.classList.toggle('wt-toast-error', level === 'error');
    node.classList.toggle('wt-toast-success', level === 'success');
    // restart the entrance transition if a toast is already visible
    node.classList.remove('wt-toast-visible');
    void node.offsetWidth;
    node.classList.add('wt-toast-visible');
    clearTimeout(node._wtHideTimer);
    node._wtHideTimer = setTimeout(function () {
      node.classList.remove('wt-toast-visible');
    }, 2200);
  }

  window.WTToast = { notify: notify };
})();
