// Cache Storage for the CDN's versioned course files. A course version's files
// never change once published (course/{code}/v{version}/...), so each is kept
// in a cache named for its version and answered cache-first: downloaded at most
// once per version across reloads and tabs. Same conventions as the grader's
// cache (grader/loadGrader.ts). Without Cache Storage (private mode, an
// insecure context) every read is a plain fetch.

const CACHE_PREFIX = "content:";

export const contentCacheName = (courseCode: string, version: number) => `${CACHE_PREFIX}${courseCode}/v${version}`;

/** Checks a body before it is trusted; throws to reject it. */
export type AcceptBytes = (bytes: ArrayBuffer) => void | Promise<void>;

const inFlight = new Map<string, Promise<ArrayBuffer>>();

async function openCache(cacheName: string): Promise<Cache | null> {
  if (typeof caches === "undefined") return null;
  try {
    return await caches.open(cacheName);
  } catch {
    return null;
  }
}

async function download(url: string, cacheName: string, accept?: AcceptBytes): Promise<ArrayBuffer> {
  const cache = await openCache(cacheName);
  if (cache) {
    const hit = await cache.match(url).catch(() => undefined);
    if (hit) {
      try {
        const bytes = await hit.arrayBuffer();
        await accept?.(bytes);
        return bytes;
      } catch {
        // A cached copy that is unreadable or fails its check is dropped and fetched again.
        await cache.delete(url).catch(() => {});
      }
    }
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  // The whole body is read before anything is stored, so a dropped connection never leaves a partial entry.
  const bytes = await response.arrayBuffer();
  await accept?.(bytes);
  if (cache && response.status === 200) {
    const headers = new Headers();
    const type = response.headers.get("Content-Type");
    if (type) headers.set("Content-Type", type);
    await cache.put(url, new Response(bytes.slice(0), { headers })).catch(() => {});
  }
  return bytes;
}

/**
 * The body of a versioned CDN file: from `cacheName` when it holds it, else
 * fetched and stored there. Concurrent calls for one URL share one request. A
 * failure (network, non-2xx, or `accept` throwing) is neither cached nor
 * remembered, so the next call tries again.
 */
export function fetchContentBytes(url: string, cacheName: string, accept?: AcceptBytes): Promise<ArrayBuffer> {
  const pending = inFlight.get(url);
  if (pending) return pending.then((bytes) => bytes.slice(0));
  const request = download(url, cacheName, accept);
  inFlight.set(url, request);
  const forget = () => {
    if (inFlight.get(url) === request) inFlight.delete(url);
  };
  request.then(forget, forget);
  return request.then((bytes) => bytes.slice(0));
}

export async function fetchContentJson<T>(url: string, cacheName: string, accept?: AcceptBytes): Promise<T> {
  return JSON.parse(new TextDecoder().decode(await fetchContentBytes(url, cacheName, accept))) as T;
}

// --- Pruning --------------------------------------------------------------

// A lesson in progress pins the course version it started with (domain/lessonPin.ts),
// so its cache is never pruned while the lesson is open. Held in this tab by a
// count and across tabs by a shared Web Lock, where those exist.
const pinned = new Map<string, number>();
let liveCaches: string[] = [];

/** Keeps `cacheName` out of pruning until the returned release is called, which then prunes what is no longer needed. */
export function pinContentCache(cacheName: string): () => void {
  pinned.set(cacheName, (pinned.get(cacheName) ?? 0) + 1);
  let released = false;
  let releaseLock: () => void = () => {};
  let lockDone: Promise<unknown> = Promise.resolve();
  if (typeof navigator !== "undefined" && navigator.locks) {
    lockDone = navigator.locks
      .request(`qamooscheh-${cacheName}`, { mode: "shared" }, () =>
        released ? undefined : new Promise<void>((resolve) => (releaseLock = resolve)),
      )
      .catch(() => {});
  }
  return () => {
    if (released) return;
    released = true;
    const left = (pinned.get(cacheName) ?? 1) - 1;
    if (left > 0) pinned.set(cacheName, left);
    else pinned.delete(cacheName);
    releaseLock();
    // Once this tab's own lock is let go, so pruning doesn't see it as another tab's.
    void lockDone.then(() => pruneContentCaches());
  };
}

async function lockedElsewhere(): Promise<Set<string>> {
  const held = new Set<string>();
  if (typeof navigator === "undefined" || !navigator.locks) return held;
  try {
    const { held: locks } = await navigator.locks.query();
    for (const lock of locks ?? []) {
      if (lock.name?.startsWith(`qamooscheh-${CACHE_PREFIX}`)) held.add(lock.name.slice("qamooscheh-".length));
    }
  } catch {
    // Without the lock listing only this tab's own pins protect a cache.
  }
  return held;
}

/**
 * Deletes the content caches of superseded versions: every one except the live
 * course version(s) (the last passed in, kept for later calls) and any a lesson
 * has pinned, in this tab or another. Best effort.
 */
export async function pruneContentCaches(live?: string[]): Promise<void> {
  if (live) liveCaches = live;
  if (typeof caches === "undefined") return;
  try {
    const keep = new Set([...liveCaches, ...pinned.keys(), ...(await lockedElsewhere())]);
    for (const name of await caches.keys()) {
      if (name.startsWith(CACHE_PREFIX) && !keep.has(name)) await caches.delete(name);
    }
  } catch (error) {
    console.warn("Couldn't prune old course content", error);
  }
}
