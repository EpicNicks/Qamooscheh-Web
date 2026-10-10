// node setup.mjs <item> : create the item's worktree from origin/master, install deps, record it in state.json.
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import { git, ledgerDir, loadItem, out, readJson, worktreeFor, writeJson } from "./common.mjs"

const name = process.argv[2]
const item = loadItem(name)
git(item.repo, ["fetch", "-q"])
const wt = worktreeFor(item.repo, name)
const exists = git(item.repo, ["worktree", "list", "--porcelain"]).out.includes(wt)
if (!exists) {
  const r = git(item.repo, ["worktree", "add", wt, "-b", item.branch, "origin/master"])
  if (r.status !== 0) { out({ name, error: r.err.trim().slice(0, 300) }); process.exit(0) }
}
if (item.repo === "web" && !fs.existsSync(`${wt}/node_modules`)) {
  const r = spawnSync("npm", ["ci", "--no-audit", "--no-fund"], { cwd: wt, encoding: "utf8", shell: true, maxBuffer: 64 << 20 })
  if (r.status !== 0) { out({ name, worktree: wt, error: `npm ci failed: ${(r.stderr || r.stdout).trim().slice(-300)}` }); process.exit(0) }
}
const state = readJson(`${ledgerDir(name)}/state.json`, {})
writeJson(`${ledgerDir(name)}/state.json`, { ...state, repo: item.repo, branch: item.branch, worktree: wt })
out({ name, worktree: wt, branch: item.branch })
