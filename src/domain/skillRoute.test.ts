import { describe, expect, it } from "vitest";
import { isPassedOverAlternate, skillStartRoute } from "./skillRoute";

const alt = (skillKey: string, status: "current" | "unlocked", completed: boolean) => ({ unitKey: "u1", skillKey, status, completed });

describe("skillStartRoute", () => {
  it("runs the cursor's lesson through /lesson, naming the alternate tapped", () => {
    const b2 = alt("b2", "current", false);
    expect(skillStartRoute(b2, [alt("b1", "current", false), b2])).toBe("/lesson?skill=b2");
  });

  it("sends a completed lesson behind the cursor to a practice round", () => {
    const b1 = alt("b1", "unlocked", true);
    expect(skillStartRoute(b1, [b1, alt("b2", "unlocked", false)])).toBe("/practice/u1/b1");
  });

  it("sends the passed-over alternate to a graded first attempt", () => {
    const b2 = alt("b2", "unlocked", false);
    expect(skillStartRoute(b2, [alt("b1", "unlocked", true), b2])).toBe("/practice/u1/b2?first=1");
  });

  it("treats a never-completed lesson with no completed sibling (tested out) as practice", () => {
    const a1 = alt("a1", "unlocked", false);
    expect(skillStartRoute(a1, [a1])).toBe("/practice/u1/a1");
    expect(skillStartRoute(a1)).toBe("/practice/u1/a1");
  });

  it("does not count an alternate as its own completed sibling", () => {
    const b1 = alt("b1", "unlocked", false);
    expect(isPassedOverAlternate(b1, [b1, alt("b2", "unlocked", false)])).toBe(false);
  });
});
