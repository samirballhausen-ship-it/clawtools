// CLAWBUIS Tools Service Worker — offline shell + cache static assets
const CACHE_VERSION = 'clawtools-v1';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;

// Pre-cache app-shell on install
const SHELL_ASSETS = [
  '/',
  '/shared/shell.css',
  '/shared/shell.js',
  '/shared/tokens.css',
  '/manifest.webmanifest',
  '/shared/icons/icon-192.png',
  '/shared/icons/icon-512.png',
  '/shared/icons/apple-touch-icon-180.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Same-origin: stale-while-revalidate (so updates get rolled in but app stays fast)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const networkPromise = fetch(req).then((resp) => {
          if (resp && resp.status === 200 && resp.type === 'basic') {
            cache.put(req, resp.clone()).catch(() => {});
          }
          return resp;
        }).catch(() => cached);
        return cached || networkPromise;
      })
    );
    return;
  }

  // Cross-origin (CDN libs): cache-first with network fallback
  if (url.hostname.endsWith('jsdelivr.net') || url.hostname.endsWith('cdnjs.cloudflare.com') || url.hostname.endsWith('unpkg.com')) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        const resp = await fetch(req).catch(() => null);
        if (resp && resp.status === 200) cache.put(req, resp.clone()).catch(() => {});
        return resp || new Response('', { status: 504 });
      })
    );
  }
});

// Manual update trigger from main thread
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
