import { describe, expect, it } from "vitest";
import {
  burstParticleCount,
  countAt,
  easeOutCubic,
  initialRecapPhase,
  isPerfectScore,
  nextRecapPhase,
  showPassMarkTick,
  remixTopicsPath,
  selectTopicChips,
  shouldCelebrate,
  type RecapPhase,
} from "./lessonRecap";

function run(celebrate: boolean): RecapPhase[] {
  const phases: RecapPhase[] = ["fill"];
  while (phases[phases.length - 1] !== "reveal") phases.push(nextRecapPhase(phases[phases.length - 1], celebrate));
  return phases;
}

describe("recap sequence", () => {
  it("fills, then bursts, then reveals on a celebrated pass", () => {
    expect(run(true)).toEqual(["fill", "burst", "reveal"]);
  });

  it("fills then reveals with no burst otherwise", () => {
    expect(run(false)).toEqual(["fill", "reveal"]);
  });

  it("hides the pass-mark tick while filling and shows it from the fill landing", () => {
    expect(showPassMarkTick("fill")).toBe(false);
    expect(run(false).slice(1).every(showPassMarkTick)).toBe(true);
    expect(showPassMarkTick(initialRecapPhase(true))).toBe(true);
  });

  it("stays revealed once revealed", () => {
    expect(nextRecapPhase("reveal", true)).toBe("reveal");
  });

  it("starts at the final state under reduced motion", () => {
    expect(initialRecapPhase(true)).toBe("reveal");
    expect(initialRecapPhase(false)).toBe("fill");
  });
});

describe("easeOutCubic", () => {
  it("runs 0 to 1, fast then slow", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });

  it("clamps outside 0..1", () => {
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(2)).toBe(1);
  });
});

describe("countAt", () => {
  it("follows the ring's progress and lands exactly on the target", () => {
    expect(countAt(0, 85)).toBe(0);
    expect(countAt(0.5, 80)).toBe(40);
    expect(countAt(1, 85)).toBe(85);
    expect(countAt(1.2, 85)).toBe(85);
  });
});

describe("shouldCelebrate", () => {
  it("celebrates a pass or credited XP", () => {
    expect(shouldCelebrate(true, null)).toBe(true);
    expect(shouldCelebrate(null, 40)).toBe(true);
  });

  it("does not celebrate a practice round, a fail with no XP, or an already-recorded lesson", () => {
    expect(shouldCelebrate(null, null)).toBe(false);
    expect(shouldCelebrate(false, 0)).toBe(false);
    expect(shouldCelebrate(null, 0)).toBe(false);
  });
});

describe("perfect lesson", () => {
  it("is only a score of 1", () => {
    expect(isPerfectScore(1)).toBe(true);
    expect(isPerfectScore(0.96)).toBe(false);
  });

  it("gets a bigger burst", () => {
    expect(burstParticleCount(true)).toBeGreaterThan(burstParticleCount(false));
  });
});

describe("selectTopicChips", () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => `t${i}`);

  it("shows every topic up to the cap", () => {
    expect(selectTopicChips(ids(1))).toEqual({ shown: ["t0"], hidden: 0 });
    expect(selectTopicChips(ids(3))).toEqual({ shown: ["t0", "t1", "t2"], hidden: 0 });
  });

  it("collapses the rest into a count", () => {
    expect(selectTopicChips(ids(4))).toEqual({ shown: ["t0", "t1", "t2"], hidden: 1 });
    expect(selectTopicChips(ids(8))).toEqual({ shown: ["t0", "t1", "t2"], hidden: 5 });
  });

  it("handles no topics", () => {
    expect(selectTopicChips([])).toEqual({ shown: [], hidden: 0 });
  });
});

describe("remixTopicsPath", () => {
  it("joins every id, encoded, with commas", () => {
    expect(remixTopicsPath(["Grammar", "Life"])).toBe("/lesson/deep-dive-remix?themeIds=Grammar,Life");
    expect(remixTopicsPath(["A B"])).toBe("/lesson/deep-dive-remix?themeIds=A%20B");
  });
});
