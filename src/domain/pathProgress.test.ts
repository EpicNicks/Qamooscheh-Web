import { describe, expect, it } from "vitest";
import { computePathProgress, findNextStandardTarget, groupByArc } from "./pathProgress";
import type { PathUnitInput, SkillStatus } from "./pathProgress";

function standard(skillKey: string) {
  return { skillKey, title: skillKey.toUpperCase(), category: "standard" as const };
}

function story(skillKey: string, arc?: string) {
  return { skillKey, title: skillKey.toUpperCase(), category: "story" as const, arc };
}

/**
 * Two units. Unit 1 has three standard positions, the middle one a fork with
 * two alternates (b1/b2), plus a story skill; unit 2 has a single standard
 * position. Enough shape to exercise every branch of the gate.
 */
function courseFixture(): PathUnitInput[] {
  return [
    {
      unitKey: "u1",
      title: "Unit 1",
      standardPositions: [{ skills: [standard("a1")] }, { skills: [standard("b1"), standard("b2")] }, { skills: [standard("c1")] }],
      otherSkills: [story("s1")],
    },
    {
      unitKey: "u2",
      title: "Unit 2",
      standardPositions: [{ skills: [standard("d1")] }, { skills: [standard("e1")] }],
      otherSkills: [story("s2")],
    },
  ];
}

/** The status of each standard position, per unit — the thing the path screen renders. */
function statusGrid(units: ReturnType<typeof computePathProgress>): SkillStatus[][] {
  return units.map((unit) => unit.standardPositions.map((position) => position.status));
}

describe("computePathProgress", () => {
  it("marks the cursor's position current, earlier ones unlocked, later ones locked", () => {
    const path = computePathProgress(courseFixture(), { unitKey: "u1", skillKey: "a1" });
    expect(statusGrid(path)).toEqual([
      ["current", "locked", "locked"],
      ["locked", "locked"],
    ]);
  });

  it("treats a fork's alternates as one position sharing a single status", () => {
    // The cursor names b2, the *second* alternate; b1 must come out current too.
    const path = computePathProgress(courseFixture(), { unitKey: "u1", skillKey: "b2" });
    expect(statusGrid(path)).toEqual([
      ["unlocked", "current", "locked"],
      ["locked", "locked"],
    ]);

    const fork = path[0].standardPositions[1];
    expect(fork.skills.map((s) => s.skillKey)).toEqual(["b1", "b2"]);
    expect(fork.skills.map((s) => s.status)).toEqual(["current", "current"]);
    expect(fork.skills.map((s) => s.positionIndex)).toEqual([1, 1]);
    expect(fork.skills.every((s) => s.unitKey === "u1")).toBe(true);
  });

  it("names the sibling alternate current as well when the cursor sits on the first one", () => {
    const path = computePathProgress(courseFixture(), { unitKey: "u1", skillKey: "b1" });
    expect(statusGrid(path)[0]).toEqual(["unlocked", "current", "locked"]);
    expect(path[0].standardPositions[1].skills.map((s) => s.status)).toEqual(["current", "current"]);
  });

  it("unlocks every position of a preceding unit when the cursor has moved on", () => {
    const path = computePathProgress(courseFixture(), { unitKey: "u2", skillKey: "e1" });
    expect(statusGrid(path)).toEqual([
      ["unlocked", "unlocked", "unlocked"],
      ["unlocked", "current"],
    ]);
  });

  it("gates story skills by unit only, not by position within the unit", () => {
    // Cursor at the very first position of unit 1: unit 1's story is already
    // unlocked, unit 2's is not.
    const path = computePathProgress(courseFixture(), { unitKey: "u1", skillKey: "a1" });
    expect(path[0].otherSkills.map((s) => s.status)).toEqual(["unlocked"]);
    expect(path[1].otherSkills.map((s) => s.status)).toEqual(["locked"]);
    // Non-standard skills carry no position index.
    expect(path[0].otherSkills[0].positionIndex).toBeUndefined();
    expect(path[0].otherSkills[0].unitKey).toBe("u1");
  });

  it("unlocks a later unit's story once the cursor reaches that unit", () => {
    const path = computePathProgress(courseFixture(), { unitKey: "u2", skillKey: "d1" });
    expect(path[1].otherSkills.map((s) => s.status)).toEqual(["unlocked"]);
  });

  it("locks everything when there is no cursor yet", () => {
    const path = computePathProgress(courseFixture(), null);
    expect(statusGrid(path)).toEqual([
      ["locked", "locked", "locked"],
      ["locked", "locked"],
    ]);
    expect(path.flatMap((u) => u.otherSkills.map((s) => s.status))).toEqual(["locked", "locked"]);
  });

  it("locks the cursor's own unit rather than guessing when the skill key is unknown", () => {
    const path = computePathProgress(courseFixture(), { unitKey: "u1", skillKey: "nope" });
    expect(statusGrid(path)[0]).toEqual(["locked", "locked", "locked"]);
  });

  it("locks everything when the cursor's unit is not in the manifest", () => {
    const path = computePathProgress(courseFixture(), { unitKey: "missing", skillKey: "a1" });
    expect(statusGrid(path)).toEqual([
      ["locked", "locked", "locked"],
      ["locked", "locked"],
    ]);
  });

  it("preserves unit identity and titles", () => {
    const path = computePathProgress(courseFixture(), { unitKey: "u1", skillKey: "a1" });
    expect(path.map((u) => [u.unitKey, u.title])).toEqual([
      ["u1", "Unit 1"],
      ["u2", "Unit 2"],
    ]);
    expect(path[0].standardPositions.map((p) => p.positionIndex)).toEqual([0, 1, 2]);
  });
});

