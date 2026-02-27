(function () {
  'use strict';

  if (!('serviceWorker' in navigator)) return;
  if (window.WTPWAInitialized) return;
  window.WTPWAInitialized = true;

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js').catch(function () {});
  });
})();
