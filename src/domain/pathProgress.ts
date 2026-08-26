// Client-side re-derivation of 0001_initial.sql's user_progress unlock gate,
// for rendering the path/skill-tree screen. There is no
// "GET /v1/progress"-shaped endpoint that returns a full unlocked/locked
// list — bootstrap only reports the single current (unitKey, skillKey)
// cursor (API_SPEC.md §2.1) — so the client walks the course manifest's own
// unit/skill order (which mirrors unit.position/skill.position; content is
// authored and published in that order) and classifies every skill the same
// way the server's own gate does:
//
//   'standard' skill  -> unlocked iff (unit index, skill-among-standards index)
//                        <= the cursor's, by that same comparison.
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
}

export interface PathUnitInput {
  unitKey: string;
  title: string;
  skills: PathSkillInput[];
}

export interface PathSkill extends PathSkillInput {
  unitKey: string;
  status: SkillStatus;
}

export interface PathUnit {
  unitKey: string;
  title: string;
  skills: PathSkill[];
}

export interface PositionKey {
  unitKey: string;
  skillKey: string;
}

export function computePathProgress(units: PathUnitInput[], position: PositionKey | null): PathUnit[] {
  const currentUnitIndex = position ? units.findIndex((u) => u.unitKey === position.unitKey) : -1;

  return units.map((unit, unitIndex) => {
    const standardSkillKeys = unit.skills.filter((s) => s.category === "standard").map((s) => s.skillKey);
    const currentStandardIndex =
      unitIndex === currentUnitIndex && position ? standardSkillKeys.indexOf(position.skillKey) : -1;

    const skills = unit.skills.map((skill): PathSkill => {
      if (skill.category !== "standard") {
        // story/conversation/song: gated only by unit position.
        const status: SkillStatus = unitIndex <= currentUnitIndex ? "unlocked" : "locked";
        return { ...skill, unitKey: unit.unitKey, status };
      }

      if (unitIndex < currentUnitIndex) return { ...skill, unitKey: unit.unitKey, status: "unlocked" };
      if (unitIndex > currentUnitIndex) return { ...skill, unitKey: unit.unitKey, status: "locked" };

      const standardIndex = standardSkillKeys.indexOf(skill.skillKey);
      let status: SkillStatus;
      if (currentStandardIndex < 0) {
        // No cursor found in this unit (shouldn't happen once provisioned) — leave locked rather than guess.
        status = "locked";
      } else if (standardIndex < currentStandardIndex) {
        status = "unlocked";
      } else if (standardIndex === currentStandardIndex) {
        status = "current";
      } else {
        status = "locked";
      }
      return { ...skill, unitKey: unit.unitKey, status };
    });

    return { unitKey: unit.unitKey, title: unit.title, skills };
  });
}
