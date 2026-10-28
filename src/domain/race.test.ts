import { describe, expect, it } from "vitest";
import { clock, dealable, emptyBoardText, ended, heldMessage, isStrike, score, scoreText, solved, strikes } from "./race";
import type { ClozeResult } from "./cloze";

const weights = { a: 1.0, b: 1.5, c: 2.0 };
const right = (tag: string): ClozeResult => ({ tag, correct: true, attempt: 1, elapsedMs: 2000 });
const retry = (tag: string): ClozeResult => ({ tag, correct: true, attempt: 2, elapsedMs: 2000 });
const gaveUp = (tag: string): ClozeResult => ({ tag, correct: false, attempt: 3, elapsedMs: 2000 });

describe("race rules", () => {
  it("a card not right on attempt one is a strike", () => {
    expect(isStrike(right("a"))).toBe(false);
    expect(isStrike(retry("a"))).toBe(true);
    expect(isStrike(gaveUp("a"))).toBe(true);
  });

  it("score sums the weights of solved cards and a retry still solves it", () => {
    const results = [right("a"), retry("b"), gaveUp("c")];
    expect(score(results, weights)).toBeCloseTo(2.5);
    expect(solved(results)).toBe(2);
    expect(strikes(results)).toBe(2);
  });

  it("Perfect Delivery ends at the third strike and Endless Practice never does", () => {
    const results = [gaveUp("a"), retry("b"), gaveUp("c")];
    expect(ended("perfect_delivery", results)).toBe(true);
    expect(ended("perfect_delivery", results.slice(0, 2))).toBe(false);
    expect(ended("endless_practice", results)).toBe(false);
  });

  it("a tag the server did not weight is not dealt", () => {
    expect(dealable(["a", "x", "c"], (t) => t, weights)).toEqual(["a", "c"]);
  });

  it("the clock reads minutes and seconds, with tenths on the live one", () => {
    expect(clock(-5)).toBe("0:00");
    expect(clock(65_900)).toBe("1:05");
    expect(clock(65_900, true)).toBe("1:05.9");
    expect(scoreText(4.54)).toBe("4.5");
  });

  it("explains a held run without accusing, and each empty board", () => {
    expect(heldMessage("answer_too_fast")).toContain("faster than a person");
    expect(heldMessage("claimed_time_exceeds_run")).toContain("timing");
    expect(heldMessage(null)).toContain("isn't on the boards");
    expect(emptyBoardText("weekly")).toContain("Monday");
  });
});
