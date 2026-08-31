// Client-side re-derivation of 0001_initial.sql's user_progress unlock gate,
// for rendering the path/skill-tree screen. There is no
// "GET /v1/progress"-shaped endpoint that returns a full unlocked/locked
// list — bootstrap only reports the single current (unitKey, skillKey)
// cursor (API_SPEC.md §2.1) — so the client walks the course manifest's own
// unit/position order (which mirrors unit.position/skill.position; content is
// authored and published in that order) and classifies every skill the same
// way the server's own gate does:
//
//   'standard' skill  -> unlocked iff (unit index, position index) <= the
//                        cursor's, by that same comparison. Status is decided
//                        per POSITION, not per skill: side versions sharing a
//                        position are alternates ("do either to advance"), so
//                        they necessarily share a status too.
//   story/conversation/song -> unlocked iff its unit's index <= the cursor
//                        unit's index, independent of position within it.
//
// This is authoritative for DISPLAY only — every gated read (checkpoint,
// session plan) is still enforced server-side regardless of what this
// function renders as unlocked.
import type { SkillCategory } from "./enums";

export type SkillStatus = "locked" | "unlocked" | "current";

export interface PathSkillInput {
  skillKey: string;
  title: string;
  category: SkillCategory;
  /** The narrative this skill is a chapter of, if any — only meaningful on story/conversation/song skills. */
  arc?: string;
}

/** One point in a unit's standard sequence: 1 skill = no fork, 2+ = alternates. */
export interface PathPositionInput {
  skills: PathSkillInput[];
}

export interface PathUnitInput {
  unitKey: string;
  title: string;
  standardPositions: PathPositionInput[];
  otherSkills: PathSkillInput[];
}

export interface PathSkill extends PathSkillInput {
  unitKey: string;
  status: SkillStatus;
  /** Index within the unit's standard sequence; undefined for non-standard skills, which have no position in it. */
  positionIndex?: number;
}

/** Status lives here rather than per-skill: every alternate at a position shares it. */
export interface PathPosition {
  positionIndex: number;
  status: SkillStatus;
  skills: PathSkill[];
}

export interface PathUnit {
  unitKey: string;
  title: string;
  standardPositions: PathPosition[];
  otherSkills: PathSkill[];
}

export interface PositionKey {
  unitKey: string;
  skillKey: string;
}

export function computePathProgress(units: PathUnitInput[], position: PositionKey | null): PathUnit[] {
  const currentUnitIndex = position ? units.findIndex((u) => u.unitKey === position.unitKey) : -1;

  return units.map((unit, unitIndex) => {
    // The cursor names one skill key; what matters for the gate is which
    // position that skill sits at, since an alternate advances the cursor
    // exactly as its sibling would.
    const currentPositionIndex =
      unitIndex === currentUnitIndex && position
        ? unit.standardPositions.findIndex((p) => p.skills.some((s) => s.skillKey === position.skillKey))
        : -1;

    const standardPositions = unit.standardPositions.map((pos, posIndex): PathPosition => {
      let status: SkillStatus;
      if (unitIndex < currentUnitIndex) {
        status = "unlocked";
      } else if (unitIndex > currentUnitIndex) {
        status = "locked";
      } else if (currentPositionIndex < 0) {
        // No cursor found in this unit (shouldn't happen once provisioned) — leave locked rather than guess.
        status = "locked";
      } else if (posIndex < currentPositionIndex) {
        status = "unlocked";
      } else if (posIndex === currentPositionIndex) {
        status = "current";
      } else {
        status = "locked";
      }

      return {
        positionIndex: posIndex,
        status,
        skills: pos.skills.map((s) => ({ ...s, unitKey: unit.unitKey, status, positionIndex: posIndex })),
      };
    });

    const otherSkills = unit.otherSkills.map((skill): PathSkill => {
      // story/conversation/song: gated only by unit position.
      const status: SkillStatus = unitIndex <= currentUnitIndex ? "unlocked" : "locked";
      return { ...skill, unitKey: unit.unitKey, status };
    });

    return { unitKey: unit.unitKey, title: unit.title, standardPositions, otherSkills };
  });
}

/**
 * The (unitKey, skillKey) of the standard position immediately after the
 * learner's current one — crossing into the next unit if the current
 * position is the last one in its unit. This is the target for "test out of
 * this lesson": GET /v1/checkpoint rejects anything that isn't strictly
 * ahead of the cursor, and the position right after "current" is the
 * closest one that qualifies (checkpoint-passing it skips the whole current
 * rank, alternates included, exactly like completing it normally would).
 * Multiple skills can share a position (a fork); the first is used as the
 * concrete checkpoint target, since completing any alternate advances the
 * cursor identically. Returns null when there's no current position, or it's
 * the very last standard position in the course (nothing left to test into).
 */
export function findNextStandardTarget(path: PathUnit[]): PositionKey | null {
  for (let unitIndex = 0; unitIndex < path.length; unitIndex++) {
    const unit = path[unitIndex];
    const currentPosIndex = unit.standardPositions.findIndex((p) => p.status === "current");
    if (currentPosIndex < 0) continue;

    const nextInUnit = unit.standardPositions[currentPosIndex + 1];
    if (nextInUnit) return { unitKey: unit.unitKey, skillKey: nextInUnit.skills[0].skillKey };

    for (let nextUnitIndex = unitIndex + 1; nextUnitIndex < path.length; nextUnitIndex++) {
      const nextPosition = path[nextUnitIndex].standardPositions[0];
      if (nextPosition) return { unitKey: path[nextUnitIndex].unitKey, skillKey: nextPosition.skills[0].skillKey };
    }
    return null; // the current position was the last one in the whole course
  }
  return null;
}

/** A run of skills sharing one `arc`, or a lone skill belonging to none. */
export interface ArcGroup {
  key: string;
  arc: string | null;
  skills: PathSkill[];
}

/**
 * Buckets a unit's non-standard skills into arc groups, preserving content
 * order. Skills sharing an `arc` collect into one group even if other skills
 * sit between them in the authored order (the group takes the position of its
 * first member); everything without an `arc` stays its own singleton group
 * with `arc: null`.
 *
 * This is the whole of "arc ordering" on the client: chapter order is the
 * order the skills already arrive in, which is why no ArcPosition field is
 * authored anywhere (see SkillArtifact.arc).
 */
export function groupByArc(skills: PathSkill[]): ArcGroup[] {
  const groups: ArcGroup[] = [];
  const byArc = new Map<string, ArcGroup>();

  for (const skill of skills) {
    if (!skill.arc) {
      groups.push({ key: `${skill.unitKey}/${skill.skillKey}`, arc: null, skills: [skill] });
      continue;
    }

    const existing = byArc.get(skill.arc);
    if (existing) {
      existing.skills.push(skill);
    } else {
      const group: ArcGroup = { key: `arc:${skill.arc}`, arc: skill.arc, skills: [skill] };
      byArc.set(skill.arc, group);
      groups.push(group);
    }
  }

  return groups;
}
