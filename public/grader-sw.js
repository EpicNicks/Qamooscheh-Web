// Serves the published grader's files from Cache Storage when they are there,
// so the grader starts offline. Its scripts are loaded by import(), which only
// a service worker can answer from a cache. The copies are put there by
// src/grader/loadGrader.ts (caches named "grader:{language}/v{version}"); this
// never writes to them. grader/index.json is not served from here: loadGrader
// keeps its own copy of it.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const { pathname } = new URL(request.url);
  if (!pathname.includes("/grader/") || pathname.endsWith("/grader/index.json")) return;
  event.respondWith(caches.match(request.url).then((hit) => hit ?? fetch(request)));
});
