import { useEffect, useRef } from "react";
import { usePrefs } from "../../hooks/usePrefs";
import { useActivity } from "../../hooks/useCourseCatalog";
import { useLocalAppPref } from "../../hooks/useLocalAppPref";
import { matchDailyGoalPreset, todayLocalDay, xpToday } from "../../domain/dailyGoal";
import styles from "./DailyGoalRing.module.css";

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A small ring on the journey page tracking today's XP (GET /v1/activity)
 * against the learner's daily goal (user_prefs.dailyGoalXp, Settings ->
 * Goals) — the visual feedback the goal itself was missing before this
 * existed as anything but a stored number nothing compared against.
 *
 * The first time in a calendar day the ring actually reaches its goal, it
 * plays a one-off completion pulse (CSS only — no confetti library, no
 * emoji) and remembers having done so in localAppPrefs, so reloading the
 * page or finishing another lesson the same day doesn't replay it. A
 * learner who finds the animation distracting can turn it off entirely
 * (Settings) without losing the ring/progress tracking itself.
 */
export function DailyGoalRing({ courseCode }: { courseCode: string | null | undefined }) {
  const prefs = usePrefs();
  const activity = useActivity(courseCode);
  const [lastCelebrated, setLastCelebrated] = useLocalAppPref("lastGoalCelebrationDay", null);
  const [celebrationEnabled] = useLocalAppPref("goalCelebrationEnabled", true);
  const wrapRef = useRef<HTMLDivElement>(null);

  const goal = prefs.data?.dailyGoalXp ?? null;
  const xp = activity.data ? xpToday(activity.data.days) : 0;
  const reached = goal !== null && xp >= goal;
  const today = todayLocalDay();

  // Fires exactly once per calendar day, the moment the data on hand first
  // shows the goal met. The pulse itself is driven straight on the DOM node
  // (a restarted CSS animation via classList, not a `celebrating` state
  // flag) — this effect's only REACT-visible write is persisting
  // lastCelebrated, which is the actual external-system sync; the animation
  // is a one-shot imperative effect with nothing for a render to derive.
  useEffect(() => {
    if (!reached || !celebrationEnabled || lastCelebrated === today) return;
    setLastCelebrated(today);
    const el = wrapRef.current;
    if (!el) return;
    el.classList.remove(styles.celebrating);
    // Force a reflow so re-adding the class restarts the animation even if
    // it's already present from a previous mount in the same session.
    void el.offsetWidth;
    el.classList.add(styles.celebrating);
  }, [reached, celebrationEnabled, lastCelebrated, today, setLastCelebrated]);

  if (goal === null) return null;

  const pct = Math.min(1, xp / goal);
  const preset = matchDailyGoalPreset(goal);

  return (
    <div ref={wrapRef} className={styles.wrap} role="status" aria-label={`${xp} of ${goal} daily XP goal`}>
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
        <span className={styles.caption}>{preset ? preset.label : "Daily XP"}</span>
      </div>
    </div>
  );
}
