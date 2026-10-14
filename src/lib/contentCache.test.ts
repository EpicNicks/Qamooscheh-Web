import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KEEP_LIVE_VERSIONS, contentCacheName, fetchContentBytes, fetchContentJson, pinContentCache, pruneContentCaches } from "./contentCache";

/** Cache Storage stand-in: named caches of url -> body. */
function fakeCaches() {
  const stores = new Map<string, Map<string, Uint8Array>>();
  const open = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name)!;
    return Promise.resolve({
      match: (url: string) => {
        const body = store.get(url);
        return Promise.resolve(body ? new Response(body.slice()) : undefined);
      },
      put: async (url: string, response: Response) => void store.set(url, new Uint8Array(await response.arrayBuffer())),
      delete: (url: string) => Promise.resolve(store.delete(url)),
    });
  };
  return {
    stores,
    impl: {
      open: vi.fn(open),
      keys: () => Promise.resolve([...stores.keys()]),
      delete: (name: string) => Promise.resolve(stores.delete(name)),
    },
  };
}

const json = (value: unknown) => new Response(JSON.stringify(value), { status: 200, headers: { "Content-Type": "application/json" } });
const NAME = contentCacheName("fr", 3);
const URL1 = "https://cdn.test/course/fr/v3/unit.json";

describe("fetchContent", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let cache: ReturnType<typeof fakeCaches>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    cache = fakeCaches();
    vi.stubGlobal("caches", cache.impl);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("fetches on a miss, stores the body, then serves hits without the network", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json({ a: 1 })));
    expect(await fetchContentJson(URL1, NAME)).toEqual({ a: 1 });
    expect(await fetchContentJson(URL1, NAME)).toEqual({ a: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(cache.stores.get(NAME)?.has(URL1)).toBe(true);
  });

  it("shares one request between concurrent calls for the same URL", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json({ a: 1 })));
    const [x, y] = await Promise.all([fetchContentJson(URL1, NAME), fetchContentJson(URL1, NAME)]);
    expect(x).toEqual(y);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not cache an error response and tries again next time", async () => {
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 503 }));
    await expect(fetchContentBytes(URL1, NAME)).rejects.toThrow("503");
    expect(cache.stores.get(NAME)?.has(URL1) ?? false).toBe(false);
    fetchMock.mockResolvedValueOnce(json({ ok: true }));
    expect(await fetchContentJson(URL1, NAME)).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not cache a body that fails its check, and drops a cached copy that fails it", async () => {
    const reject = () => {
      throw new Error("bad hash");
    };
    fetchMock.mockResolvedValueOnce(json({ v: "tampered" }));
    await expect(fetchContentBytes(URL1, NAME, reject)).rejects.toThrow("bad hash");
    expect(cache.stores.get(NAME)?.has(URL1) ?? false).toBe(false);

    await fetchContentBytes(URL1, NAME).catch(() => {}); // nothing mocked: rejects, nothing stored
    cache.stores.set(NAME, new Map([[URL1, new TextEncoder().encode('{"v":"stale"}')]]));
    fetchMock.mockResolvedValueOnce(json({ v: "fresh" }));
    const accept = (bytes: ArrayBuffer) => {
      if (new TextDecoder().decode(bytes).includes("stale")) throw new Error("bad hash");
    };
    expect(JSON.parse(new TextDecoder().decode(await fetchContentBytes(URL1, NAME, accept)))).toEqual({ v: "fresh" });
  });

  it("falls back to a plain fetch when Cache Storage is unavailable", async () => {
    vi.stubGlobal("caches", undefined);
    fetchMock.mockImplementation(() => Promise.resolve(json({ a: 1 })));
    expect(await fetchContentJson(URL1, NAME)).toEqual({ a: 1 });
    expect(await fetchContentJson(URL1, NAME)).toEqual({ a: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falls back to a plain fetch when opening the cache throws", async () => {
    cache.impl.open.mockRejectedValue(new Error("SecurityError"));
    fetchMock.mockImplementation(() => Promise.resolve(json({ a: 1 })));
    expect(await fetchContentJson(URL1, NAME)).toEqual({ a: 1 });
  });
});

describe("pruneContentCaches", () => {
  let cache: ReturnType<typeof fakeCaches>;
  const names = () => [...cache.stores.keys()].sort();
  const seed = (code: string, versions: number[]) => versions.forEach((v) => cache.stores.set(contentCacheName(code, v), new Map()));
  beforeEach(() => {
    cache = fakeCaches();
    vi.stubGlobal("caches", cache.impl);
    cache.stores.set("grader:fr/v1", new Map());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("keeps the last N live versions and the latest of other courses, pruning the rest", async () => {
    seed("fr", [1, 2, 3, 4, 5]);
    seed("es", [1, 2]);
    seed("de", [7]);
    await pruneContentCaches({ code: "fr", version: 5 });
    expect(KEEP_LIVE_VERSIONS).toBe(3);
    expect(names()).toEqual(
      [contentCacheName("fr", 3), contentCacheName("fr", 4), contentCacheName("fr", 5), contentCacheName("es", 2), contentCacheName("de", 7), "grader:fr/v1"].sort(),
    );
  });

  it("keeps the in-use live version even when it is older than the last N", async () => {
    seed("fr", [1, 2, 3, 4, 5]);
    await pruneContentCaches({ code: "fr", version: 1 });
    expect(names()).toEqual([contentCacheName("fr", 1), contentCacheName("fr", 3), contentCacheName("fr", 4), contentCacheName("fr", 5), "grader:fr/v1"].sort());
  });

  it("keeps a version an open lesson pins beyond N, then prunes it once the lesson ends", async () => {
    seed("fr", [1, 2, 3, 4, 5]);
    const release = pinContentCache(contentCacheName("fr", 1));
    await pruneContentCaches({ code: "fr", version: 5 });
    expect(cache.stores.has(contentCacheName("fr", 1))).toBe(true);
    expect(cache.stores.has(contentCacheName("fr", 2))).toBe(false);
    release();
    await vi.waitFor(() => expect(cache.stores.has(contentCacheName("fr", 1))).toBe(false));
    expect(cache.stores.has(contentCacheName("fr", 3))).toBe(true);
  });
});
