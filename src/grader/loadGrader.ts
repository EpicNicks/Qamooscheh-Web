// The app's way of getting the published grader. The grader is not downloaded
// from anywhere at runtime: scripts/fetch-grader.mjs put the latest published
// build for each course language in this app's own origin (public/grader/) when
// the app was built, and public/grader/index.json says which version that is.
// This loads it lazily (never in the main bundle) from there and keeps a copy
// of its files in Cache Storage, keyed by version, so grading keeps working
// offline. Starting it is runtime.ts, which scripts/verify-grader.mjs drives
// in Node too.
import { resourceResponse, startGrader } from "./runtime";
import type { Grader, GraderIndex, ShippedGrader } from "./types";

const CACHE_PREFIX = "grader:";

const base = new URL(import.meta.env.BASE_URL, location.origin);
const url = (path: string) => new URL(path, base).href;

let index: Promise<GraderIndex> | null = null;

/** The graders this build shipped. Read once per page load; a failed read is forgotten. */
function shippedIndex(): Promise<GraderIndex> {
  if (!index) {
    index = fetch(url("grader/index.json"), { cache: "no-cache" }).then((response) => {
      if (!response.ok) throw new Error(`Failed to fetch grader/index.json: ${response.status}`);
      return response.json() as Promise<GraderIndex>;
    });
    index.catch(() => (index = null));
  }
  return index;
}

/** The directory a shipped build is served from. */
const rootOf = ({ language, version }: ShippedGrader) => url(`grader/${language}/v${version}`);

const cacheNameOf = ({ language, version }: ShippedGrader) => `${CACHE_PREFIX}${language}/v${version}`;

/**
 * Makes sure every file of the build is in its Cache Storage cache and drops
 * the caches of this language's other versions. Returns the cache, or null
 * where Cache Storage isn't available (the files are then fetched as needed).
 */
async function cacheBuild(shipped: ShippedGrader): Promise<Cache | null> {
  if (typeof caches === "undefined") return null;
  try {
    const name = cacheNameOf(shipped);
    const cache = await caches.open(name);
    const root = rootOf(shipped);
    await Promise.all(
      shipped.files.map(async (path) => {
        if (!(await cache.match(`${root}/${path}`))) await cache.add(`${root}/${path}`);
      }),
    );
    const family = `${CACHE_PREFIX}${shipped.language}/v`;
    for (const other of await caches.keys()) {
      if (other.startsWith(family) && other !== name) await caches.delete(other);
    }
    return cache;
  } catch (error) {
    console.warn("Couldn't cache the grader for offline use", error);
    return null;
  }
}

const loads = new Map<string, Promise<Grader | null>>();

/**
 * The grader for `language`, started; null when this build shipped none for
 * it. One start per language per page load; a failed one is forgotten so a
 * retry runs again.
 */
export function loadGrader(language: string): Promise<Grader | null> {
  const existing = loads.get(language);
  if (existing) return existing;

  const load = (async () => {
    const shipped = (await shippedIndex()).graders.find((g) => g.language === language);
    if (!shipped) return null;
    const root = rootOf(shipped);
    const cache = await cacheBuild(shipped);
    return startGrader(root, async (path) => {
      const hit = await cache?.match(`${root}/${path}`);
      if (hit) return resourceResponse(path, new Uint8Array(await hit.arrayBuffer()));
      return fetch(`${root}/${path}`);
    });
  })();
  loads.set(language, load);
  load.catch(() => loads.delete(language));
  return load;
}
