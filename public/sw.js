/* Miyomi service worker — offline shell + asset caching for the PWA. */
// Bump to drop every previously cached file on the next activation.
const CACHE = 'miyomi-v2';
const SHELL = ['/'];
// Hashed bundles accumulate across deploys; keep only the newest entries.
const MAX_ENTRIES = 120;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cache) {
  const keys = await cache.keys();
  // Cache keys are in insertion order; drop the oldest (never the shell).
  const removable = keys.filter((request) => new URL(request.url).pathname !== '/');
  await Promise.all(removable.slice(0, Math.max(0, removable.length - MAX_ENTRIES)).map((request) => cache.delete(request)));
}

const isCacheable = (url) => url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/');

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Same-origin GETs only; never touch the API or cross-origin resources.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Navigations: network-first, fall back to the cached app shell offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put('/', copy));
          }
          return response;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  // Everything else that is never cached goes straight to the network.
  if (!isCacheable(url)) return;

  // Hashed assets + icons: cache-first.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy).then(() => trim(cache))));
          }
          return response;
        }),
    ),
  );
});
