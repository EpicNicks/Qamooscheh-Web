// Display wording for GET /v1/streak (API_SPEC.md §2.12). The number itself
// is the server's — one streak across every enrolled language, counted in the
// learner's own time zone and day start — so nothing here re-derives it; this
// only decides how a StreakResponse reads.
import type { StreakResponse } from "../types/api";

/** "1 day" / "12 days" — for a count shown on its own, without the word "streak". */
export function formatStreakDays(days: number): string {
  return days === 1 ? "1 day" : `${days} days`;
}

/** "3h 12m" / "45m" / "under a minute" — time left until `deadline`, for a countdown. */
export function formatTimeLeft(deadline: Date, now: Date = new Date()): string {
  const minutes = Math.floor((deadline.getTime() - now.getTime()) / 60_000);
  if (minutes < 1) return "under a minute";
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

/**
 * The full sentence a compact display (the header's bare number) needs as its
 * accessible name and tooltip. Separates the states a learner can actually be
 * in: no streak, a streak already safe for today (practised, or paused), and
 * one alive only on the grace day — practised yesterday, not yet today — which
 * the server still counts but which ends when today's streak-day does, so that
 * one says how long is left.
 */
export function describeStreak(streak: StreakResponse, now: Date = new Date()): string {
  const { currentStreakDays, practicedToday, pausedToday, nextDayStartsAt } = streak;
  if (currentStreakDays === 0) return "No streak yet. Finish a Parsle today to start one.";
  const run = `${currentStreakDays}-day streak`;
  if (practicedToday) return `${run}. You've practiced today.`;
  if (pausedToday) return `${run}. Paused today, so it's safe.`;
  return `${run}. Practice in the next ${formatTimeLeft(new Date(nextDayStartsAt), now)} to keep it going.`;
}

/** "3:00 AM" — the wall-clock time a new streak-day starts, in the zone the server counts the streak in. */
export function formatDayStart(streak: StreakResponse): string {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone: streak.timeZone }).format(
    new Date(streak.nextDayStartsAt),
  );
}

/** `day` ("YYYY-MM-DD") moved by `days`, as a plain calendar date — no time zone involved. */
export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** "Mon, Oct 5" — a streak-day for display. Parsed as UTC and formatted as UTC, so no zone can shift it a day. */
export function formatStreakDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** setTimeout's ceiling; a longer delay fires immediately. */
const MAX_TIMER_MS = 2_147_483_647;

/**
 * Milliseconds until just after the streak-day ends — useStreak's refetch
 * interval, so `today` rolls over with the app left open. False (no timer)
 * with no streak yet; floored at a minute so a device clock running ahead of
 * the server can't turn it into a tight loop.
 */
export function msUntilRollover(streak: StreakResponse | undefined, now: number = Date.now()): number | false {
  if (!streak) return false;
  const end = Date.parse(streak.nextDayStartsAt);
  if (Number.isNaN(end)) return false;
  return Math.min(MAX_TIMER_MS, Math.max(60_000, end - now + 1_000));
}
