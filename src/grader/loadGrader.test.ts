import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Grader, GraderIndex } from "./types";

const ORIGIN = "https://app.test";
const grader = { gradeEnvelope: vi.fn(), xp: vi.fn() } as unknown as Grader;

/** A Cache Storage that keeps Responses by URL, enough for loadGrader. */
function fakeCaches() {
  const stores = new Map<string, Map<string, Response>>();
  const open = async (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name)!;
    return {
      match: async (url: string) => store.get(url)?.clone(),
      put: async (url: string, response: Response) => void store.set(url, response),
      add: async (url: string) => {
        const response = await fetch(url);
        if (!response.ok) throw new TypeError(`Request failed: ${response.status}`);
        store.set(url, response);
      },
    };
  };
  return {
    stores,
    open,
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    match: async (url: string, options?: { cacheName?: string }) => {
      const cache = options?.cacheName ? stores.get(options.cacheName) : undefined;
      return cache?.get(url)?.clone();
    },
  };
}

function index(...versions: [string, number][]): GraderIndex {
  return {
    graders: versions.map(([language, version]) => ({
      language,
      version,
      manifestSha256: "x",
      files: ["main.mjs", "_framework/dotnet.js"],
      vectors: [],
    })),
  };
}

let online: boolean;
let served: GraderIndex;
let caches: ReturnType<typeof fakeCaches>;

beforeEach(() => {
  online = true;
  caches = fakeCaches();
  vi.stubGlobal("caches", caches);
  vi.stubGlobal("location", { origin: ORIGIN });
  vi.stubGlobal("navigator", {});
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      if (!online) throw new TypeError("offline");
      if (input.endsWith("grader/index.json")) return new Response(JSON.stringify(served));
      return new Response("body");
    }),
  );
  vi.doMock("./runtime", () => ({
    // Like the real one, fails when the build's entry file can't be had.
    startGrader: vi.fn(async (_root: string, resource?: (path: string) => Promise<Response>) => {
      const main = await resource?.("main.mjs");
      if (main && main.ok === false) throw new Error(`main.mjs: ${main.status}`);
      return grader;
    }),
    resourceResponse: vi.fn(),
  }));
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.doUnmock("./runtime");
});

describe("loadGrader", () => {
  it("is null for a language the build shipped none for", async () => {
    served = index(["fa", 1]);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { loadGrader } = await import("./loadGrader");
    expect(await loadGrader("ja")).toBeNull();
  });

  it("caches the build per version and drops that language's older versions only", async () => {
    caches.stores.set("grader:fa/v1", new Map());
    caches.stores.set("grader:ja/v5", new Map());
    served = index(["fa", 2], ["ja", 5]);
    const { loadGrader } = await import("./loadGrader");
    expect(await loadGrader("fa")).toBe(grader);
    const names = [...caches.stores.keys()];
    expect(names).toContain("grader:fa/v2");
    expect(names).not.toContain("grader:fa/v1");
    expect(names).toContain("grader:ja/v5");
    expect(names).toContain("grader:index");
    expect([...caches.stores.get("grader:fa/v2")!.keys()].sort()).toEqual([
      `${ORIGIN}/grader/fa/v2/_framework/dotnet.js`,
      `${ORIGIN}/grader/fa/v2/main.mjs`,
    ]);
  });

  it("starts offline from the cached index and build", async () => {
    served = index(["fa", 2]);
    await (await import("./loadGrader")).loadGrader("fa");

    online = false;
    vi.resetModules();
    const { loadGrader } = await import("./loadGrader");
    expect(await loadGrader("fa")).toBe(grader);
  });

  it("fails offline when nothing was ever cached, and tries again on the next call", async () => {
    online = false;
    served = index(["fa", 2]);
    const { loadGrader } = await import("./loadGrader");
    await expect(loadGrader("fa")).rejects.toThrow();

    online = true;
    expect(await loadGrader("fa")).toBe(grader);
  });

  it("re-reads the index when a deploy removed the build it named, instead of failing the lesson", async () => {
    served = index(["fa", 1]);
    const live = vi.mocked(fetch).getMockImplementation()!;
    vi.mocked(fetch).mockImplementation(async (input) => {
      if (String(input).includes("/grader/fa/v1/")) {
        // The deploy has landed: v1 is gone, and the index now names v2.
        served = index(["fa", 2]);
        return new Response("gone", { status: 404 });
      }
      return live(input);
    });
    const { loadGrader } = await import("./loadGrader");
    expect(await loadGrader("fa")).toBe(grader);
    expect([...caches.stores.keys()]).toContain("grader:fa/v2");
  });

  it("forgets a stale index after a failed load so a retry reads the current one", async () => {
    served = index(["fa", 1]);
    const live = vi.mocked(fetch).getMockImplementation()!;
    vi.mocked(fetch).mockImplementation(async (input) => {
      if (String(input).includes("/grader/fa/v1/")) return new Response("gone", { status: 404 });
      return live(input);
    });
    const { loadGrader } = await import("./loadGrader");
    await expect(loadGrader("fa")).rejects.toThrow();
    served = index(["fa", 2]);
    expect(await loadGrader("fa")).toBe(grader);
  });
});
