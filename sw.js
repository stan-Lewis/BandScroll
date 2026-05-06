// BandScroll Service Worker — offline support
const CACHE = 'bandscroll-v7';
const CORE = [
  '/BandScroll/',
  '/BandScroll/index.html',
  '/BandScroll/bandscroll.html',
  '/BandScroll/manifest.json',
  '/BandScroll/icon.svg',
];

// Install: cache the app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()) // don't block install on CDN failures
  );
});

// Activate: clear old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch: network-first for same-origin HTML, cache-first for everything else
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Let Ably, Firebase, OpenAI, LRCLIB etc go straight to network
  if (url.origin !== self.location.origin) return;

  // Network-first for the main app HTML (so updates always get picked up)
  if (CORE.includes(url.pathname)) {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return resp;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match('/BandScroll/')))
    );
    return;
  }

  // Cache-first for everything else on the same origin
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
