// The app's service worker. A scope has one worker, so this one does both
// offline jobs:
//
// - The app itself. On install it caches every file of the build it came
//   with; BUILD below is written in by vite.config.ts (precacheBuild) and stays
//   empty in dev, where none of this runs. Those files are answered from that
//   cache, and a page load that can't reach the network gets the cached
//   index.html, so the installed app opens offline. Page loads still go to the
//   network first, so a deploy shows on the next load rather than two loads on.
// - The published grader. Its files are served from Cache Storage when they
//   are there, so the grader starts offline. Its scripts are loaded by import(),
//   which only a service worker can answer from a cache. The copies are put
//   there by src/grader/loadGrader.ts (caches named "grader:{language}/v{version}");
//   this never writes to them. grader/index.json is not served from here:
//   loadGrader keeps its own copy of it.
//
// An updated copy of this worker waits (no skipWaiting) until the app's tabs
// are closed rather than taking over an open lesson, and the build it replaces
// stays cached until then; the first one claims the page it was installed from
// so the app and grading work offline straight away.
const BUILD = { version: "dev", files: [] };

const APP_CACHE_PREFIX = "app:";
const APP_CACHE = `${APP_CACHE_PREFIX}${BUILD.version}`;
const shell = new URL("index.html", self.registration.scope).href;
const precached = new Set(BUILD.files.map((path) => new URL(path, self.registration.scope).href));

self.addEventListener("install", (event) =>
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll([...precached].map((url) => new Request(url, { cache: "no-cache" })))),
  ),
);

self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name.startsWith(APP_CACHE_PREFIX) && name !== APP_CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  ),
);

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const { pathname } = new URL(request.url);

  if (request.mode === "navigate") {
    if (!precached.has(shell)) return;
    event.respondWith(fetch(request).catch(() => caches.match(shell, { cacheName: APP_CACHE }).then((hit) => hit ?? Response.error())));
    return;
  }
  if (precached.has(request.url)) {
    event.respondWith(caches.match(request.url, { cacheName: APP_CACHE }).then((hit) => hit ?? fetch(request)));
    return;
  }
  if (!pathname.includes("/grader/") || pathname.endsWith("/grader/index.json")) return;
  event.respondWith(caches.match(request.url).then((hit) => hit ?? fetch(request)));
});
