const CACHE_NAME = "valepac-clientes-v4";
const ASSETS = [
  "/clientes/",
  "/clientes/index.html",
  "/clientes/styles.css",
  "/clientes/app.js",
  "/clientes/manifest.webmanifest",
  "/clientes/icon-192.png",
  "/clientes/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
