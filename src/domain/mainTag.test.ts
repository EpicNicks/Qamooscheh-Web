import { describe, expect, it } from "vitest";
import { mainTagSymbol } from "./mainTag";
import type { ThemeIndexArtifact } from "../types/content";

const index: ThemeIndexArtifact = {
  themes: [
    { id: "Time", parentId: null, lessons: [] },
    { id: "Clock", parentId: "Time", lessons: [] },
    { id: "Digital", parentId: "Clock", lessons: [] },
    { id: "Loop", parentId: "Loop2", lessons: [] },
    { id: "Loop2", parentId: "Loop", lessons: [] },
  ],
};
const symbols = { Time: "T", Food: "F" };

describe("mainTagSymbol", () => {
  it("uses the first listed tag, not a later one", () => {
    expect(mainTagSymbol(["Food", "Time"], symbols, index)).toBe("F");
  });

  it("falls back to the nearest ancestor with a symbol", () => {
    expect(mainTagSymbol(["Digital"], symbols, index)).toBe("T");
    expect(mainTagSymbol(["Digital"], { Clock: "C", Time: "T" }, index)).toBe("C");
  });

  it("is null with no tags, no symbol anywhere up the chain, or no tree and no direct symbol", () => {
    expect(mainTagSymbol(undefined, symbols, index)).toBeNull();
    expect(mainTagSymbol([], symbols, index)).toBeNull();
    expect(mainTagSymbol(["Unknown"], symbols, index)).toBeNull();
    expect(mainTagSymbol(["Clock"], symbols, null)).toBeNull();
    expect(mainTagSymbol(["Food"], symbols, null)).toBe("F");
  });

  it("stops on a parent cycle", () => {
    expect(mainTagSymbol(["Loop"], symbols, index)).toBeNull();
  });
});
