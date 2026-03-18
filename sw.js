/* ═══════════════════════════════════════════════
   Coberturas Multioficio — Service Worker v1.0.0
   Network First · Promise.allSettled
═══════════════════════════════════════════════ */

const CACHE_NAME = 'coberturas-multioficio-v1.0.0';

const ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-167.png',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-256.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/icon-16.png',
  './icons/icon-32.png',
  './icons/icon-48.png'
];

/* ── INSTALL: cache all local assets ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        ASSETS.map(url =>
          cache.add(url).catch(err =>
            console.warn('[SW] No se pudo cachear:', url, err)
          )
        )
      );
    }).then(() => {
      console.log('[SW] Instalado:', CACHE_NAME);
      return self.skipWaiting();
    })
  );
});

/* ── ACTIVATE: delete old caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Eliminando caché antiguo:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

/* ── FETCH: Network First, fallback to cache ── */
self.addEventListener('fetch', event => {
  // Only handle GET requests for same-origin or local assets
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip external requests (Google Fonts, etc.) — let them go through normally
  if (url.origin !== self.location.origin &&
      !event.request.url.startsWith(self.registration.scope)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Cache a fresh copy on successful network response
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Network failed → serve from cache
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) return cachedResponse;
          // Last resort fallback to index.html for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Sin conexión', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});
