// Which rows a unit's road is made of: its standard positions in order, with
// each story hung off the position it follows in the unit's published order
// (issue #60). Pure and React-free, like roadLayout.ts, which turns these rows
// into geometry.
import type { PathSkill, PathUnit } from "./pathProgress";

export type StorySide = "left" | "right";

export type RoadRow =
  | { kind: "position"; positionIndex: number }
  | { kind: "story"; skill: PathSkill; side: StorySide };

/**
 * Which side of the road a story branches to: either, but fixed by its key
 * alone so the road looks mixed yet never re-shuffles between renders. The
 * hash is mixed (FNV-1a plus a final avalanche) so neighbouring keys like
 * `cafe-1`/`cafe-2` don't simply alternate.
 */
export function storySide(unitKey: string, skillKey: string): StorySide {
  let h = 0x811c9dc5;
  for (const ch of `${unitKey}/${skillKey}`) {
    h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193);
  }
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h & 1) === 0 ? "left" : "right";
}

/**
 * The unit's rows top to bottom: each standard position, immediately followed
 * by the stories anchored to it (in published order); stories anchored before
 * the first position come first. Only stories branch off the road —
 * conversations and songs stay in their library page.
 */
export function buildRoadRows(unit: PathUnit): RoadRow[] {
  const last = unit.standardPositions.length - 1;
  const stories = unit.otherSkills.filter((s) => s.category === "story");
  // A story with no recorded anchor, or one past the end, hangs off the last position.
  const anchorOf = (s: PathSkill) => Math.min(s.anchorPositionIndex ?? last, last);
  const storyRows = (anchor: number): RoadRow[] =>
    stories
      .filter((s) => anchorOf(s) === anchor)
      .map((skill) => ({ kind: "story", skill, side: storySide(skill.unitKey, skill.skillKey) }));

  const rows: RoadRow[] = storyRows(-1);
  unit.standardPositions.forEach((_, positionIndex) => {
    rows.push({ kind: "position", positionIndex }, ...storyRows(positionIndex));
  });
  return rows;
}
