import { describe, expect, it } from "vitest";
import { buildRoadRows, storySide } from "./roadRows";
import { computePathProgress, splitUnitPositions } from "./pathProgress";
import type { PathSkillInput } from "./pathProgress";

const lesson = (skillKey: string): PathSkillInput => ({ skillKey, title: skillKey, category: "standard" });
const story = (skillKey: string): PathSkillInput => ({ skillKey, title: skillKey, category: "story" });
const conversation = (skillKey: string): PathSkillInput => ({ skillKey, title: skillKey, category: "conversation" });

function unitOf(positions: PathSkillInput[][]) {
  const [unit] = computePathProgress(
    [{ unitKey: "u", title: "U", ...splitUnitPositions(positions) }],
    { unitKey: "u", skillKey: "a" },
  );
  return unit;
}

const summary = (positions: PathSkillInput[][]) =>
  buildRoadRows(unitOf(positions)).map((r) => (r.kind === "position" ? `p${r.positionIndex}` : `s:${r.skill.skillKey}`));

describe("splitUnitPositions", () => {
  it("anchors each non-standard skill to the last standard position before it", () => {
    const { standardPositions, otherSkills } = splitUnitPositions([
      [story("early")],
      [lesson("a")],
      [lesson("b1"), lesson("b2")],
      [story("mid")],
      [lesson("c"), story("same-position")],
      [story("late1")],
      [story("late2")],
    ]);
    expect(standardPositions.map((p) => p.skills.map((s) => s.skillKey))).toEqual([["a"], ["b1", "b2"], ["c"]]);
    expect(otherSkills.map((s) => [s.skillKey, s.anchorPositionIndex])).toEqual([
      ["early", -1],
      ["mid", 1],
      ["same-position", 2],
      ["late1", 2],
      ["late2", 2],
    ]);
  });
});

describe("buildRoadRows", () => {
  it("is just the positions for a unit with no stories", () => {
    expect(summary([[lesson("a")], [lesson("b1"), lesson("b2")], [lesson("c")]])).toEqual(["p0", "p1", "p2"]);
  });

  it("places a story right after the position it follows, and one before the first lesson first", () => {
    expect(summary([[story("early")], [lesson("a")], [lesson("b")], [story("mid")], [lesson("c")]])).toEqual([
      "s:early",
      "p0",
      "p1",
      "s:mid",
      "p2",
    ]);
  });

  it("hangs a unit's trailing stories off its last position, in published order", () => {
    expect(summary([[lesson("a")], [lesson("review")], [story("c1")], [story("c2")], [story("c3")]])).toEqual([
      "p0",
      "p1",
      "s:c1",
      "s:c2",
      "s:c3",
    ]);
  });

  it("leaves conversations and songs off the road", () => {
    expect(summary([[lesson("a")], [conversation("talk")], [story("s")]])).toEqual(["p0", "s:s"]);
  });

  it("falls back to the last position for a story with no recorded anchor", () => {
    const unit = unitOf([[lesson("a")], [lesson("b")]]);
    unit.otherSkills.push({ ...unit.standardPositions[0].skills[0], skillKey: "loose", category: "story", anchorPositionIndex: undefined });
    expect(buildRoadRows(unit).map((r) => r.kind)).toEqual(["position", "position", "story"]);
  });
});

describe("storySide", () => {
  it("is stable for a given story", () => {
    expect(storySide("u", "cafe-1")).toBe(storySide("u", "cafe-1"));
  });

  it("uses both sides across a unit's stories", () => {
    const sides = new Set(["cafe-1", "cafe-2", "cafe-3", "friday", "calendar", "market", "trip", "home"].map((k) => storySide("u2", k)));
    expect(sides).toEqual(new Set(["left", "right"]));
  });

  it("is carried on the rows", () => {
    const rows = buildRoadRows(unitOf([[lesson("a")], [story("s")]]));
    expect(rows[1]).toMatchObject({ kind: "story", side: storySide("u", "s") });
  });
});
