const CACHE_NAME = 'workout-tracker-v20';
// 직전 버전 캐시는 지우지 않는다. 배포 순간 열려 있던 탭이 참조하는 해시 자산이
// 서버에서도 캐시에서도 사라지면 그 탭은 확정 크래시하기 때문.
const KEEP_CACHES = [CACHE_NAME, 'workout-tracker-v19'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/workout-tracker/',
        '/workout-tracker/index.html',
        '/workout-tracker/manifest.json',
        '/workout-tracker/favicon.svg',
        '/workout-tracker/apple-touch-icon.png',
        '/workout-tracker/pwa-192.png',
        '/workout-tracker/pwa-512.png',
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => !KEEP_CACHES.includes(key)).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 해시가 붙은 빌드 산출물은 내용이 불변 → 캐시 우선.
  // 배포로 서버에서 사라져도 이미 캐시된 탭은 계속 동작한다.
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          // 실패해도 index.html로 폴백하지 않는다 (JS 자리에 HTML이 오면 파싱 에러)
          return response;
        });
      }).catch(() => Response.error())
    );
    return;
  }

  // 그 외는 네트워크 우선, 실패 시 캐시 (Network First)
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // index.html 폴백은 페이지 이동일 때만. 그 외(JS/JSON 등)에 HTML을
          // 돌려주면 "Unexpected token '<'"로 앱이 죽는다.
          if (request.mode === 'navigate') {
            return caches.match('/workout-tracker/index.html');
          }
          return Response.error();
        });
      })
  );
});
