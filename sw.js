const CACHE_NAME = 'meteo-ia-v1';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll([
        './',
        './index.html',
        './style.css',
        './script.js',
        './manifest.json',
        './Icons/apple-touch-icon.png',
        './Icons/icon-192.png',
        './Icons/icon-512.png'
      ]))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