describe("findNextStandardTarget", () => {
  it("returns the next position inside the same unit", () => {
    const path = computePathProgress(courseFixture(), { unitKey: "u1", skillKey: "a1" });
    expect(findNextStandardTarget(path)).toEqual({ unitKey: "u1", skillKey: "b1" });
  });

  it("uses the first alternate when the next position is a fork", () => {
    const path = computePathProgress(courseFixture(), { unitKey: "u1", skillKey: "a1" });
    // b1, not b2 — completing either advances the cursor identically.
    expect(findNextStandardTarget(path)?.skillKey).toBe("b1");
  });

  it("crosses into the next unit when the cursor is on its unit's last position", () => {
    const path = computePathProgress(courseFixture(), { unitKey: "u1", skillKey: "c1" });
    expect(findNextStandardTarget(path)).toEqual({ unitKey: "u2", skillKey: "d1" });
  });

  it("skips over a unit that has no standard positions at all", () => {
    const units = courseFixture();
    units.splice(1, 0, { unitKey: "u-interlude", title: "Interlude", standardPositions: [], otherSkills: [story("s3")] });
    const path = computePathProgress(units, { unitKey: "u1", skillKey: "c1" });
    expect(findNextStandardTarget(path)).toEqual({ unitKey: "u2", skillKey: "d1" });
  });

  it("returns null at the last standard position of the whole course", () => {
    const path = computePathProgress(courseFixture(), { unitKey: "u2", skillKey: "e1" });
    expect(findNextStandardTarget(path)).toBeNull();
  });

  it("returns null when nothing is current", () => {
    expect(findNextStandardTarget(computePathProgress(courseFixture(), null))).toBeNull();
  });
});

describe("groupByArc", () => {
  it("collects skills sharing an arc into one group, at the first member's spot", () => {
    const path = computePathProgress(
      [
        {
          unitKey: "u1",
          title: "Unit 1",
          standardPositions: [{ skills: [standard("a1")] }],
          otherSkills: [story("ch1", "moon"), story("solo"), story("ch2", "moon")],
        },
      ],
      { unitKey: "u1", skillKey: "a1" },
    );

    const groups = groupByArc(path[0].otherSkills);
    expect(groups.map((g) => g.arc)).toEqual(["moon", null]);
    expect(groups[0].skills.map((s) => s.skillKey)).toEqual(["ch1", "ch2"]);
    expect(groups[0].key).toBe("arc:moon");
    expect(groups[1].skills.map((s) => s.skillKey)).toEqual(["solo"]);
    expect(groups[1].key).toBe("u1/solo");
  });

  it("returns no groups for no skills", () => {
    expect(groupByArc([])).toEqual([]);
  });
});
