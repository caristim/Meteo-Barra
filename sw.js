const CACHE_NAME = 'meteo-ia-v2';

self.addEventListener('install', event => {
  // Toma control inmediato sin esperar a que se cierren otras pestañas
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
    // Elimina todos los cachés viejos (incluidos los de otras apps)
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => {
      // Toma control de todos los clientes inmediatamente
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
