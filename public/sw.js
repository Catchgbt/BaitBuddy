// BaitBuddy Service Worker
// Strategie:
//  - App-Shell wird beim Install vorab gecacht (Offline-Start)
//  - Navigationen: Network-First, Fallback auf gecachte index.html (Offline)
//  - Statische Same-Origin-Assets (/assets/, /icons/, Bilder, Fonts):
//    Stale-While-Revalidate (schneller Start + Hintergrund-Update)
//  - API-Aufrufe (/api/) und Cross-Origin-Requests: immer direkt ans Netzwerk
const VERSION = 'v3';
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
          caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    );
    return;
  }

  // Statische Assets: Stale-While-Revalidate
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const network = fetch(request)
            .then((response) => {
              if (response && response.status === 200) cache.put(request, response.clone());
              return response;
            })
            .catch(() => cached);
          return cached || network;
        })
      )
    );
  }
});
