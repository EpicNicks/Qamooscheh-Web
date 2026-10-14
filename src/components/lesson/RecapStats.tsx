import { usePrefs } from "../../hooks/usePrefs";
import { useActivity } from "../../hooks/useCourseCatalog";
import { useStreak } from "../../hooks/useStreak";
import { useCountUp } from "../../hooks/useCountUp";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { currentStreakDay, xpToday } from "../../domain/dailyGoal";
import { StreakText } from "../common/StreakText";
import styles from "./RecapStats.module.css";

const GOAL_RADIUS = 8;
const GOAL_CIRCUMFERENCE = 2 * Math.PI * GOAL_RADIUS;

/**
 * The recap's stat tiles: XP earned, and — for a pass — the streak and
 * today's progress on the daily goal. `xp` is the server-credited XP (null
 * or 0 shows no tile). `revealed` starts the XP count-up once the recap's
 * text appears.
 *
 * The streak and activity queries are invalidated by the lesson's submit, so
 * they may still hold yesterday's numbers on first paint; a tile stays hidden
 * (its space reserved) while its query is refetching rather than jumping from
 * the old value to the new one. The goal tile is static on purpose: the
 * header's DailyGoalRing owns the goal celebration, and a second one here
 * would play it twice.
 */
export function RecapStats({
  courseCode,
  xp,
  withProgress,
  revealed,
}: {
  courseCode: string | null | undefined;
  xp: number | null;
  /** Streak and daily goal as well as XP — a pass, not a retake. */
  withProgress: boolean;
  revealed: boolean;
}) {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const prefs = usePrefs();
  const activity = useActivity(withProgress ? courseCode : null);
  const streak = useStreak();
  const xpCount = useCountUp(xp ?? 0, 700, reduced, revealed);

  const showXp = xp != null && xp > 0;
  const streakData = withProgress ? streak.data : undefined;
  const goal = withProgress ? (prefs.data?.dailyGoalXp ?? null) : null;
  const goalXp = activity.data ? xpToday(activity.data.days, currentStreakDay(streak.data)) : null;
  const showGoal = goal !== null && goalXp !== null;
  const tiles = (showXp ? 1 : 0) + (streakData ? 1 : 0) + (showGoal ? 1 : 0);
  if (tiles === 0) return null;

  return (
    <div className={tiles === 1 ? `${styles.tiles} ${styles.one}` : styles.tiles}>
      {showXp && (
        <div className={styles.tile}>
          <b className={styles.xp}>+{xpCount.value}</b>
          <span className={styles.caption}>XP earned</span>
        </div>
      )}
      {streakData && (
        <div
          className={streak.isFetching ? `${styles.tile} ${styles.pending}` : styles.tile}
        >
          <b>
            <StreakText days={streakData.currentStreakDays} practicedToday={streakData.practicedToday || streakData.pausedToday}>
              {streakData.currentStreakDays}
            </StreakText>
          </b>
          <span className={styles.caption}>day streak</span>
        </div>
      )}
      {showGoal && (
        <div
          className={activity.isFetching || streak.isFetching ? `${styles.tile} ${styles.pending}` : styles.tile}
          aria-label={`${goalXp} of ${goal} daily XP goal`}
        >
          <b>
            <svg viewBox="0 0 24 24" className={styles.mini} aria-hidden="true">
              <circle className={styles.miniTrack} cx="12" cy="12" r={GOAL_RADIUS} />
              <circle
                className={styles.miniProgress}
                cx="12"
                cy="12"
                r={GOAL_RADIUS}
                strokeDasharray={GOAL_CIRCUMFERENCE}
                strokeDashoffset={GOAL_CIRCUMFERENCE * (1 - Math.min(1, goalXp / goal))}
              />
            </svg>
            {goalXp}/{goal}
          </b>
          <span className={styles.caption}>daily goal</span>
        </div>
      )}
    </div>
  );
}
