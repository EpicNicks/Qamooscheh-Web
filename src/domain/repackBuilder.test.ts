import { describe, expect, it } from "vitest";
import type { SkillArtifact, ThemeIndexArtifact } from "../types/content";
import { refKey } from "./skillRefKey";
import {
  focusIndexAfterRemove,
  addToBox,
  buildCandidates,
  buildPickedPool,
  comboboxKeyAction,
  parseLessonIds,
  removeFromBox,
  repackStartUrl,
  searchCandidates,
  unitKeyFromPath,
} from "./repackBuilder";

const lesson = (id: string, path: string) => ({ id, path, commonUsageScore: null });
const index: ThemeIndexArtifact = {
  themes: [
    {
      id: "Food",
      parentId: null,
      lessons: [lesson("a", "units/u1/skills/a.json"), lesson("b", "units/u2/skills/b.json"), lesson("s", "units/u1/skills/s.json")],
    },
    { id: "Travel", parentId: null, lessons: [lesson("b", "units/u2/skills/b.json"), lesson("c", "lessons/c.json")] },
  ],
};
const art = (title: string, category: SkillArtifact["category"], themes: string[] = [], arc: string | null = null) =>
  ({ id: "x", title, category, arc, themes, exercises: [] }) as SkillArtifact;
const keyed = new Map<string, SkillArtifact>([
  [refKey({ unitKey: null, skillKey: "a" }), art("Apples", "standard", ["Fruit"])],
  [refKey({ unitKey: null, skillKey: "b" }), art("Bread", "standard", [], "ali-and-sara")],
  [refKey({ unitKey: null, skillKey: "s" }), art("A story", "story")],
  [refKey({ unitKey: null, skillKey: "c" }), art("Cafe", "standard")],
]);

describe("candidates and search", () => {
  const candidates = buildCandidates(index, keyed);
  it("keeps standard lessons only, deduped, sorted by title, with unit from the path", () => {
    expect(candidates.map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(candidates.map((c) => c.unitKey)).toEqual(["u1", "u2", null]);
    expect(unitKeyFromPath("units/u9/skills/z.json")).toBe("u9");
  });
  it("searches title, unit, tags and arc, all words must match", () => {
    expect(searchCandidates(candidates, "app", []).map((c) => c.id)).toEqual(["a"]);
    expect(searchCandidates(candidates, "u2", []).map((c) => c.id)).toEqual(["b"]);
    expect(searchCandidates(candidates, "fruit", []).map((c) => c.id)).toEqual(["a"]);
    expect(searchCandidates(candidates, "ali sara", []).map((c) => c.id)).toEqual(["b"]);
    expect(searchCandidates(candidates, "app u2", [])).toEqual([]);
  });
  it("returns nothing for an empty query and hides what is already in the box", () => {
    expect(searchCandidates(candidates, "  ", [])).toEqual([]);
    expect(searchCandidates(candidates, "a", ["a"]).map((c) => c.id)).not.toContain("a");
  });
});

describe("focusIndexAfterRemove", () => {
  it("focuses the row that took its place, else the last, else none", () => {
    expect(focusIndexAfterRemove(3, 0)).toBe(0);
    expect(focusIndexAfterRemove(3, 2)).toBe(1);
    expect(focusIndexAfterRemove(1, 0)).toBe(-1);
  });
});

describe("box", () => {
  it("adds in order without duplicates and has no size limit", () => {
    expect(addToBox(addToBox([], "a"), "a")).toEqual(["a"]);
    const many = Array.from({ length: 50 }, (_, i) => `l${i}`);
    expect(addToBox(many, "extra")).toEqual([...many, "extra"]);
    expect(removeFromBox(["a", "b"], "a")).toEqual(["b"]);
  });
  it("builds the existing remix route url and parses it back", () => {
    expect(repackStartUrl(["a", "b c"])).toBe("/lesson/deep-dive-remix?lessonIds=a,b%20c");
    expect(parseLessonIds("a,,b")).toEqual(["a", "b"]);
    expect(parseLessonIds(null)).toEqual([]);
  });
  it("builds the picked pool in the given order, standard only", () => {
    expect(buildPickedPool(index, keyed, ["c", "s", "a", "c", "zzz"]).map((l) => l.id)).toEqual(["c", "a"]);
  });
});

describe("comboboxKeyAction", () => {
  const s = (count: number, active: number, query = "q") => ({ count, active, query });
  it("moves with the arrow keys and wraps", () => {
    expect(comboboxKeyAction(s(3, -1), "ArrowDown")).toEqual({ type: "move", active: 0 });
    expect(comboboxKeyAction(s(3, 2), "ArrowDown")).toEqual({ type: "move", active: 0 });
    expect(comboboxKeyAction(s(3, 0), "ArrowUp")).toEqual({ type: "move", active: 2 });
    expect(comboboxKeyAction(s(0, -1), "ArrowDown")).toEqual({ type: "none" });
  });
  it("picks the highlighted option on Enter, only when there is one", () => {
    expect(comboboxKeyAction(s(3, 1), "Enter")).toEqual({ type: "pick", index: 1 });
    expect(comboboxKeyAction(s(3, -1), "Enter")).toEqual({ type: "none" });
  });
  it("clears on Escape only when there is text", () => {
    expect(comboboxKeyAction(s(0, -1, "abc"), "Escape")).toEqual({ type: "clear" });
    expect(comboboxKeyAction(s(0, -1, ""), "Escape")).toEqual({ type: "none" });
    expect(comboboxKeyAction(s(3, 0), "x")).toEqual({ type: "none" });
  });
});
