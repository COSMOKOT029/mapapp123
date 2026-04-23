const CACHE_NAME = 'trip-map-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './lib/leaflet.js',
  './lib/leaflet.css',
  './lib/images/marker-icon.png',
  './lib/images/marker-icon-2x.png',
  './lib/images/marker-shadow.png',
  './icon-192.png',
  './icon-512.png'
];

// Установка — кешируем статику
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Активация — чистим старые кеши
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Запросы — сначала кеш, потом сеть (+ кешируем тайлы карты на лету)
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  
  // Тайлы OpenStreetMap — кешируем по мере загрузки
  if (url.hostname.includes('tile.openstreetmap.org')) {
    e.respondWith(
      caches.open('osm-tiles').then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(response => {
            if (response.ok) cache.put(e.request, response.clone());
            return response;
          }).catch(() => cached); // офлайн — отдаём что есть
        })
      )
    );
    return;
  }
  
  // Nominatim (поиск) — только онлайн, не кешируем
  if (url.hostname.includes('nominatim')) {
    return; // пусть идёт обычным путём
  }
  
  // Всё остальное (наши файлы) — сначала кеш
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});