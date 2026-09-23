import { describe, expect, it } from "vitest";
import type { ThemeEntry, ThemeIndexArtifact } from "../types/content";
import {
  ancestorsOf,
  buildThemeForest,
  childrenOf,
  dfsAllThemes,
  dfsThemesForLesson,
  indexThemesById,
  rootThemesForLesson,
  subtreeIds,
  type ThemeNode,
} from "./themeTree";

function theme(id: string, parentId: string | null, lessonIds: string[]): ThemeEntry {
  return { id, parentId, lessons: lessonIds.map((l) => ({ id: l, path: `lessons/${l}.json`, commonUsageScore: null })) };
}

// Grammar > Tenses > (Past, Present); Grammar > Plurals; Food (root) > Restaurant.
// `lessons` is rolled up the way the backend publishes it.
const themes: ThemeEntry[] = [
  theme("Grammar", null, ["past-1", "present-1", "plural-1", "shared"]),
  theme("Food", null, ["menu-1", "shared"]),
  theme("Tenses", "Grammar", ["past-1", "present-1", "shared"]),
  theme("Past", "Tenses", ["past-1", "shared"]),
  theme("Present", "Tenses", ["present-1"]),
  theme("Plurals", "Grammar", ["plural-1"]),
  theme("Restaurant", "Food", ["menu-1", "shared"]),
];
const index: ThemeIndexArtifact = { themes };

function shape(nodes: ThemeNode[]): unknown[] {
  return nodes.map((n) => (n.children.length ? { [n.id]: shape(n.children) } : n.id));
}

describe("buildThemeForest", () => {
  it("nests children under parents in themes.json order", () => {
    expect(shape(buildThemeForest(themes))).toEqual([
      { Grammar: [{ Tenses: ["Past", "Present"] }, "Plurals"] },
      { Food: ["Restaurant"] },
    ]);
  });

  it("treats an orphan parentId as a root instead of dropping it", () => {
    const forest = buildThemeForest([theme("A", null, []), theme("Lost", "Missing", []), theme("Child", "Lost", [])]);
    expect(shape(forest)).toEqual(["A", { Lost: ["Child"] }]);
  });

  it("returns [] for no themes", () => {
    expect(buildThemeForest([])).toEqual([]);
  });
});

describe("indexThemesById / childrenOf", () => {
  it("indexes every entry by id", () => {
    const byId = indexThemesById(themes);
    expect(byId.size).toBe(themes.length);
    expect(byId.get("Past")?.parentId).toBe("Tenses");
  });

  it("lists direct children only; null lists roots (orphans included)", () => {
    expect(childrenOf(themes, "Tenses").map((t) => t.id)).toEqual(["Past", "Present"]);
    expect(childrenOf(themes, "Past")).toEqual([]);
    expect(childrenOf([...themes, theme("Lost", "Missing", [])], null).map((t) => t.id)).toEqual(["Grammar", "Food", "Lost"]);
  });
});

describe("rootThemesForLesson", () => {
  it("returns only top-level tags despite rollup putting the lesson in every ancestor", () => {
    expect(rootThemesForLesson(index, "past-1").map((t) => t.id)).toEqual(["Grammar"]);
    expect(rootThemesForLesson(index, "shared").map((t) => t.id)).toEqual(["Grammar", "Food"]);
  });

  it("handles a missing index or unknown lesson", () => {
    expect(rootThemesForLesson(null, "past-1")).toEqual([]);
    expect(rootThemesForLesson(index, "nope")).toEqual([]);
  });
});

describe("dfsThemesForLesson", () => {
  it("orders every tagged theme in pre-order with 1-based depth", () => {
    expect(dfsThemesForLesson(index, "shared").map(({ theme: t, depth }) => [t.id, depth])).toEqual([
      ["Grammar", 1],
      ["Tenses", 2],
      ["Past", 3],
      ["Food", 1],
      ["Restaurant", 2],
    ]);
  });

  it("orders pre-order even when children precede parents in themes.json", () => {
    const reversed: ThemeIndexArtifact = { themes: [...themes].reverse() };
    expect(dfsThemesForLesson(reversed, "past-1").map(({ theme: t, depth }) => [t.id, depth])).toEqual([
      ["Grammar", 1],
      ["Tenses", 2],
      ["Past", 3],
    ]);
  });

  it("keeps a tagged node whose ancestor isn't tagged, at its true depth", () => {
    const sparse: ThemeIndexArtifact = {
      themes: [theme("Grammar", null, []), theme("Tenses", "Grammar", []), theme("Past", "Tenses", ["x"])],
    };
    expect(dfsThemesForLesson(sparse, "x").map(({ theme: t, depth }) => [t.id, depth])).toEqual([["Past", 3]]);
  });

  it("returns [] for a missing index or untagged lesson", () => {
    expect(dfsThemesForLesson(undefined, "past-1")).toEqual([]);
    expect(dfsThemesForLesson(index, "nope")).toEqual([]);
  });
});

describe("ancestorsOf", () => {
  it("returns the root...id chain inclusive", () => {
    expect(ancestorsOf(index, "Past").map((t) => t.id)).toEqual(["Grammar", "Tenses", "Past"]);
    expect(ancestorsOf(index, "Food").map((t) => t.id)).toEqual(["Food"]);
  });

  it("returns [] for an unknown id and stops at a missing parent or cycle", () => {
    expect(ancestorsOf(index, "nope")).toEqual([]);
    expect(ancestorsOf({ themes: [theme("Lost", "Missing", [])] }, "Lost").map((t) => t.id)).toEqual(["Lost"]);
    const cyclic: ThemeIndexArtifact = { themes: [theme("A", "B", []), theme("B", "A", [])] };
    expect(ancestorsOf(cyclic, "A").map((t) => t.id)).toEqual(["B", "A"]);
  });
});

describe("dfsAllThemes", () => {
  it("walks the whole tree in pre-order with 1-based depth", () => {
    expect(dfsAllThemes(themes).map(({ theme: t, depth }) => [t.id, depth])).toEqual([
      ["Grammar", 1],
      ["Tenses", 2],
      ["Past", 3],
      ["Present", 3],
      ["Plurals", 2],
      ["Food", 1],
      ["Restaurant", 2],
    ]);
  });

  it("returns plain entries (no children field) and treats orphans as roots", () => {
    const result = dfsAllThemes([theme("Lost", "Missing", ["x"]), theme("Child", "Lost", [])]);
    expect(result.map(({ theme: t, depth }) => [t.id, depth])).toEqual([
      ["Lost", 1],
      ["Child", 2],
    ]);
    expect(result[0].theme).toEqual(theme("Lost", "Missing", ["x"]));
  });

  it("returns [] for no themes", () => {
    expect(dfsAllThemes([])).toEqual([]);
  });
});

describe("subtreeIds", () => {
  it("returns the id plus every descendant, pre-order", () => {
    expect(subtreeIds(themes, "Grammar")).toEqual(["Grammar", "Tenses", "Past", "Present", "Plurals"]);
    expect(subtreeIds(themes, "Tenses")).toEqual(["Tenses", "Past", "Present"]);
  });

  it("returns just the id for a leaf", () => {
    expect(subtreeIds(themes, "Past")).toEqual(["Past"]);
  });

  it("returns [] for an unknown id", () => {
    expect(subtreeIds(themes, "nope")).toEqual([]);
  });

  it("doesn't loop forever on a parentId cycle", () => {
    const cyclic: ThemeEntry[] = [theme("A", "B", []), theme("B", "A", [])];
    expect(subtreeIds(cyclic, "A")).toEqual(["A", "B"]);
  });
});
