import { describe, expect, it } from "vitest";
import { DAILY_GOAL_PRESETS, matchDailyGoalPreset } from "./dailyGoal";

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
