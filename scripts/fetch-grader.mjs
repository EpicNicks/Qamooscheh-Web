#!/usr/bin/env node
// Build step: pulls the current published browser grader (API_SPEC.md §7) for
// each course language from the content CDN and writes it under
// public/grader/{language}/v{version}/, so it ships same-origin with the web
// build and the app never downloads code at runtime (src/grader/loadGrader.ts).
// Every file is checked against the sha256 in its build's manifest.json.
// public/grader/index.json records what was resolved (version, manifest hash,
// files) and is what the app and scripts/verify-grader.mjs read.
//
// There is no pin: each run takes the LATEST published version, so web cannot
// drift from the backend. The CDN has no unauthenticated "current" pointer
// (bootstrap needs a login), so the latest is the highest version whose
// manifest exists: versions are a gapless sequence per (language, variant).
//
// Env: VITE_CONTENT_BASE_URL (or GRADER_CDN_BASE_URL) the CDN origin,
//      default https://cdn.parsling.com; GRADER_LANGUAGES, default "fa,ja".
//
// Usage: node scripts/fetch-grader.mjs
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "public", "grader");
const base = (process.env.GRADER_CDN_BASE_URL || process.env.VITE_CONTENT_BASE_URL || "https://cdn.parsling.com").replace(/\/+$/, "");
const languages = (process.env.GRADER_LANGUAGES || "fa,ja").split(",").map((s) => s.trim()).filter(Boolean);
const sha256Hex = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** The vectors the backend publishes inside every build: for CI, not for the app. */
const isVectors = (path) => /^(vectors(\.[a-z]+)?|xp-vectors)\.json$/.test(path);

const root = (language, version) => `${base}/grader/${language}/browser/v${version}`;

async function exists(language, version) {
  const response = await fetch(`${root(language, version)}/manifest.json`, { method: "HEAD" });
  if (response.status === 404) return false;
  if (!response.ok) throw new Error(`${root(language, version)}/manifest.json: ${response.status}`);
  return true;
}

/** Highest published version: double until one is missing, then bisect. */
async function latestVersion(language) {
  if (!(await exists(language, 1))) throw new Error(`No published browser grader for ${language} at ${base}`);
  let lo = 1;
  let hi = 2;
  while (await exists(language, hi)) {
    lo = hi;
    hi *= 2;
  }
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (await exists(language, mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

async function fetchLanguage(language) {
  const version = await latestVersion(language);
  const url = root(language, version);
  const manifestBytes = await download(`${url}/manifest.json`);
  const manifestSha256 = sha256Hex(manifestBytes);
  const manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
  if (manifest.language !== language || manifest.variant !== "browser" || manifest.version !== version) {
    throw new Error(`${url}/manifest.json describes ${manifest.language}/${manifest.variant}/v${manifest.version}`);
  }

  const dir = join(outDir, language, `v${version}`);
  let fetched = 0;
  await Promise.all(
    manifest.files.map(async ({ path, sha256, size }) => {
      if (path.includes("..") || path.startsWith("/")) throw new Error(`${url}: unsafe path ${path}`);
      const target = join(dir, path);
      if (existsSync(target) && sha256Hex(readFileSync(target)) === sha256.toLowerCase()) return;
      const bytes = await download(`${url}/${path}`);
      const actual = sha256Hex(bytes);
      if (actual !== sha256.toLowerCase() || bytes.length !== size) {
        throw new Error(`${url}/${path}: expected sha256 ${sha256} (${size} bytes), got ${actual} (${bytes.length} bytes)`);
      }
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, bytes);
      fetched++;
    }),
  );
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "manifest.json"), manifestBytes);

  // Older versions of this language are not shipped.
  for (const entry of readdirSync(join(outDir, language))) {
    if (entry !== `v${version}`) rmSync(join(outDir, language, entry), { recursive: true, force: true });
  }

  const paths = manifest.files.map((f) => f.path);
  console.log(`${language}: browser v${version}, manifest sha256 ${manifestSha256} (${paths.length} files, ${fetched} downloaded)`);
  return {
    language,
    version,
    manifestSha256,
    files: paths.filter((p) => !isVectors(p)),
    vectors: paths.filter(isVectors),
  };
}

console.log(`Fetching the published browser graders for ${languages.join(", ")} from ${base}`);
mkdirSync(outDir, { recursive: true });
const graders = [];
for (const language of languages) graders.push(await fetchLanguage(language));
writeFileSync(join(outDir, "index.json"), `${JSON.stringify({ graders }, null, 2)}\n`);
