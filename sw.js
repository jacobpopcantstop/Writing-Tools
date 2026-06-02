const WT_CACHE_NAME = 'writingtools-static-v3';
const WT_CORE_ASSETS = [
  './',
  './index.html',
  './CharacterForge.html',
  './Synax.html',
  './ThisButThat.html',
  './Joterie.html',
  './BeatHive.html',
  './Wribbon.html',
  './WitherNaught.html',
  './Courius.html',
  './PaperCut.html',
  './shared-toast.js',
  './shared-courius.js',
  './shared-export.js',
  './shared-recent-sessions.js',
  './shared-tool-manifest.js',
  './shared-commands.js',
  './shared-command-palette.js',
  './shared-pwa.js',
  './shared-design.css',
  './manifest.webmanifest',
  './icon-192.svg',
  './icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(WT_CACHE_NAME).then((cache) => cache.addAll(WT_CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== WT_CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const accept = request.headers.get('accept') || '';
  const isNavigation = request.mode === 'navigate' || accept.includes('text/html');

  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(WT_CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(WT_CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
