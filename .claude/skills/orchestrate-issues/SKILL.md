---
name: orchestrate-issues
description: Run light-context, sequential develop -> review/CI -> fix -> ratify loops on GitHub issues of Qamooscheh-Web, one fresh subagent per step, agents passing files not conversation. Use when asked to run, continue or add orchestrator items, or to work through several issues hands-off.
---

# Qamooscheh-Web issue orchestrator (light context, sequential)

Ported from the N2Engine orchestrator. Per item: Develop -> (CI wait || fresh reviewer) -> up to 2 fix rounds -> scripted ratify.
Items run **one at a time**. Ratify never merges: master deploys to production, so a `ready` PR is merged by the user.

## Light-context contract (the point of this skill)
The orchestrating session must stay near-empty. It may only:
- run the scripts below with Bash (each prints ONE JSON line), and
- spawn fresh agents with the one-line prompts below, which return only a tiny object.
It must NOT read diffs, source files, agent transcripts or briefs, and must not paste plans or findings into prompts:
agents read their brief / the ledger from disk. Read ledger JSON only for a held item, and only the field you need.
Never resume an agent with SendMessage for a new step; every step is a fresh agent (fresh context = cheap and unbiased).

## Paths
- Skill (scripts, items): `.claude/skills/orchestrate-issues/` in this repo. `S` below.
- Ledger: `E:/Code/Projects/Qamooscheh-Web/orchestrator-ledger/<name>/` (dev.json, review.json, ci.json, ratify.json, state.json, briefs). `L` below.
- Worktrees: `E:/Code/Projects/Qamooscheh-Web/Qamooscheh-Web-<name>` (created by setup.mjs, with `npm ci`).

## Steps
1. List `S/items/*.json`. An item with `gate` set and `approved: false` is blocked: ask the user for the design / approval, write it into `issue`, set `approved: true`.
2. For each approved item, sequentially:
   1. `node S/lib/brief.mjs <name>` -> `{ok}`.
   2. Developer (fresh agent, general-purpose): `Read L/brief-dev.md and follow it exactly. Reply with only {"pr":N,"needsUser":null|"reason"}.`
      needsUser -> report needs-user, go to the next item.
   3. Verify, in parallel: `node S/lib/ci-wait.mjs <name>` (Bash, background ok) and the reviewers, all fresh agents.
      Reviewer 1 (model `item.reviewer`): `Read L/brief-review.md and follow it exactly. Reply with only {"head":"sha","blockers":N,"highs":N,"others":N}.`
      If `item.reviewers` is 2+, reviewer k reads `L/brief-review-k.md` (a different model from reviewer 1, e.g. sonnet). Use 2 for changes to shared lesson/session code, 1 otherwise.
   4. If CI is green and blockers+highs == 0 across all reviews, go to ratify. Else fix (fresh agent, max 2 rounds, then re-verify):
      `Read L/brief-dev.md (your task and rules). Fix the existing branch in your existing worktree (L/state.json): every blocker/high in L/review*.json (and mediums you judge valid) and the failures in L/ci.json. Push, update L/dev.json. Reply with only {"pr":N,"needsUser":null|"reason"}.`
   5. `node S/lib/ratify.mjs <name>` -> `{decision: ready|hold, reasons}`. Ratify never merges.
3. Report one line per item: merged / ready (PR #), held (reasons, with the dev.json deviations) or needs-user.

## Held items
- The user accepts deviations: move them into `deviationsAcceptedByUser` in L/dev.json, clear `deviations`, re-run ratify.
- The user revises the plan: write the revision into the item's `notes`, re-run brief.mjs, and send a fresh revision agent (merge origin/master first, implement the notes, list only new judgement calls), then verify again.

## Merging (the user asked the orchestrating session to merge)
- Only a `ready` PR, one at a time, in the order the user agreed: `gh pr merge <pr> --merge --delete-branch` (needs the `Bash(gh pr merge:*)` allow rule in `.claude/settings.local.json`).
- Remove the worktree and local branch, `git pull --ff-only` on master. The next PR is now behind master: its next round merges origin/master, then it is re-verified.

## After a merge
- Update the item's `web` key in the backend repo's `features.yaml` (see CLAUDE.md), using `feature` from ratify.json.
- Items labelled "Do on Mobile Too": message the Android session (ListAgents) or tell the user.

## Standing rules (in every brief)
- `gh` via its existing login; never a token on a command line or in env.
- Commits and PR bodies carry the harness attribution lines (repo convention).
- CI (`.github/workflows/ci.yml`: lint, tsc -b, build, test) also runs locally in the worktree before the PR.
- Anything that departs from the approved plan, or needs a design decision, is held for the user.

## Item file (`S/items/<name>.json`)
`name, repo (web), branch, title, closes, issue (the approved plan), allowedPaths (regexes), acceptance, notes? (user revisions), gate, approved, reviewer (opus|sonnet), reviewers (count, default 1)`.
