// SINMA 2026 - Service Worker
// v5: Update GAS_URL baru
var CACHE_NAME = 'sinma-v5';

// File aplikasi → pakai Network-First (selalu ambil terbaru, fallback ke cache)
var NETWORK_FIRST = [
  './index.html',
  './app.js'
];

// Asset CDN → pakai Cache-First (jarang berubah, hemat data)
var CACHE_FIRST_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_FIRST_ASSETS).catch(function(err) {
        console.log('Cache addAll partial error:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Jangan intercept request POST / non-GET sama sekali
  if (event.request.method !== 'GET') return;

  // Jangan cache / intercept request ke GAS → langsung ke jaringan
  if (url.includes('script.google.com') || url.includes('macros/s/') || url.includes('script.googleusercontent.com')) {
    return;
  }

  // Cek apakah ini file aplikasi (network-first)
  var isAppFile = NETWORK_FIRST.some(function(f) {
    return url.includes(f.replace('./', ''));
  });

  if (isAppFile) {
    // NETWORK-FIRST: ambil dari jaringan dulu, simpan ke cache, fallback ke cache kalau offline
    event.respondWith(
      fetch(event.request).then(function(response) {
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
    // CACHE-FIRST: untuk CDN assets (font, icon, dll)
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        return fetch(event.request).then(function(response) {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
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
