import { describe, expect, it, vi } from "vitest";
import workerSource from "../public/sw.js?raw";

const SCOPE = "https://parsling.test/";
const BUILD_LINE = 'const BUILD = { version: "dev", files: [] };';

type Listener = (event: unknown) => void;

/**
 * Runs public/sw.js against a fake worker scope, with `build` written in the
 * way vite.config.ts's precacheBuild does (left as in dev when omitted), and
 * `cached` as the contents of Cache Storage by cache name.
 */
function loadWorker({ build, cached = {} }: { build?: { version: string; files: string[] }; cached?: Record<string, Record<string, string>> } = {}) {
  expect(workerSource).toContain(BUILD_LINE);
  const source = build ? workerSource.replace(BUILD_LINE, `const BUILD = ${JSON.stringify(build)};`) : workerSource;
  const listeners = new Map<string, Listener>();
  const added: string[] = [];
  const deleted: string[] = [];
  const self = {
    registration: { scope: SCOPE },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn(async () => {}) },
    addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
  };
  const lookup = (url: string, cacheName?: string) => {
    const names = cacheName ? [cacheName] : Object.keys(cached);
    for (const name of names) if (cached[name]?.[url] !== undefined) return new Response(cached[name][url]);
    return undefined;
  };
  const caches = {
    open: vi.fn(async () => ({ addAll: async (requests: Request[]) => added.push(...requests.map((r) => r.url)) })),
    keys: vi.fn(async () => Object.keys(cached)),
    delete: vi.fn(async (name: string) => deleted.push(name)),
    match: vi.fn(async (url: string, options?: { cacheName?: string }) => lookup(url, options?.cacheName)),
  };
  const fetch = vi.fn(async (_request: unknown): Promise<Response> => {
    throw new TypeError("offline");
  });
  new Function("self", "caches", "fetch", "Request", "Response", source)(self, caches, fetch, Request, Response);

  /** Dispatches a fetch and returns what the worker answered with, or null if it let the browser handle it. */
  const request = async (url: string, init: { mode?: string; method?: string } = {}) => {
    let answer = null as Promise<Response> | null;
    listeners.get("fetch")?.({
      request: { url, mode: init.mode ?? "cors", method: init.method ?? "GET" },
      respondWith: (response: Promise<Response>) => (answer = response),
    });
    return answer ? await answer : null;
  };
  /** Dispatches a lifecycle event and waits for what it extended it with. */
  const lifecycle = async (type: string) => {
    const pending: Promise<unknown>[] = [];
    listeners.get(type)?.({ waitUntil: (promise: Promise<unknown>) => pending.push(promise) });
    await Promise.all(pending);
  };
  return { self, fetch, added, deleted, request, lifecycle };
}

const build = { version: "v2", files: ["index.html", "assets/index-abc.js"] };

describe("service worker", () => {
  it("never takes over an open lesson when it is updated", async () => {
    const { self, lifecycle } = loadWorker({ build });
    await lifecycle("install");
    expect(self.skipWaiting).not.toHaveBeenCalled();
  });

  it("still claims the page it was first installed for", async () => {
    const { self, lifecycle } = loadWorker();
    await lifecycle("activate");
    expect(self.clients.claim).toHaveBeenCalled();
  });

  it("caches every file of its build on install", async () => {
    const { added, lifecycle } = loadWorker({ build });
    await lifecycle("install");
    expect(added).toEqual([`${SCOPE}index.html`, `${SCOPE}assets/index-abc.js`]);
  });

  it("drops earlier builds when it activates, but not the grader's caches", async () => {
    const cached = { "app:v1": {}, "app:v2": {}, "grader:fa/v3": {} };
    const { deleted, lifecycle } = loadWorker({ build, cached });
    await lifecycle("activate");
    expect(deleted).toEqual(["app:v1"]);
  });

  it("opens the cached app when a page load can't reach the network", async () => {
    const { request } = loadWorker({ build, cached: { "app:v2": { [`${SCOPE}index.html`]: "shell" } } });
    const answer = await request(`${SCOPE}path`, { mode: "navigate" });
    expect(await answer?.text()).toBe("shell");
  });

  it("loads pages from the network first", async () => {
    const { request, fetch } = loadWorker({ build, cached: { "app:v2": { [`${SCOPE}index.html`]: "shell" } } });
    fetch.mockResolvedValueOnce(new Response("fresh"));
    const answer = await request(`${SCOPE}path`, { mode: "navigate" });
    expect(await answer?.text()).toBe("fresh");
  });

  it("answers its build's files from its own cache", async () => {
    const url = `${SCOPE}assets/index-abc.js`;
    const { request } = loadWorker({ build, cached: { "app:v1": { [url]: "old" }, "app:v2": { [url]: "new" } } });
    expect(await (await request(url))?.text()).toBe("new");
  });

  it("leaves page loads and other files alone in dev, where there's no build to cache", async () => {
    const { request } = loadWorker();
    expect(await request(`${SCOPE}path`, { mode: "navigate" })).toBeNull();
    expect(await request(`${SCOPE}src/main.tsx`)).toBeNull();
  });

  it("answers the grader's files from the grader's cache, but not its index", async () => {
    const file = `${SCOPE}grader/fa/v3/grader.js`;
    const { request } = loadWorker({ cached: { "grader:fa/v3": { [file]: "grader" } } });
    expect(await (await request(file))?.text()).toBe("grader");
    expect(await request(`${SCOPE}grader/index.json`)).toBeNull();
  });
});
