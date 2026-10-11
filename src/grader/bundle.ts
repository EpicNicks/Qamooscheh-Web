// Fetching a published grader build (API_SPEC.md §7): grader/{language}/{variant}/v{version}/
// manifest.json lists every file with its sha256. The manifest is checked
// against the hash bootstrap hands back, each file against the manifest, and
// the verified files are kept in a store keyed by build, so a version is
// downloaded once and then works offline. Free of the DOM and the bundler so
// scripts/verify-grader.mjs can run this same code in Node.
import type { GraderManifest, GraderPointer } from "./types.ts";

/** Where verified files of a build are kept between visits (Cache Storage in the app, a Map in tests). */
export interface BundleStore {
  read(build: string, path: string): Promise<Uint8Array | null>;
  write(build: string, path: string, bytes: Uint8Array): Promise<void>;
  /** Forgets every build of `language`/`variant` except `keepVersion`. */
  prune(language: string, variant: string, keepVersion: number): Promise<void>;
}

export interface BundleDeps {
  /** The content CDN's origin (config.ts's CONTENT_BASE_URL). */
  baseUrl: string;
  fetch: (url: string) => Promise<Response>;
  store: BundleStore;
  sha256Hex: (bytes: Uint8Array) => Promise<string>;
}

/** A verified build: its manifest and the bytes of every file in it, by manifest path. */
export interface GraderBundle {
  manifest: GraderManifest;
  files: Map<string, Uint8Array>;
}

export class GraderIntegrityError extends Error {
  constructor(what: string, expected: string, actual: string) {
    super(`Grader ${what} hash mismatch: expected ${expected}, got ${actual}`);
    this.name = "GraderIntegrityError";
  }
}

const MANIFEST = "manifest.json";

/** The key a build is stored under: language and variant are part of it, since a bundle of one language grades another's orthography wrongly. */
export function buildKey({ language, variant, version }: Pick<GraderPointer, "language" | "variant" | "version">): string {
  return `${language}/${variant}/v${version}`;
}

async function readCached(pointer: GraderPointer, deps: BundleDeps): Promise<GraderBundle | null> {
  const build = buildKey(pointer);
  const manifestBytes = await deps.store.read(build, MANIFEST);
  if (!manifestBytes) return null;
  if ((await deps.sha256Hex(manifestBytes)) !== pointer.manifestSha256.toLowerCase()) return null;

  const manifest = JSON.parse(new TextDecoder().decode(manifestBytes)) as GraderManifest;
  const files = new Map<string, Uint8Array>();
  for (const file of manifest.files) {
    const bytes = await deps.store.read(build, file.path);
    if (!bytes || (await deps.sha256Hex(bytes)) !== file.sha256.toLowerCase()) return null;
    files.set(file.path, bytes);
  }
  return { manifest, files };
}

async function download(url: string, deps: BundleDeps): Promise<Uint8Array> {
  const response = await deps.fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

async function downloadBundle(pointer: GraderPointer, deps: BundleDeps): Promise<GraderBundle> {
  const build = buildKey(pointer);
  const root = `${deps.baseUrl}/grader/${build}`;

  const manifestBytes = await download(`${root}/${MANIFEST}`, deps);
  const manifestHash = await deps.sha256Hex(manifestBytes);
  if (manifestHash !== pointer.manifestSha256.toLowerCase()) {
    throw new GraderIntegrityError(MANIFEST, pointer.manifestSha256, manifestHash);
  }
  const manifest = JSON.parse(new TextDecoder().decode(manifestBytes)) as GraderManifest;

  const files = new Map<string, Uint8Array>();
  await Promise.all(
    manifest.files.map(async (file) => {
      const bytes = await download(`${root}/${file.path}`, deps);
      const hash = await deps.sha256Hex(bytes);
      if (hash !== file.sha256.toLowerCase()) throw new GraderIntegrityError(file.path, file.sha256, hash);
      files.set(file.path, bytes);
    }),
  );

  // The manifest goes in last: a build with a manifest in the store is a complete one.
  for (const [path, bytes] of files) await deps.store.write(build, path, bytes);
  await deps.store.write(build, MANIFEST, manifestBytes);
  return { manifest, files };
}

/**
 * The verified files of the build `pointer` names: from the store when it
 * holds the whole build (no network, so offline works), otherwise downloaded
 * and stored. Older builds of the same language and variant are dropped once
 * this one is safe.
 */
export async function ensureBundle(pointer: GraderPointer, deps: BundleDeps): Promise<GraderBundle> {
  const bundle = (await readCached(pointer, deps)) ?? (await downloadBundle(pointer, deps));
  await deps.store.prune(pointer.language, pointer.variant, pointer.version);
  return bundle;
}
