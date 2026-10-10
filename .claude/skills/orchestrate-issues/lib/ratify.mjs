// node ratify.mjs <item> : the deterministic gate. Prints {decision: ready|hold, reasons, pr}. It never merges:
// merging to master deploys, so the user merges a "ready" PR themselves.
import { REPOS, ghJson, git, ledgerDir, loadItem, out, readJson, writeJson } from "./common.mjs"
import { ciOnce } from "./ci.mjs"

const name = process.argv[2]
const item = loadItem(name)
const L = ledgerDir(name)
const repo = REPOS[item.repo]
const reasons = []
const hold = (r) => reasons.push(r)
const finish = (result) => { writeJson(`${L}/ratify.json`, result); out(result); process.exit(0) }

const dev = readJson(`${L}/dev.json`)
const review = readJson(`${L}/review.json`)
if (!dev?.pr) finish({ name, decision: "hold", reasons: ["no dev.json / pr"] })

if (dev.needsUser) hold(`dev needs the user: ${dev.needsUser}`)
if (dev.deviations?.length) hold(`deviations from the plan need the user: ${dev.deviations.join(" | ").slice(0, 300)}`)

let pr
try { pr = ghJson(item.repo, ["api", `repos/${repo.slug}/pulls/${dev.pr}`]) } catch (e) { finish({ name, decision: "hold", reasons: [`cannot read PR: ${e.message}`] }) }
const head = pr.head.sha
if (pr.state !== "open") hold(`PR is ${pr.state}`)

// Every reviewer's review (review.json, review-2.json, ...) must be of the current head, with no blocker/high findings.
const reviewFiles = ["review.json", ...Array.from({ length: Math.max(0, (item.reviewers ?? 1) - 1) }, (_, i) => `review-${i + 2}.json`)]
for (const f of reviewFiles) {
  const rv = f === "review.json" ? review : readJson(`${L}/${f}`)
  if (!rv) { hold(`no ${f}`); continue }
  if (rv.head !== head) hold(`${f} is of ${String(rv.head).slice(0, 7)}, PR head is ${head.slice(0, 7)}`)
  const bad = (rv.findings ?? []).filter((x) => x.severity === "blocker" || x.severity === "high")
  if (bad.length) hold(`${f}: ${bad.length} open blocker/high finding(s)`)
}

// CI green on this exact head.
try {
  const ci = ciOnce(item, dev.pr)
  if (!ci.done) hold("CI not finished")
  else if (!ci.allGreen) hold("CI not green")
} catch (e) { hold(`cannot read CI: ${e.message}`.slice(0, 200)) }

// Current with master, and diff hygiene.
git(item.repo, ["fetch", "-q"])
const br = `origin/${item.branch}`
if (git(item.repo, ["rev-parse", "--verify", "-q", br]).status !== 0) hold(`branch ${br} not found`)
else {
  if (git(item.repo, ["merge-base", "--is-ancestor", "origin/master", br]).status !== 0) hold("branch is behind master")
  const files = git(item.repo, ["diff", "--name-only", `origin/master...${br}`]).out.split("\n").filter(Boolean)
  const res = item.allowedPaths.map((p) => new RegExp(p))
  const stray = files.filter((f) => !res.some((r) => r.test(f)))
  if (stray.length) hold(`files outside the allowed paths: ${stray.slice(0, 5).join(", ")}`)
  const added = git(item.repo, ["diff", `origin/master...${br}`]).out.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).join("\n")
  if (/(ghp_|gho_|github_pat_)[A-Za-z0-9_]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY/.test(added)) hold("a token or private key appears in the diff")
}
if (dev.unverified?.length && !/not verified|unverified/i.test(pr.body ?? "")) hold("unverified items are not listed in the PR body")

finish({ name, decision: reasons.length ? "hold" : "ready", reasons, pr: dev.pr, feature: dev.feature ?? null })
