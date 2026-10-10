// node brief.mjs <item>  : write the developer and reviewer briefs; print {ok} or {blocked}.
import fs from "node:fs"
import { ORCH, REPOS, ledgerDir, loadItem, out, worktreeFor } from "./common.mjs"

const name = process.argv[2]
const item = loadItem(name)
if (item.gate && !item.approved) { out({ name, blocked: item.gate }); process.exit(0) }

const L = ledgerDir(name)
fs.mkdirSync(L, { recursive: true })
const repo = REPOS[item.repo]
const wt = worktreeFor(item.repo, name)
const rules = `## Rules (strict)
- GitHub only through the \`gh\` CLI's existing login, run from inside your worktree. Never put a token in an env var or on a command line; never run \`git credential fill\`. If access is denied, STOP and report it.
- Push with \`git push origin HEAD:refs/heads/${item.branch}\` (never -u), after every commit. Never push to master, never merge.
- Stay inside the allowed paths below. Do not touch other repos.${item.repo === "backend"
  ? " Read AGENTS.md and CLAUDE.md first. A contract change updates src/Qamooscheh.Api/API_SPEC.md, and features.yaml gets the backend key (only) in the same PR."
  : " The backend's features.yaml is updated by the orchestrator, not you."}
- Files are LF and UTF-8; keep them that way. Run \`git status\` before committing.
- Follow the repo's CLAUDE.md and match the surrounding code's comment density, naming and idiom.
- Commit messages and the PR body end with the attribution lines your harness gives you (repo convention).
- Read only what you need: the files named here, then what they import. Don't survey the repo.
- Keep every answer terse. Ledger files are JSON, no prose beyond one-line strings.`

const dev = `# Task ${name}: ${item.title}
Repo: ${item.repo} (${repo.slug}). Main checkout ${repo.path} (do NOT edit it). Your worktree: ${wt}. Branch: ${item.branch}.${item.closes ? ` Closes #${item.closes}.` : ""}

## Issue / plan
${item.issue}

## Allowed paths (regex, repo-relative)
${item.allowedPaths.map((p) => "- " + p).join("\n")}

## Acceptance
${item.acceptance.map((a) => "- " + a).join("\n")}
${item.notes ? "\n## Notes\n" + item.notes + "\n" : ""}
## Procedure
1. \`node ${ORCH}/lib/setup.mjs ${name}\` creates your worktree (with node_modules) and prints its path. Work only there.
2. Implement with tests for any domain logic; commit small; push after each commit.
3. Run, in the worktree, what CI runs: ${item.repo === "backend"
  ? "`dotnet build Qamooscheh.slnx -c Release`, then `dotnet test Qamooscheh.slnx --no-build -c Release`"
  : "`npm run lint`, `npx tsc -b`, `npm run build`, `npm test`"}. All must pass.
4. Open the PR with \`gh pr create --base master --head ${item.branch} --title "..." --body-file ${L}/pr-body.md\`. Body: what changed and how it was tested${item.closes ? `, "Closes #${item.closes}."` : ""}, a "Not verified" list if anything is unverified (e.g. not checked in a browser). If creation errors, check \`gh pr list --head ${item.branch} --state all\` before retrying.
5. Write ${L}/dev.json: {"pr":<number>,"branch":"${item.branch}","head":"<sha>","files":[...],"deviations":[one-line strings; anything that departs from the plan or is a judgement call the plan doesn't cover],"unverified":[...],"feature":"<one-line feature summary for the features.yaml ledger>","needsUser":null or a one-line reason you must stop}.
6. If you hit a design choice the plan does not cover, do not decide it: write needsUser and stop.

${rules}
`
const review = `# Review ${name}: ${item.title}
Read-only. Do NOT edit files, push, or comment on GitHub. Repo ${repo.path}. First \`git fetch\`, then review \`git diff origin/master...origin/${item.branch}\` (read ${L}/dev.json for the PR number and the dev's deviations; if ${L}/review.json exists, it holds your predecessor's findings: check each is fixed and review only the delta since its "head"). To read a file at the branch head use \`git show origin/${item.branch}:<path>\`.

## Plan under review
${item.issue}

## Look for
Correctness bugs and concrete failure scenarios; does it actually do what the plan and issue ask; missing tests for domain logic; accessibility regressions (keyboard, focus, reduced motion); anything outside the allowed paths; regressions in lessons, stories, practice or remixes that share the changed code. Say nothing about style.

## Output
Overwrite ${L}/review.json: {"head":"<origin/${item.branch} sha you reviewed>","findings":[{"severity":"blocker|high|medium|low","file":"","line":0,"summary":"one line","scenario":"one line"}],"verdict":"clean|fixes-needed"}. At most 10 findings, most severe first, only ones you are confident in. Then return only the counts: {head, blockers, highs, others}.
`
fs.writeFileSync(`${L}/brief-dev.md`, dev)
fs.writeFileSync(`${L}/brief-review.md`, review)
// Extra independent reviewers (item.reviewers > 1) get the same brief with their own output file.
for (let k = 2; k <= (item.reviewers ?? 1); k++) fs.writeFileSync(`${L}/brief-review-${k}.md`, review.replaceAll(`${L}/review.json`, `${L}/review-${k}.json`))
out({ name, ok: true })
