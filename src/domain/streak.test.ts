import { describe, expect, it } from "vitest";
import { describeStreak, formatStreakDays } from "./streak";

describe("formatStreakDays", () => {
  it("uses the singular for exactly one day", () => {
    expect(formatStreakDays(1)).toBe("1 day");
  });

  it("uses the plural for zero and for more than one", () => {
    expect(formatStreakDays(0)).toBe("0 days");
    expect(formatStreakDays(12)).toBe("12 days");
  });
});

describe("describeStreak", () => {
  it("invites a learner with no streak to start one", () => {
    expect(describeStreak({ currentStreakDays: 0, longestStreakDays: 4, practicedToday: false })).toBe(
      "No streak yet. Finish a lesson today to start one.",
    );
  });

  it("says a streak is safe once today is practiced", () => {
    expect(describeStreak({ currentStreakDays: 5, longestStreakDays: 5, practicedToday: true })).toBe(
      "5-day streak. You've practiced today.",
    );
  });

  it("warns when the streak is alive only on the grace day", () => {
    expect(describeStreak({ currentStreakDays: 5, longestStreakDays: 9, practicedToday: false })).toBe(
      "5-day streak. Practice today to keep it going.",
    );
  });
});
