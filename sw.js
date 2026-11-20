// Offline support. The app shell is cached on first visit; animations are cached
// the first time they are shown. Code is network-first, so an update is picked up
// as soon as the phone is online, and the cached copy is used in a gym with no signal.

// Bump on every release so old caches are dropped.
const VERSION = 'gb-v2';
const SHELL = [
  './',
  './index.html',
  './css/app.css?v=2',
  './js/app.js?v=2',
  './js/util.js',
  './js/catalog.js',
  './js/history.js',
  './js/payload.js',
  './js/settings.js',
  './js/sheets.js',
  './js/panels.js',
  './js/format.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Telegram SDK: network first, cached copy offline.
  if (url.hostname === 'telegram.org') {
    event.respondWith(networkFirst(req, true));
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Animations never change for a given name: cache first.
  if (url.pathname.includes('/assets/')) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    })));
    return;
  }

  // Page (any ?p= programme) and code: network first, cache when offline.
  event.respondWith(networkFirst(req, req.mode === 'navigate'));
});

function networkFirst(req, ignoreSearch) {
  // A navigation Request cannot be re-created with options.
  const live = req.mode === 'navigate' ? fetch(req) : fetch(req, { cache: 'no-cache' });
  return live.then((res) => {
    if (res.ok || res.type === 'opaque') {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(req, copy));
    }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch }).then((hit) => {
    if (hit) return hit;
    if (req.mode === 'navigate') return caches.match('./index.html');
    return Response.error();
  }));
}
