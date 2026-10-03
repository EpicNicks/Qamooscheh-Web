// Display wording for GET /v1/streak (API_SPEC.md §2.12). The number itself
// is the server's — one streak across every enrolled language, counted in the
// learner's own time zone and day start — so nothing here re-derives it; this
// only decides how a StreakResponse reads.
import type { StreakResponse } from "../types/api";

/** "1 day" / "12 days" — for a count shown on its own, without the word "streak". */
export function formatStreakDays(days: number): string {
  return days === 1 ? "1 day" : `${days} days`;
}

/**
 * The full sentence a compact display (the header's bare number) needs as its
 * accessible name and tooltip. Separates the three states a learner can
 * actually be in: no streak, a streak already safe for today, and one alive
 * only on the grace day — practised yesterday, not yet today — which the
 * server still counts but which ends if today passes without a lesson.
 */
export function describeStreak(streak: StreakResponse): string {
  const { currentStreakDays, practicedToday } = streak;
  if (currentStreakDays === 0) return "No streak yet. Finish a lesson today to start one.";
  const run = `${currentStreakDays}-day streak`;
  return practicedToday ? `${run}. You've practiced today.` : `${run}. Practice today to keep it going.`;
}
