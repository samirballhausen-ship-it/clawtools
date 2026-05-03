// CLAWBUIS Tools Service Worker — network-first für HTML, cache-first für statische CDN-Libs
// VERSION 2 — bumpt Cache komplett, fixt "ich sehe alte Version"-Bug.
const CACHE_VERSION = 'clawtools-v2-2026-05-03';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const LIB_CACHE = `${CACHE_VERSION}-lib`;

self.addEventListener('install', (event) => {
  // Skip waiting → neuer SW aktiviert sich SOFORT (statt zu warten bis alle Tabs zu sind)
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Alle alten Caches löschen — egal welche Version
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      );
      // Sofort claim — der neue SW kontrolliert ALLE offenen Tabs
      await self.clients.claim();
      // Notify clients dass neuer SW aktiv ist
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((c) => c.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION }));
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Same-origin HTML/JS/CSS: NETWORK-FIRST (fresh content), Cache als Fallback
  // Vorher war stale-while-revalidate → User sah alten Code. Jetzt: Network gewinnt.
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        try {
          const networkResp = await fetch(req, { cache: 'no-cache' });
          if (networkResp && networkResp.ok) {
            const cache = await caches.open(SHELL_CACHE);
            cache.put(req, networkResp.clone()).catch(() => {});
          }
          return networkResp;
        } catch (e) {
          // Offline-Fallback: Cache benutzen
          const cache = await caches.open(SHELL_CACHE);
          const cached = await cache.match(req);
          if (cached) return cached;
          // Letzter Ausweg
          return new Response('Offline und nicht im Cache', { status: 504 });
        }
      })()
    );
    return;
  }

  // Cross-origin CDN-Libs: cache-first (die ändern sich kaum, sind groß)
  if (url.hostname.endsWith('jsdelivr.net') || url.hostname.endsWith('cdnjs.cloudflare.com') || url.hostname.endsWith('unpkg.com') || url.hostname.endsWith('esm.sh') || url.hostname.endsWith('skypack.dev') || url.hostname.endsWith('staticimgly.com')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(LIB_CACHE);
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const resp = await fetch(req);
          if (resp && resp.ok) cache.put(req, resp.clone()).catch(() => {});
          return resp;
        } catch (e) {
          return new Response('', { status: 504 });
        }
      })()
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    );
  }
});
