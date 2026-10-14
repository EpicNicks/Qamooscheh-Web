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
  /** The lesson's tags as authored; the first is its main tag (see mainTag.ts). */
  themes?: string[];
  /**
   * Non-standard skills only: the index in `standardPositions` of the last
   * standard position before this skill in the unit's published order (-1 when
   * it comes before the first). Where a story branches off the road.
   */
  anchorPositionIndex?: number;
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
  /** Whether the learner has a completion event for this skill (GET /v1/lessons/completed). Independent of the cursor: a skipped-over fork alternate was never completed. */
  completed: boolean;
  /**
   * Status on the Journey road. Equals `status` for a standard skill. A story
   * stays locked there until the position before it is passed, whereas
   * `status` (which the library pages use) opens it with its unit.
   */
  roadStatus: SkillStatus;
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

/**
 * The alternates a learner can choose between at one position, with how many
 * are finished. `kind` leaves room for another kind of branch; only forks exist
 * today (a story side path is drawn by roadRows.ts, not as a position branch).
 */
export interface PositionBranches {
  kind: "fork";
  skills: PathSkill[];
  done: number;
  total: number;
}

/** The branches of a position, or null when it is a single lesson with nothing to choose between. */
export function positionBranches(position: PathPosition): PositionBranches | null {
  if (position.skills.length < 2) return null;
  return {
    kind: "fork",
    skills: position.skills,
    done: position.skills.filter((s) => s.completed).length,
    total: position.skills.length,
  };
}

/**
 * Splits a unit's published positions (each a list of skills of any
 * category) into the standard sequence the cursor walks and the other skills,
 * each of which remembers the last standard position before it. A position
 * mixing a story with lessons anchors the story to that same position.
 */
export function splitUnitPositions(positions: PathSkillInput[][]): {
  standardPositions: PathPositionInput[];
  otherSkills: PathSkillInput[];
} {
  const standardPositions: PathPositionInput[] = [];
  const otherSkills: PathSkillInput[] = [];
  for (const skills of positions) {
    const standard = skills.filter((s) => s.category === "standard");
    if (standard.length > 0) standardPositions.push({ skills: standard });
    for (const skill of skills) {
      if (skill.category !== "standard") otherSkills.push({ ...skill, anchorPositionIndex: standardPositions.length - 1 });
    }
  }
  return { standardPositions, otherSkills };
}

/**
 * A story's status on the Journey road: its unit's earlier units are open,
 * later ones locked, and within the cursor's unit it opens once the standard
 * position it branches off (`anchorPositionIndex`) is behind the cursor — or
 * at once when it comes before the first lesson. Never "current": stories do
 * not move the cursor.
 */
export function storyRoadStatus(
  unitIndex: number,
  currentUnitIndex: number,
  currentPositionIndex: number,
  anchorPositionIndex: number,
): SkillStatus {
  if (unitIndex < currentUnitIndex) return "unlocked";
  if (unitIndex > currentUnitIndex) return "locked";
  if (currentPositionIndex < 0) return "locked";
  return anchorPositionIndex < currentPositionIndex ? "unlocked" : "locked";
}

/**
 * `completedSkillKeys` is the skill keys from GET /v1/lessons/completed. The
 * backend reports no per-branch completion of its own, so it is joined onto
 * the manifest's skills here.
 */
export function computePathProgress(
  units: PathUnitInput[],
  position: PositionKey | null,
  completedSkillKeys: ReadonlySet<string> = new Set(),
): PathUnit[] {
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
        skills: pos.skills.map((s) => ({
          ...s,
          unitKey: unit.unitKey,
          status,
          completed: completedSkillKeys.has(s.skillKey),
          roadStatus: status,
          positionIndex: posIndex,
        })),
      };
    });

    const otherSkills = unit.otherSkills.map((skill): PathSkill => {
      // story/conversation/song: gated only by unit position.
      const status: SkillStatus = unitIndex <= currentUnitIndex ? "unlocked" : "locked";
      const roadStatus = storyRoadStatus(
        unitIndex,
        currentUnitIndex,
        currentPositionIndex,
        skill.anchorPositionIndex ?? unit.standardPositions.length - 1,
      );
      return { ...skill, unitKey: unit.unitKey, status, roadStatus, completed: completedSkillKeys.has(skill.skillKey) };
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

/**
 * The lesson a learner who just finished `finished` would start next from
 * the path — the cursor's current position, once it has moved past every
 * lesson in `finished`. Returns null while the cursor still sits on one of
 * them (the path hasn't caught up with the pass yet, a practice round that
 * completed nothing, or the very last lesson of the course, which has no
 * position after it) and when there's no current position at all. For a fork
 * the first unfinished alternate is used (the first when all are finished).
 * Only the current position is offered: later ones are locked.
 */
export function findLessonAfter(
  path: PathUnit[],
  finished: readonly { unitKey: string | null; skillKey: string }[],
): PositionKey | null {
  for (const unit of path) {
    const current = unit.standardPositions.find((p) => p.status === "current");
    if (!current) continue;
    const stillCurrent = current.skills.some((s) =>
      finished.some((ref) => ref.unitKey === unit.unitKey && ref.skillKey === s.skillKey),
    );
    if (stillCurrent) return null;
    const branch = current.skills.find((s) => !s.completed) ?? current.skills[0];
    return { unitKey: unit.unitKey, skillKey: branch.skillKey };
  }
  return null;
}

/**
 * The (unitKey, skillKey) of the NEXT unit's own first standard position —
 * distinct from findNextStandardTarget, which finds the position immediately
 * after the cursor within its current progression and so can still be
 * several positions short of a unit boundary. This is specifically "skip the
 * rest of the current unit and test into the next one" (GitHub #4), offered
 * only for the single next unit rather than any future one: an arbitrarily
 * distant target would sum every intervening skill's exercises into one
 * placement test (CheckpointService.SampleDepth applies per skill in the
 * whole tested range), which is unbounded and untested for a span that
 * large. Returns null when the cursor's unit is the last one, or (same as
 * findNextStandardTarget) no unit after it has a standard position at all.
 */
export function findNextUnitEntryTarget(path: PathUnit[]): PositionKey | null {
  const currentUnitIndex = path.findIndex((unit) => unit.standardPositions.some((p) => p.status === "current"));
  if (currentUnitIndex < 0) return null;

  for (let nextUnitIndex = currentUnitIndex + 1; nextUnitIndex < path.length; nextUnitIndex++) {
    const firstPosition = path[nextUnitIndex].standardPositions[0];
    if (firstPosition) return { unitKey: path[nextUnitIndex].unitKey, skillKey: firstPosition.skills[0].skillKey };
  }
  return null;
}

/**
 * Whether `target` is the very first standard position of the very first
 * unit in the course — the one place the real-lesson walkthrough
 * (RealLessonOverlay) should ever auto-trigger. Matches by skill key against
 * every alternate at that position, since a fork's alternates are
 * interchangeable entry points into the course.
 */
export function isFirstStandardPosition(path: PathUnit[], target: PositionKey): boolean {
  const firstUnit = path[0];
  if (!firstUnit || firstUnit.unitKey !== target.unitKey) return false;
  const firstPosition = firstUnit.standardPositions[0];
  return firstPosition?.skills.some((s) => s.skillKey === target.skillKey) ?? false;
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
