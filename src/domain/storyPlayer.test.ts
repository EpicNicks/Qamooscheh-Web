import { describe, expect, it } from "vitest";
import { isLastClip, nextPlayableIndex, segmentsFor } from "./storyPlayer";

describe("nextPlayableIndex", () => {
  const playable = [true, false, true, false];

  it("returns the line itself when it has a clip", () => {
    expect(nextPlayableIndex(playable, 0)).toBe(0);
  });

  it("steps over a line with no clip", () => {
    expect(nextPlayableIndex(playable, 1)).toBe(2);
  });

  it("is null when nothing playable is left", () => {
    expect(nextPlayableIndex(playable, 3)).toBeNull();
    expect(nextPlayableIndex(playable, 10)).toBeNull();
  });

  it("is null for a story with no clips at all", () => {
    expect(nextPlayableIndex([false, false], 0)).toBeNull();
  });
});

describe("segmentsFor", () => {
  const playable = [true, true, false, true];

  it("marks lines before the active one done and after it todo", () => {
    expect(segmentsFor(playable, 1, false).map((s) => s.state)).toEqual(["done", "active", "todo", "todo"]);
  });

  it("is empty with nothing active", () => {
    expect(segmentsFor(playable, null, false).map((s) => s.state)).toEqual(["todo", "todo", "todo", "todo"]);
  });

  it("is full once finished", () => {
    expect(segmentsFor(playable, null, true).every((s) => s.state === "done")).toBe(true);
  });

  it("carries which segments have a clip", () => {
    expect(segmentsFor(playable, null, false).map((s) => s.playable)).toEqual(playable);
  });
});

describe("isLastClip", () => {
  it("is true on the last clip even when lines without one follow it", () => {
    expect(isLastClip([true, true, false], 1)).toBe(true);
  });

  it("is false while a clip is still ahead", () => {
    expect(isLastClip([true, false, true], 0)).toBe(false);
  });
});
