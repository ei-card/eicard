const VERSION = '1.2.5';
const CACHE_STATIC =`eikan-static-${VERSION}`;
const CACHE_DYNAMIC = `eikan-dynamic-${VERSION}`;

const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './offline.html',
  './data/menu.json',
  './data/sign.json',
  './data/pay.json',
  './data/hotel.json',
  './data/admin.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key =>
          key !== CACHE_STATIC &&
          key !== CACHE_DYNAMIC
        ).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {

  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {

      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          return caches.open(CACHE_DYNAMIC).then(cache => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => {
          if (event.request.destination === 'document') {
            return caches.match('./offline.html');
          }
        });
    })
  );
});
