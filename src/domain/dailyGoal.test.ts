import { describe, expect, it } from "vitest";
import { currentStreakDay, DAILY_GOAL_PRESETS, deviceLocalDay, matchDailyGoalPreset, totalXp, xpToday } from "./dailyGoal";

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

describe("xpToday", () => {
  const days = [
    { localDay: "2026-10-13", reviews: 5, xp: 30 },
    { localDay: "2026-10-12", reviews: 20, xp: 120 },
  ];

  it("reads the XP of the streak-day it is given", () => {
    expect(xpToday(days, "2026-10-12")).toBe(120);
  });

  it("is 0 for a streak-day with no activity yet", () => {
    expect(xpToday(days, "2026-10-14")).toBe(0);
  });
});

describe("currentStreakDay", () => {
  it("uses the server's streak-day, not the device date (the day starts at dayStartHour)", () => {
    // 01:30 on the 13th on the device is still the 12th's streak-day server-side.
    expect(currentStreakDay({ today: "2026-10-12" })).toBe("2026-10-12");
  });

  it("falls back to the device date while the streak hasn't loaded", () => {
    expect(currentStreakDay(undefined)).toBe(deviceLocalDay());
    expect(currentStreakDay(null)).toBe(deviceLocalDay());
  });
});

describe("deviceLocalDay", () => {
  it("is the device's local calendar date, not UTC", () => {
    const local = new Date(2026, 9, 13, 0, 30);
    expect(deviceLocalDay(local)).toBe("2026-10-13");
  });
});
