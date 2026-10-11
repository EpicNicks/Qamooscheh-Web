#!/usr/bin/env node
// CI's check of the published grader (API_SPEC.md §7): runs the backend's own
// verify vectors and xp-vectors (published inside every build) through each
// build scripts/fetch-grader.mjs put in public/grader/, i.e. the exact files
// the web build ships. It starts them with src/grader/runtime.ts, the same
// code the app loads the grader with, so the browser glue is what gets tested;
// only where the resource bytes come from (disk) is Node's.
//
// The language vectors carry no expected answers (the backend checks two
// builds agree with each other), so what is checked is that every request is
// interpreted (a verdict, no error), bar the ones the vectors expect to be refused. XP is checked against the vectors' own
// expected numbers, through the standalone export and the grading call.
//
// Usage: node scripts/verify-grader.mjs   (after node scripts/fetch-grader.mjs)
//
// Needs Node 24+, which runs the .ts it imports natively.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resourceResponse, startGrader } from "../src/grader/runtime.ts";

const here = dirname(fileURLToPath(import.meta.url));
const shippedDir = join(here, "..", "public", "grader");
const index = JSON.parse(readFileSync(join(shippedDir, "index.json"), "utf8"));

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

if (index.graders.length === 0) throw new Error("public/grader/index.json lists no graders");

for (const shipped of index.graders) {
  const label = `${shipped.language}/browser/v${shipped.version} (manifest ${shipped.manifestSha256})`;
  console.log(`\n${label}`);

  const dir = join(shippedDir, shipped.language, `v${shipped.version}`);
  const grader = await startGrader(pathToFileURL(dir).href, async (path) => resourceResponse(path, readFileSync(join(dir, path))));

  const vectorsFile = shipped.vectors.find((p) => p !== "xp-vectors.json");
  if (!vectorsFile || !shipped.vectors.includes("xp-vectors.json")) throw new Error(`${label} does not publish its vectors`);
  const vectors = JSON.parse(readFileSync(join(dir, vectorsFile), "utf8"));
  const xpVectors = JSON.parse(readFileSync(join(dir, "xp-vectors.json"), "utf8"));

  // Language vectors: each must be interpreted, except the ones that exist to be refused ("unknown ...").
  for (const { name, ...request } of vectors) {
    const result = answer(grader.gradeEnvelope(request));
    const refused = /^unknown /.test(name);
    if (refused ? !result.error : result.error || !result.verdict) fail(`${name}: ${JSON.stringify(result)}`);
    else console.log(`ok    ${name.padEnd(36)} ${result.verdict ?? `error: ${result.error}`}`);
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

if (failures > 0) {
  console.log(`\n${failures} failure(s).`);
  process.exit(1);
}
console.log("\nAll vectors pass.");
// The .NET runtime keeps handles open; this is a one-shot check.
process.exit(0);
