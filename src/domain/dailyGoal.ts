// Duolingo's own framing for user_prefs.dailyGoalXp: a small set of named XP
// tiers rather than a raw number or a time-based target — nothing in this
// system ever measured session duration, but daily_activity.xp (GET
// /v1/activity, XpPolicy.ForSession server-side) is a real, already-computed
// per-day measurement, so XP is what a goal can actually be checked against.
import type { ActivityDay, StreakResponse } from "../types/api";

export interface DailyGoalPreset {
  xp: number;
  label: string;
}

/**
 * Named tiers, ascending. A lesson answered perfectly (first-try correct
 * throughout, no hints — the grader's 10-XP first-try award, API_SPEC.md §2.3 point 8) is worth
 * roughly 100 XP, so these are sized as a 5-to-15-lesson-a-day range rather
 * than a fraction of one lesson.
 */
export const DAILY_GOAL_PRESETS: readonly DailyGoalPreset[] = [
  { xp: 500, label: "Casual" },
  { xp: 750, label: "Regular" },
  { xp: 1000, label: "Serious" },
  { xp: 1500, label: "Intense" },
];

/** The preset this value exactly matches, or undefined for a hand-entered custom goal. */
export function matchDailyGoalPreset(xp: number): DailyGoalPreset | undefined {
  return DAILY_GOAL_PRESETS.find((preset) => preset.xp === xp);
}

/**
 * "YYYY-MM-DD" for right now, in THIS DEVICE's local time zone and starting at
 * midnight — deliberately not `toISOString()` (UTC). Only a fallback for while
 * GET /v1/streak hasn't answered: it is NOT the server's streak-day, which
 * starts at `dayStartHour` (default 3am) in the learner's stored zone. Matching
 * activity against this would read 0 XP from midnight to the day start, and
 * whenever the device zone differs from the stored one (API_SPEC.md §2.12a).
 */
export function deviceLocalDay(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA");
}

/**
 * The learner's current streak-day — the key `ActivityDay.localDay` is
 * bucketed by. The server's `StreakResponse.today` when there is one (never
 * re-derived client-side: the day start and DST make that disagree), else the
 * device date as a stand-in while the streak is still loading.
 */
export function currentStreakDay(streak: Pick<StreakResponse, "today"> | null | undefined): string {
  return streak?.today ?? deviceLocalDay();
}

/**
 * XP on streak-day `today` from an activity history (GET /v1/activity, newest
 * day first) — 0 if that day hasn't posted any activity yet. Pass
 * `currentStreakDay(streak)`, not the device date.
 */
export function xpToday(days: readonly ActivityDay[], today: string): number {
  return days.find((day) => day.localDay === today)?.xp ?? 0;
}

/** Every XP the learner has earned in a course: the sum of its whole activity history (GET /v1/activity returns every day, not a window). */
export function totalXp(days: readonly ActivityDay[]): number {
  return days.reduce((sum, day) => sum + day.xp, 0);
}
