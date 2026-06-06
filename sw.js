// Cambiar este número cada vez que actualices la app
const CACHE_NAME = 'meteo-barra-v3';

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll([
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

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
