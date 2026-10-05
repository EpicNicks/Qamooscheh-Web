import { describe, expect, it } from "vitest";
import {
  addDays,
  describeStreak,
  formatStreakDay,
  formatStreakDays,
  formatTimeLeft,
} from "./streak";
import type { StreakResponse } from "../types/api";

const NOW = new Date("2026-09-30T22:00:00Z");

function streak(overrides: Partial<StreakResponse>): StreakResponse {
  return {
    currentStreakDays: 0,
    longestStreakDays: 0,
    practicedToday: false,
    pausedToday: false,
    pause: null,
    pauseDaysAvailable: 30,
    timeZone: "America/New_York",
    dayStartHour: 3,
    today: "2026-09-30",
    // 03:00 EDT on 1 October — nine hours after NOW.
    nextDayStartsAt: "2026-10-01T07:00:00Z",
    ...overrides,
  };
}

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
    expect(describeStreak(streak({ currentStreakDays: 0, longestStreakDays: 4 }), NOW)).toBe(
      "No streak yet. Finish a lesson today to start one.",
    );
  });

  it("says a streak is safe once today is practiced", () => {
    expect(describeStreak(streak({ currentStreakDays: 5, longestStreakDays: 5, practicedToday: true }), NOW)).toBe(
      "5-day streak. You've practiced today.",
    );
  });

  it("warns with the time left when the streak is alive only on the grace day", () => {
    expect(describeStreak(streak({ currentStreakDays: 5, longestStreakDays: 9 }), NOW)).toBe(
      "5-day streak. Practice in the next 9h 0m to keep it going.",
    );
  });

  it("says a paused day is safe without practice", () => {
    expect(describeStreak(streak({ currentStreakDays: 5, longestStreakDays: 9, pausedToday: true }), NOW)).toBe(
      "5-day streak. Paused today, so it's safe.",
    );
  });
});

describe("formatTimeLeft", () => {
  it("shows hours and minutes, then minutes alone, then a floor", () => {
    expect(formatTimeLeft(new Date("2026-10-01T01:12:30Z"), NOW)).toBe("3h 12m");
    expect(formatTimeLeft(new Date("2026-09-30T22:45:00Z"), NOW)).toBe("45m");
    expect(formatTimeLeft(new Date("2026-09-30T22:00:30Z"), NOW)).toBe("under a minute");
    expect(formatTimeLeft(new Date("2026-09-30T21:00:00Z"), NOW)).toBe("under a minute");
  });
});

describe("addDays / formatStreakDay", () => {
  it("moves across month ends as plain calendar dates", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("never shifts the displayed day", () => {
    expect(formatStreakDay("2026-10-05")).toContain("5");
  });
});
