const STATIC_CACHE = "bantabato-static-v1";
const STATIC_PATHS = ["/offline.html", "/manifest.webmanifest", "/pwa-icon.svg"];
const PRIVATE_PATHS = ["/api/", "/manus-storage/", "/__manus__/"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_PATHS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== STATIC_CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || PRIVATE_PATHS.some(path => url.pathname.startsWith(path))) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
    return;
  }
  const staticAsset = ["script", "style", "font", "image"].includes(request.destination) || STATIC_PATHS.includes(url.pathname);
  if (!staticAsset) return;
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok && response.type === "basic") caches.open(STATIC_CACHE).then(cache => cache.put(request, response.clone()));
    return response;
  })));
});
