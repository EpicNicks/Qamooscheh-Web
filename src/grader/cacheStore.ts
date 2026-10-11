// BundleStore over Cache Storage: one Cache per language/variant/version, so
// dropping an old version is deleting its Cache. The keys are synthetic
// same-origin URLs; nothing ever fetches them.
import type { BundleStore } from "./bundle.ts";

const PREFIX = "grader:";

function request(path: string): string {
  return `/__grader/${path}`;
}

export const cacheStorageBundleStore: BundleStore = {
  async read(build, path) {
    const cache = await caches.open(PREFIX + build);
    const hit = await cache.match(request(path));
    return hit ? new Uint8Array(await hit.arrayBuffer()) : null;
  },

  async write(build, path, bytes) {
    const cache = await caches.open(PREFIX + build);
    await cache.put(request(path), new Response(bytes as BodyInit));
  },

  async prune(language, variant, keepVersion) {
    const family = `${PREFIX}${language}/${variant}/v`;
    const keep = `${family}${keepVersion}`;
    for (const name of await caches.keys()) {
      if (name.startsWith(family) && name !== keep) await caches.delete(name);
    }
  },
};
