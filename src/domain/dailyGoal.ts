// Duolingo's own framing for user_prefs.dailyGoalXp: a small set of named XP
// tiers rather than a raw number or a time-based target — nothing in this
// system ever measured session duration, but daily_activity.xp (GET
// /v1/activity, XpPolicy.ForSession server-side) is a real, already-computed
// per-day measurement, so XP is what a goal can actually be checked against.
import type { ActivityDay } from "../types/api";

export interface DailyGoalPreset {
  xp: number;
  label: string;
}

/**
 * Named tiers, ascending. A lesson answered perfectly (first-try correct
 * throughout, no hints — see domain/xp.ts's 10-XP-per-answer scale) is worth
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
 * "YYYY-MM-DD" for right now, in THIS DEVICE's local time zone — deliberately
 * not `toISOString()` (which is UTC, and would call it "tomorrow" for
 * several hours every evening in most western time zones). Only ever
 * compared against `ActivityDay.localDay`, which is the server's own
 * day-bucketing (StreakCalculator, keyed by the learner's IANA time zone and
 * day_start_hour) — the two can disagree by up to a day-start-hour's worth
 * of hours right around midnight, which is an acceptable approximation for
 * a cosmetic progress ring, not something FSRS-critical reads.
 */
export function todayLocalDay(): string {
  return new Date().toLocaleDateString("en-CA");
}

/** Today's XP from an activity history (GET /v1/activity, newest day first) — 0 if today hasn't posted any activity yet. */
export function xpToday(days: readonly ActivityDay[]): number {
  return days.find((day) => day.localDay === todayLocalDay())?.xp ?? 0;
}
