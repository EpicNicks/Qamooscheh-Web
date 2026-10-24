import type { PathSkill } from "./pathProgress";

type RouteSkill = Pick<PathSkill, "status" | "completed" | "unitKey" | "skillKey"> & Partial<Pick<PathSkill, "stowed">>;

/**
 * A fork alternate the learner skipped past: never completed itself, but a
 * sibling at its position was, which is what moved the cursor on. Still a
 * first attempt. A lone never-completed lesson behind the cursor was instead
 * tested out of (checkpoint or placement writes no completion), so revisiting
 * it is practice.
 */
export function isPassedOverAlternate(skill: RouteSkill, siblings: readonly RouteSkill[]): boolean {
  return (
    skill.status !== "current" &&
    !skill.completed &&
    siblings.some((s) => s.skillKey !== skill.skillKey && s.completed)
  );
}

/**
 * Where tapping a path skill's primary button goes. Only the cursor's own
 * lesson runs through /lesson (it's the only one the server plans); anything
 * else is served by /practice, which is a local-only practice round unless
 * the skill is a passed-over alternate. That one is a first attempt, so
 * `?first=1` makes /practice submit it (crediting the completion, XP and
 * streak) instead of treating it as a replay. A stowed lesson is the same: the
 * cursor is past it, but a pass is what clears it (API_SPEC.md §2.18), so the
 * retry must be submitted too.
 */
export function skillStartRoute(skill: RouteSkill, siblings: readonly RouteSkill[] = []): string {
  if (skill.status === "current") return `/lesson?skill=${encodeURIComponent(skill.skillKey)}`;
  const base = `/practice/${skill.unitKey}/${skill.skillKey}`;
  return skill.stowed || isPassedOverAlternate(skill, siblings) ? `${base}?first=1` : base;
}
