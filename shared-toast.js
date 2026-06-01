(function () {
  'use strict';
  var TOAST_ID = 'wt-suite-toast';

  function ensureToastNode() {
    if (typeof document === 'undefined') return null;
    var existing = document.getElementById(TOAST_ID);
    if (existing) return existing;
    var node = document.createElement('div');
    node.id = TOAST_ID;
    node.style.position = 'fixed';
    node.style.left = '50%';
    node.style.bottom = '20px';
    node.style.transform = 'translateX(-50%) translateY(8px)';
    node.style.padding = '8px 12px';
    node.style.borderRadius = '999px';
    node.style.fontSize = '11px';
    node.style.fontWeight = '700';
    node.style.letterSpacing = '0.08em';
    node.style.textTransform = 'uppercase';
    node.style.opacity = '0';
    node.style.pointerEvents = 'none';
    node.style.transition = 'opacity 160ms ease, transform 160ms ease';
    node.style.zIndex = '2147483647';
    node.style.backdropFilter = 'blur(6px)';
    node.style.background = 'rgba(14,14,14,0.9)';
    node.style.color = '#f4f4f5';
    node.style.border = '1px solid rgba(255,255,255,0.18)';
    document.body.appendChild(node);
    return node;
  }

  function notify(message, type) {
    var node = ensureToastNode();
    if (!node) return;
    var text = String(message || '').trim();
    if (!text) return;
    var level = String(type || 'info').toLowerCase();
    node.textContent = text;
    if (level === 'error') {
      node.style.background = 'rgba(127,29,29,0.92)';
      node.style.borderColor = 'rgba(252,165,165,0.45)';
      node.style.color = '#fee2e2';
    } else {
      node.style.background = 'rgba(14,14,14,0.9)';
      node.style.borderColor = 'rgba(255,255,255,0.18)';
      node.style.color = '#f4f4f5';
    }
    node.style.opacity = '1';
    node.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(node._wtHideTimer);
    node._wtHideTimer = setTimeout(function () {
      node.style.opacity = '0';
      node.style.transform = 'translateX(-50%) translateY(8px)';
    }, 1800);
  }

  window.WTToast = { notify: notify };
})();
