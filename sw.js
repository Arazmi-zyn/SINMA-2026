// SINMA 2026 - Service Worker
// v7: Network-first for app files, no data caching, GAS always bypassed

var CACHE_NAME = 'sinma-v7';

// File aplikasi → Network-First
var NETWORK_FIRST = [
  './index.html',
  './app.js'
];

// Asset CDN → Cache-First
var CACHE_FIRST_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_FIRST_ASSETS).catch(function(err) {
        console.log('[SW] Cache addAll partial error (OK):', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  if (event.request.method !== 'GET') return;

  // JANGAN intercept GAS — data harus selalu segar dari server
  if (url.includes('script.google.com') ||
      url.includes('macros/s/') ||
      url.includes('script.googleusercontent.com')) {
    return;
  }

  var isAppFile = NETWORK_FIRST.some(function(f) {
    return url.includes(f.replace('./', ''));
  });

  if (isAppFile) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then(function(response) {
          if (response && response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
          }
          return response;
        }).catch(function() {
          return caches.match(event.request).then(function(cached) {
            return cached || caches.match('./index.html');
          });
        })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        return fetch(event.request).then(function(response) {
          if (!response || response.status !== 200 || response.type === 'opaque') return response;
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
          return response;
        }).catch(function() {
          return caches.match('./index.html');
        });
      })
    );
  }
});
