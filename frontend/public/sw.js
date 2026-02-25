// Service Worker для PWA
// Стратегия: network-first (всегда свежие данные с сервера)
const CACHE = "tg-sender-v1";
const STATIC = ["/", "/index.html"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  // API запросы — никогда не кэшируем
  if (e.request.url.includes("/api/")) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Кэшируем успешные GET-запросы
        if (e.request.method === "GET" && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
