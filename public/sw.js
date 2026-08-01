// BaitBuddy Service Worker
// Strategie:
//  - App-Shell wird beim Install vorab gecacht (Offline-Start)
//  - Navigationen: Network-First, Fallback auf gecachte index.html (Offline)
//  - Statische Same-Origin-Assets (/assets/, /icons/, Bilder, Fonts):
//    Stale-While-Revalidate (schneller Start + Hintergrund-Update)
//  - API-Aufrufe (/api/) und Cross-Origin-Requests: immer direkt ans Netzwerk
const VERSION = 'v5';
const SHELL_CACHE = `baitbuddy-shell-${VERSION}`;
const ASSET_CACHE = `baitbuddy-assets-${VERSION}`;

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Sofortige Aktivierung eines wartenden Workers ermöglichen (Update-Flow im UI)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// Klick auf eine Benachrichtigung: bestehendes App-Fenster fokussieren und zur
// Ziel-Route schicken, sonst ein neues öffnen. Nötig, weil Android und iOS
// Benachrichtigungen ausschließlich über registration.showNotification()
// zulassen — der Klick landet damit hier und nicht bei notification.onclick.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data && event.notification.data.url;
  const targetUrl = new URL(target || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (target && 'navigate' in client) {
            return client.focus().then((focused) => (focused || client).navigate(targetUrl));
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    })
  );
});

// Error handling für Port-Disconnects
self.addEventListener('error', (event) => {
  console.error('[SW] Service Worker Error:', event.error || event.message);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled Promise Rejection:', event.reason);
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(?:js|css|png|jpg|jpeg|webp|svg|gif|ico|woff2?|ttf)$/i.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Nur Same-Origin behandeln; API niemals cachen
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Navigationen: Network-First mit Offline-Fallback auf App-Shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', copy))
            .catch(err => console.warn('[SW] Cache put failed:', err));
          return response;
        })
        .catch((error) => {
          console.warn('[SW] Navigation fetch failed:', error);
          return caches.match('/index.html').then((r) => r || caches.match('/'))
            .catch(err => {
              console.error('[SW] Fallback to cached shell failed:', err);
              return new Response('Offline - App Shell nicht verfügbar', { status: 503 });
            });
        })
    );
    return;
  }

  // Statische Assets: Stale-While-Revalidate
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(ASSET_CACHE)
        .then((cache) =>
          cache.match(request).then((cached) => {
            const network = fetch(request)
              .then((response) => {
                if (response && response.status === 200) {
                  cache.put(request, response.clone())
                    .catch(err => console.warn('[SW] Cache update failed:', err));
                }
                return response;
              })
              .catch((error) => {
                console.warn('[SW] Asset fetch failed, using cache:', error);
                return cached;
              });
            return cached || network;
          })
        )
        .catch((cacheError) => {
          console.error('[SW] Cache access failed:', cacheError);
          return fetch(request).catch(() => null);
        })
    );
  }
});
