/* GameDiary PWA Service Worker - v202611-001 */
const CACHE_NAME = 'gamediary-cache-v202611-001';
const APP_SHELL = ['./index.html'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // 필수 앱 셸만 캐시합니다. 존재하지 않는 선택 아이콘 때문에 설치 전체가 실패하지 않게 합니다.
    await cache.addAll(APP_SHELL);
  })());
  // 새 버전이 준비되면 이전 SW가 종료될 때까지 기다리지 않고 활성화합니다.
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith('gamediary-cache-') && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // HTML은 항상 서버 우선으로 받아 배포된 최신 화면을 사용하고, 오프라인일 때만 캐시를 씁니다.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put('./index.html', response.clone());
        }
        return response;
      } catch (error) {
        const cached = await caches.match('./index.html');
        if (cached) return cached;
        throw error;
      }
    })());
    return;
  }

  // 나머지 동일 출처 GET 리소스는 네트워크 우선, 실패 시 캐시로 대체합니다.
  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await caches.match(request);
      if (cached) return cached;
      throw error;
    }
  })());
});
