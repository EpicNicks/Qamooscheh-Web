// The app's way of getting the published grader: the content CDN as the
// source, Cache Storage as the per-version cache, blob: URLs for the modules
// the .NET runtime imports. Everything it does is in bundle.ts and runtime.ts,
// which scripts/verify-grader.mjs drives in Node.
import { CONTENT_BASE_URL } from "../config";
import { sha256Hex } from "../lib/sha256";
import { ensureBundle } from "./bundle";
import { cacheStorageBundleStore } from "./cacheStore";
import { startGrader } from "./runtime";
import type { Grader, GraderPointer } from "./types";

/** The variant this client runs: the build Android runs too, so both share an artifact and a version stream. */
export const GRADER_VARIANT = "browser";

const loads = new Map<string, Promise<Grader>>();

/**
 * Downloads (or reads from the cache), verifies and starts the build
 * `pointer` names. One start per build per page load; a failed one is
 * forgotten so a retry runs again.
 */
export function loadGrader(pointer: GraderPointer): Promise<Grader> {
  const key = `${pointer.language}/${pointer.variant}/v${pointer.version}/${pointer.manifestSha256}`;
  const existing = loads.get(key);
  if (existing) return existing;

  const load = (async () => {
    const bundle = await ensureBundle(pointer, {
      baseUrl: CONTENT_BASE_URL,
      fetch: (url) => fetch(url),
      store: cacheStorageBundleStore,
      sha256Hex: async (bytes) => sha256Hex(bytes as Uint8Array<ArrayBuffer>),
    });
    return startGrader(bundle, (source) => URL.createObjectURL(new Blob([source], { type: "text/javascript" })));
  })();
  loads.set(key, load);
  load.catch(() => loads.delete(key));
  return load;
}
