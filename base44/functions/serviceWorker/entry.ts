// CatchGBT Service Worker fuer optimales Caching und Performance
const CACHE_VERSION = 'catchgbt-v1.5.0';
const CACHE_NAMES = {
  static: `${CACHE_VERSION}-static`,
  dynamic: `${CACHE_VERSION}-dynamic`,
  images: `${CACHE_VERSION}-images`,
  api: `${CACHE_VERSION}-api`,
  mediapipe: `${CACHE_VERSION}-mediapipe`,
};

const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
];

const MEDIAPIPE_ASSETS = [
  'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.wasm',
];

Deno.serve((req) => {
  const swCode = `
    const CACHE_VERSION = '${CACHE_VERSION}';
    const CACHE_NAMES = ${JSON.stringify(CACHE_NAMES)};
    const PRECACHE_ASSETS = ${JSON.stringify(PRECACHE_ASSETS)};

    // Install Event - Precache wichtige Assets und MediaPipe
    self.addEventListener('install', (event) => {
      console.log('[SW] Installing Service Worker v' + CACHE_VERSION);
      event.waitUntil(
        Promise.all([
          caches.open(CACHE_NAMES.static).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS);
          }),
          caches.open(CACHE_NAMES.mediapipe).then((cache) => {
            return Promise.allSettled(
              ${JSON.stringify(MEDIAPIPE_ASSETS)}.map((url) =>
                fetch(url).then((response) => {
                  if (response.status === 200) {
                    return cache.put(url, response);
                  }
                }).catch((e) => {
                  console.log('[SW] Could not precache:', url, e.message);
                })
              )
            );
          })
        ]).then(() => self.skipWaiting())
      );
    });

    // Activate Event - Alte Caches loeschen
    self.addEventListener('activate', (event) => {
      console.log('[SW] Activating Service Worker v' + CACHE_VERSION);
      event.waitUntil(
        caches.keys().then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              if (!Object.values(CACHE_NAMES).includes(cacheName)) {
                console.log('[SW] Deleting old cache:', cacheName);
                return caches.delete(cacheName);
              }
              return Promise.resolve();
            })
          );
        }).then(() => self.clients.claim())
      );
    });

    // Fetch Event - Intelligentes Caching
    self.addEventListener('fetch', (event) => {
      const { request } = event;
      const url = new URL(request.url);

      // Skip fuer non-GET Requests
      if (request.method !== 'GET') {
        return;
      }

      // Auth-Requests niemals cachen
      const isAuthRequest =
        /\\/(auth|login|logout|token|session)/.test(url.pathname) ||
        url.pathname.includes('/auth/') ||
        request.headers.get('authorization');

      if (isAuthRequest) {
        event.respondWith(fetch(request));
        return;
      }

      // MediaPipe Assets - Cache First
      if (url.hostname.includes('cdn.jsdelivr.net') && url.pathname.includes('mediapipe')) {
        event.respondWith(
          caches.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request).then((response) => {
              if (response.status === 200) {
                const clone = response.clone();
                caches.open(CACHE_NAMES.mediapipe).then((c) => c.put(request, clone));
              }
              return response;
            }).catch(() => new Response(
              'MediaPipe asset offline',
              { status: 503, statusText: 'Service Unavailable' }
            ));
          })
        );
        return;
      }

      // Statische Assets - Cache First
      if (/\\.(js|css|woff2)$/.test(url.pathname)) {
        event.respondWith(
          caches.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request).then((response) => {
              if (response.status === 200) {
                const clone = response.clone();
                caches.open(CACHE_NAMES.static).then((c) => c.put(request, clone));
              }
              return response;
            });
          })
        );
        return;
      }

      // Bilder - Cache First
      if (/\\.(png|jpg|jpeg|gif|webp|svg)$/.test(url.pathname)) {
        event.respondWith(
          caches.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request).then((response) => {
              if (response.status === 200) {
                const clone = response.clone();
                caches.open(CACHE_NAMES.images).then((c) => c.put(request, clone));
              }
              return response;
            }).catch(() => new Response(
              '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><text x="50%" y="50%" text-anchor="middle" fill="#666">Offline</text></svg>',
              { headers: { 'Content-Type': 'image/svg+xml' } }
            ));
          })
        );
        return;
      }

      // Entity-API-Anfragen (Fangbuch, Spots, etc.) - Network First mit Cache-Fallback
      // Erkennt Supabase-Entity-Requests und cached sie fuer Offline-Zugriff
      const isEntityRequest =
        url.hostname.includes('supabase.co') &&
        !isAuthRequest;

      if (isEntityRequest) {
        event.respondWith(
          fetch(request.clone()).then((response) => {
            if (response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAMES.api).then((c) => c.put(request, clone));
            }
            return response;
          }).catch(() => {
            return caches.match(request).then((cached) => {
              if (cached) {
                console.log('[SW] Serving entity data from cache (offline):', url.pathname);
                return cached;
              }
              return new Response(
                JSON.stringify({ error: 'Offline', cached: false, data: [] }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
              );
            });
          })
        );
        return;
      }

      // Allgemeine API Calls - Network First mit Cache Fallback
      if (/\\/api\\//.test(url.pathname)) {
        event.respondWith(
          fetch(request).then((response) => {
            if (response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAMES.dynamic).then((c) => c.put(request, clone));
            }
            return response;
          }).catch(() => {
            return caches.match(request).then((cached) => {
              if (cached) return cached;
              return new Response(
                JSON.stringify({ error: 'Offline', cached: false }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
              );
            });
          })
        );
        return;
      }

      // HTML Pages - Network First
      if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
        event.respondWith(
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAMES.dynamic).then((c) => c.put(request, clone));
            return response;
          }).catch(() => caches.match(request))
        );
        return;
      }

      // Default - Network First
      event.respondWith(
        fetch(request).catch(() => caches.match(request))
      );
    });

    // Message Event fuer manuelle Cache-Verwaltung
    self.addEventListener('message', (event) => {
      if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
      }
      if (event.data === 'CLEAR_CACHE') {
        event.waitUntil(
          caches.keys().then((cacheNames) => {
            return Promise.all(cacheNames.map((n) => caches.delete(n)));
          })
        );
      }
    });
  `;

  return new Response(swCode, {
    status: 200,
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Service-Worker-Allowed': '/',
    },
  });
});