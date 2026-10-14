import { describe, expect, it } from "vitest";
import { forkLineKind } from "./forkLines";

describe("forkLineKind", () => {
  it("colours lessons A, B, C with A and C done green, blue, green into the fork", () => {
    const kinds = [true, false, true].map((done) => forkLineKind("current", done, false));
    expect(kinds).toEqual(["unlocked", "open", "unlocked"]);
  });

  it("greys an unfinished lesson's line out of the fork", () => {
    const kinds = [true, false, true].map((done) => forkLineKind("current", done, true));
    expect(kinds).toEqual(["unlocked", "locked", "unlocked"]);
  });

  it("keeps every line of a locked fork grey", () => {
    expect(forkLineKind("locked", true, false)).toBe("locked");
    expect(forkLineKind("locked", false, true)).toBe("locked");
  });
});
