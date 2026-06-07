// Cambiar este número cada vez que actualices la app
const CACHE_NAME = 'meteo-barra-v3';

// 1. Evento de instalación: guarda en caché los archivos esenciales de la app
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

// 2. Evento de activación: LIMPIEZA SEGURA (No borra los cachés de tus otras apps de GitHub)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          // SOLO borra el caché si es viejo y si pertenece a ESTA app (empieza con meteo-barra-)
          if (key !== CACHE_NAME && key.startsWith('meteo-barra-')) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// 3. Evento fetch: sirve desde el caché si el celular se queda sin conexión
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
