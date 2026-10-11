#!/usr/bin/env node
// CI's check of the published grader (API_SPEC.md §7): downloads each build
// pinned in grader.lock.json, runs the backend's own verify vectors and
// xp-vectors (published inside every build) through it, and fails on a
// difference. It drives src/grader/bundle.ts and runtime.ts, the same code the
// app loads the grader with, so the browser glue is what gets tested; only the
// store (memory), the hash (node:crypto) and the module URLs (temp files, as
// Node's runtime loader needs real paths) are Node's.
//
// The vectors carry no expected answers (the backend checks two builds agree
// with each other), so the verdicts are pinned in scripts/grader-expected.json:
// a change in them is a change in what the app would show a learner, and is
// reviewed as one. XP is checked against the vectors' own expected numbers.
//
// Usage: node scripts/verify-grader.mjs [--update]
//   --update  rewrites scripts/grader-expected.json from the pinned builds
//
// Needs Node 24+, which runs the .ts files it imports natively.
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ensureBundle } from "../src/grader/bundle.ts";
import { startGrader } from "../src/grader/runtime.ts";

const here = dirname(fileURLToPath(import.meta.url));
const lock = JSON.parse(readFileSync(join(here, "..", "grader.lock.json"), "utf8"));
const expectedPath = join(here, "grader-expected.json");
const update = process.argv.includes("--update");
const expected = update ? {} : JSON.parse(readFileSync(expectedPath, "utf8"));
const decode = (bytes) => new TextDecoder().decode(bytes);
const sha256Hex = async (bytes) => createHash("sha256").update(bytes).digest("hex");

const tempDir = mkdtempSync(join(tmpdir(), "grader-"));
let moduleCount = 0;
function moduleUrl(source, path) {
  const file = join(tempDir, `${moduleCount++}-${path.replaceAll("/", "_")}`);
  writeFileSync(file, source);
  return pathToFileURL(file).href;
}

/** The part of a response that is the grader's answer. */
const answer = ({ verdict, matchedAnswer, correct, acceptedWithCorrection, reasons, error, xp }) => ({
  verdict: verdict ?? null,
  matchedAnswer: matchedAnswer ?? null,
  correct,
  acceptedWithCorrection,
  reasons,
  error: error ?? null,
  xp: xp ?? null,
});

let failures = 0;
const fail = (message) => {
  failures++;
  console.log(`FAIL  ${message}`);
};

try {
  for (const pin of lock.graders) {
    const label = `${pin.language}/${pin.variant}/v${pin.version}`;
    console.log(`\n${label}`);

    const suffix = `/grader/${label}/manifest.json`;
    if (!pin.url.endsWith(suffix)) throw new Error(`${pin.url} is not ${suffix} under a base URL`);
    const memory = new Map();
    const bundle = await ensureBundle(
      { language: pin.language, variant: pin.variant, version: pin.version, manifestSha256: pin.sha256 },
      {
        baseUrl: pin.url.slice(0, -suffix.length),
        fetch,
        sha256Hex,
        store: {
          read: async (build, path) => memory.get(`${build}|${path}`) ?? null,
          write: async (build, path, bytes) => void memory.set(`${build}|${path}`, bytes),
          prune: async () => {},
        },
      },
    );
    const grader = await startGrader(bundle, moduleUrl);

    const vectorsFile = bundle.manifest.files.map((f) => f.path).find((p) => /^vectors(\.[a-z]+)?\.json$/.test(p));
    if (!vectorsFile || !bundle.files.has("xp-vectors.json")) throw new Error(`${label} does not publish its vectors`);
    const vectors = JSON.parse(decode(bundle.files.get(vectorsFile)));
    const xpVectors = JSON.parse(decode(bundle.files.get("xp-vectors.json")));

    // Language vectors: pinned verdicts.
    const results = {};
    for (const { name, ...request } of vectors) results[name] = answer(grader.gradeEnvelope(request));
    if (update) {
      expected[pin.language] = results;
    } else {
      const pinned = expected[pin.language] ?? {};
      for (const name of new Set([...Object.keys(results), ...Object.keys(pinned)])) {
        const same = JSON.stringify(results[name]) === JSON.stringify(pinned[name]);
        if (!same) fail(`${name}: got ${JSON.stringify(results[name])}, pinned ${JSON.stringify(pinned[name])}`);
        else console.log(`ok    ${name.padEnd(36)} ${results[name].verdict ?? `error: ${results[name].error}`}`);
      }
    }

    // XP: the standalone export, and a replay of a language vector that earned each row's verdict through the grading call.
    const sampleFor = (verdict) => vectors.find((v) => answer(grader.gradeEnvelope(v)).verdict === verdict);
    for (const { name, verdict, attempt, usedHint, retype, retypeNumber, xp } of xpVectors) {
      const standalone = grader.xp(verdict, attempt, usedHint, retype, retypeNumber);
      const sample = sampleFor(verdict);
      const { name: _, ...request } = sample ?? {};
      const graded = sample ? grader.gradeEnvelope({ ...request, attempt, usedHint, retype, retypeNumber }).xp : "no sample";
      if (standalone !== xp || graded !== xp) fail(`xp ${name}: expected ${xp}; xp export ${standalone}, grading call ${graded}`);
      else console.log(`ok    xp ${name.padEnd(33)} ${xp}`);
    }
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

if (update) {
  writeFileSync(expectedPath, `${JSON.stringify(expected, null, 2)}\n`);
  console.log(`\nwrote ${expectedPath}`);
} else if (failures > 0) {
  console.log(`\n${failures} failure(s).`);
  process.exit(1);
} else {
  console.log("\nAll vectors match.");
}
// The .NET runtime keeps handles open; this is a one-shot check.
process.exit(0);
