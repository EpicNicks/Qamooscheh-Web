import { describe, expect, it } from "vitest";
import type { SkillArtifact, ThemeEntry, ThemeIndexArtifact } from "../types/content";
import type { SkillCategory } from "./enums";
import { buildRemixPool } from "./deepDiveRemix";
import { refKey } from "./skillRefKey";

function theme(id: string, parentId: string | null, lessonIds: string[]): ThemeEntry {
  return { id, parentId, lessons: lessonIds.map((l) => ({ id: l, path: `lessons/${l}.json`, commonUsageScore: null })) };
}

function artifacts(entries: Record<string, SkillCategory>): Map<string, SkillArtifact> {
  return new Map(
    Object.entries(entries).map(([id, category]) => [
      refKey({ unitKey: null, skillKey: id }),
      { id, title: id, category, arc: null, exercises: [] },
    ]),
  );
}

const index: ThemeIndexArtifact = {
  themes: [
    theme("Grammar", null, ["a", "b", "story-1"]),
    theme("Tenses", "Grammar", ["a", "b"]),
    theme("Food", null, ["b", "c", "unloaded"]),
  ],
};
const skills = artifacts({ a: "standard", b: "standard", c: "standard", "story-1": "story" });

describe("buildRemixPool", () => {
  it("unions the given themes' lessons, deduped in first-seen order, standard only", () => {
    expect(buildRemixPool(index, skills, { themeIds: ["Grammar", "Food"] }).map((l) => l.id)).toEqual(["a", "b", "c"]);
  });

  it("excludes the source lesson when asked", () => {
    expect(buildRemixPool(index, skills, { themeIds: ["Grammar", "Food"], excludeLessonKey: "b" }).map((l) => l.id)).toEqual([
      "a",
      "c",
    ]);
  });

  it("ignores unknown theme ids and a missing index", () => {
    expect(buildRemixPool(index, skills, { themeIds: ["Nope", "Tenses"] }).map((l) => l.id)).toEqual(["a", "b"]);
    expect(buildRemixPool(null, skills, { themeIds: ["Grammar"] })).toEqual([]);
  });
});
