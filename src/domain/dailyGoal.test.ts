import { describe, expect, it } from "vitest";
import { DAILY_GOAL_PRESETS, matchDailyGoalPreset, totalXp } from "./dailyGoal";

describe("matchDailyGoalPreset", () => {
  it("finds the preset an exact XP value matches", () => {
    expect(matchDailyGoalPreset(750)).toEqual({ xp: 750, label: "Regular" });
  });

  it("returns undefined for a hand-entered custom value", () => {
    expect(matchDailyGoalPreset(37)).toBeUndefined();
  });

  it("presets are sorted ascending by XP", () => {
    const xps = DAILY_GOAL_PRESETS.map((p) => p.xp);
    expect(xps).toEqual([...xps].sort((a, b) => a - b));
  });
});

describe("totalXp", () => {
  it("adds up every day of a course's history (issue #40)", () => {
    expect(
      totalXp([
        { localDay: "2026-10-04", reviews: 12, xp: 40 },
        { localDay: "2026-10-02", reviews: 3, xp: 10 },
        { localDay: "2026-09-30", reviews: 0, xp: 0 },
      ]),
    ).toBe(50);
  });

  it("is 0 for a course with no activity yet", () => {
    expect(totalXp([])).toBe(0);
  });
});
