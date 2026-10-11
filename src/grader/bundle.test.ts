import { describe, expect, it } from "vitest";
import { buildKey, ensureBundle, GraderIntegrityError, type BundleDeps, type BundleStore } from "./bundle";
import type { GraderManifest, GraderPointer } from "./types";

const encode = (text: string) => new TextEncoder().encode(text);
const sha256Hex = async (bytes: Uint8Array) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>)), (b) => b.toString(16).padStart(2, "0")).join("");

/** A fake CDN holding one or more builds, counting what is fetched from it. */
async function cdn(builds: { language: string; version: number; files: Record<string, string> }[]) {
  const served = new Map<string, Uint8Array>();
  const pointers: GraderPointer[] = [];
  for (const { language, version, files } of builds) {
    const manifest: GraderManifest = {
      language,
      variant: "browser",
      version,
      files: Object.entries(files).map(([path, text]) => ({
        path,
        sha256: "",
        size: encode(text).length,
      })),
    };
    for (const file of manifest.files) file.sha256 = await sha256Hex(encode(files[file.path]));
    const manifestBytes = encode(JSON.stringify(manifest));
    const root = `https://cdn.test/grader/${language}/browser/v${version}`;
    served.set(`${root}/manifest.json`, manifestBytes);
    for (const [path, text] of Object.entries(files)) served.set(`${root}/${path}`, encode(text));
    pointers.push({ language, variant: "browser", version, manifestSha256: await sha256Hex(manifestBytes) });
  }
  const fetched: string[] = [];
  let online = true;
  return {
    pointers,
    served,
    fetched,
    goOffline: () => (online = false),
    fetch: async (url: string) => {
      fetched.push(url);
      const bytes = online ? served.get(url) : undefined;
      return bytes ? new Response(bytes as BodyInit) : new Response("", { status: online ? 404 : 503 });
    },
  };
}

function memoryStore(): BundleStore & { builds: () => string[] } {
  const files = new Map<string, Uint8Array>();
  return {
    read: async (build, path) => files.get(`${build}|${path}`) ?? null,
    write: async (build, path, bytes) => void files.set(`${build}|${path}`, bytes),
    prune: async (language, variant, keepVersion) => {
      for (const key of [...files.keys()]) {
        const build = key.split("|")[0];
        if (build.startsWith(`${language}/${variant}/v`) && build !== buildKey({ language, variant, version: keepVersion })) files.delete(key);
      }
    },
    builds: () => [...new Set([...files.keys()].map((key) => key.split("|")[0]))],
  };
}

function deps(server: Awaited<ReturnType<typeof cdn>>, store: BundleStore): BundleDeps {
  return { baseUrl: "https://cdn.test", fetch: server.fetch, store, sha256Hex };
}

const v1 = { language: "fa", version: 1, files: { "main.mjs": "export const v = 1;", "_framework/a.wasm": "aaaa" } };
const v2 = { language: "fa", version: 2, files: { "main.mjs": "export const v = 2;", "_framework/a.wasm": "bbbb" } };

describe("ensureBundle", () => {
  it("downloads a build, verifies it and returns every file", async () => {
    const server = await cdn([v1]);
    const bundle = await ensureBundle(server.pointers[0], deps(server, memoryStore()));
    expect([...bundle.files.keys()].sort()).toEqual(["_framework/a.wasm", "main.mjs"]);
    expect(new TextDecoder().decode(bundle.files.get("main.mjs"))).toBe("export const v = 1;");
  });

  it("serves a downloaded build from the store, so it still works offline", async () => {
    const server = await cdn([v1]);
    const store = memoryStore();
    await ensureBundle(server.pointers[0], deps(server, store));
    server.fetched.length = 0;
    server.goOffline();

    const bundle = await ensureBundle(server.pointers[0], deps(server, store));
    expect(bundle.files.size).toBe(2);
    expect(server.fetched).toEqual([]);
  });

  it("fails, and keeps nothing, when offline with nothing stored", async () => {
    const server = await cdn([v1]);
    server.goOffline();
    const store = memoryStore();
    await expect(ensureBundle(server.pointers[0], deps(server, store))).rejects.toThrow();
    expect(store.builds()).toEqual([]);
  });

  it("refuses a manifest that isn't the one bootstrap named", async () => {
    const server = await cdn([v1]);
    const wrong = { ...server.pointers[0], manifestSha256: "0".repeat(64) };
    await expect(ensureBundle(wrong, deps(server, memoryStore()))).rejects.toBeInstanceOf(GraderIntegrityError);
  });

  it("refuses a file that isn't what the manifest lists, and stores nothing of that build", async () => {
    const server = await cdn([v1]);
    server.served.set("https://cdn.test/grader/fa/browser/v1/_framework/a.wasm", encode("tampered"));
    const store = memoryStore();
    await expect(ensureBundle(server.pointers[0], deps(server, store))).rejects.toBeInstanceOf(GraderIntegrityError);
    expect(store.builds()).toEqual([]);
  });

  it("downloads again when the stored build is incomplete or doesn't match", async () => {
    const server = await cdn([v1]);
    const store = memoryStore();
    await ensureBundle(server.pointers[0], deps(server, store));
    await store.write(buildKey(server.pointers[0]), "_framework/a.wasm", encode("corrupt"));
    server.fetched.length = 0;

    const bundle = await ensureBundle(server.pointers[0], deps(server, store));
    expect(new TextDecoder().decode(bundle.files.get("_framework/a.wasm"))).toBe("aaaa");
    expect(server.fetched.length).toBeGreaterThan(0);
  });

  it("drops older versions of the same language once the new one is stored, and no other language's", async () => {
    const server = await cdn([v1, v2, { language: "ja", version: 1, files: { "main.mjs": "export const ja = 1;" } }]);
    const store = memoryStore();
    await ensureBundle(server.pointers[0], deps(server, store));
    await ensureBundle(server.pointers[2], deps(server, store));
    await ensureBundle(server.pointers[1], deps(server, store));
    expect(store.builds().sort()).toEqual(["fa/browser/v2", "ja/browser/v1"]);
  });
});
