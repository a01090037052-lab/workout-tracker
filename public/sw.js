const CACHE_NAME = 'workout-tracker-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/workout-tracker/',
        '/workout-tracker/index.html',
        '/workout-tracker/manifest.json',
        '/workout-tracker/favicon.svg',
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // 네트워크 우선, 실패 시 캐시 (Network First)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 성공 시 캐시에 저장
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // 오프라인 시 캐시에서 응답
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('/workout-tracker/index.html');
        });
      })
  );
});
