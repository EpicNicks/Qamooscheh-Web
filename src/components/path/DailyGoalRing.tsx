import { useEffect, useRef } from "react";
import { usePrefs } from "../../hooks/usePrefs";
import { useActivity } from "../../hooks/useCourseCatalog";
import { useLocalAppPref } from "../../hooks/useLocalAppPref";
import { useStreak } from "../../hooks/useStreak";
import { currentStreakDay, matchDailyGoalPreset, xpToday } from "../../domain/dailyGoal";
import { playSound } from "../../domain/sfx";
import styles from "./DailyGoalRing.module.css";

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A small ring on the journey page tracking today's XP (GET /v1/activity)
 * against the learner's daily goal (user_prefs.dailyGoalXp, Settings ->
 * Goals) — the visual feedback the goal itself was missing before this
 * existed as anything but a stored number nothing compared against.
 *
 * "Today" is the server's streak-day (StreakResponse.today), the same key
 * GET /v1/activity buckets by — it starts at the learner's dayStartHour
 * (default 3am) in their stored zone, so the device date would read 0 XP from
 * midnight to then (API_SPEC.md §2.12a). The device date stands in only while
 * the streak is loading, and never triggers the celebration.
 *
 * The first time in a streak-day the ring actually reaches its goal, it
 * plays a one-off completion pulse (CSS only — no confetti library, no
 * emoji) and remembers having done so in localAppPrefs, so reloading the
 * page or finishing another lesson the same day doesn't replay it. A
 * learner who finds the animation distracting can turn it off entirely
 * (Settings) without losing the ring/progress tracking itself.
 *
 * `compact` is the mobile header's version (AppShell), beside the streak: a
 * smaller ring and just the numbers. Only one of the two is ever mounted —
 * PathPage drops its own below the mobile breakpoint — so the celebration
 * can't play twice.
 */
export function DailyGoalRing({ courseCode, compact = false }: { courseCode: string | null | undefined; compact?: boolean }) {
  const prefs = usePrefs();
  const activity = useActivity(courseCode);
  const streak = useStreak();
  const [lastCelebrated, setLastCelebrated] = useLocalAppPref("lastGoalCelebrationDay", null);
  const [celebrationEnabled] = useLocalAppPref("goalCelebrationEnabled", true);
  const [soundEffects] = useLocalAppPref("soundEffects", true);
  const chimedOn = useRef<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const goal = prefs.data?.dailyGoalXp ?? null;
  const today = currentStreakDay(streak.data);
  const xp = activity.data ? xpToday(activity.data.days, today) : 0;
  const reached = goal !== null && xp >= goal;
  // The device-date fallback is only good enough to draw; remembering a
  // celebration under it could key the wrong day and replay or skip one.
  const knowsToday = streak.data != null;

  // Fires exactly once per streak-day, the moment the data on hand first
  // shows the goal met. The pulse itself is driven straight on the DOM node
  // (a restarted CSS animation via classList, not a `celebrating` state
  // flag) — this effect's only REACT-visible write is persisting
  // lastCelebrated, which is the actual external-system sync; the animation
  // is a one-shot imperative effect with nothing for a render to derive.
  useEffect(() => {
    if (!reached || !knowsToday || !celebrationEnabled || lastCelebrated === today) return;
    setLastCelebrated(today);
    // lastCelebrated is only saved once this effect is done, so a second run
    // straight after (development StrictMode) would otherwise chime again.
    if (soundEffects && chimedOn.current !== today) playSound("goalReached");
    chimedOn.current = today;
    const el = wrapRef.current;
    if (!el) return;
    el.classList.remove(styles.celebrating);
    // Force a reflow so re-adding the class restarts the animation even if
    // it's already present from a previous mount in the same session.
    void el.offsetWidth;
    el.classList.add(styles.celebrating);
  }, [reached, knowsToday, celebrationEnabled, lastCelebrated, today, setLastCelebrated, soundEffects]);

  if (goal === null) return null;

  const pct = Math.min(1, xp / goal);
  const preset = matchDailyGoalPreset(goal);

  return (
    <div
      ref={wrapRef}
      className={compact ? `${styles.wrap} ${styles.compact}` : styles.wrap}
      role="status"
      aria-label={`${xp} of ${goal} daily XP goal`}
      title={compact ? `${xp} of ${goal} daily XP goal` : undefined}
    >
      <svg viewBox="0 0 48 48" className={styles.ring} aria-hidden="true">
        <circle className={styles.track} cx="24" cy="24" r={RADIUS} />
        <circle
          className={reached ? `${styles.progress} ${styles.progressComplete}` : styles.progress}
          cx="24"
          cy="24"
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - pct)}
        />
      </svg>
      <div className={styles.label}>
        <span className={styles.xp}>
          {xp}/{goal}
        </span>
        {!compact && <span className={styles.caption}>{preset ? preset.label : "Daily XP"}</span>}
      </div>
    </div>
  );
}
