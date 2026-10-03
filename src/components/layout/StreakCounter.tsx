import { Link } from "react-router-dom";
import { useStreak } from "../../hooks/useStreak";
import { describeStreak } from "../../domain/streak";
import { StreakText } from "../common/StreakText";
import styles from "./StreakCounter.module.css";

/**
 * The header's streak count, beside the course switcher. Deliberately NOT
 * tied to the active course: the streak is one number across every language
 * (API_SPEC.md §2.12), so switching courses never changes it.
 *
 * Renders nothing until GET /v1/streak answers, and nothing if it fails — a
 * missing statistic is better than a spinner or an error banner in a header
 * that's on every screen. Links to Profile, where the longest streak sits
 * alongside it.
 */
export function StreakCounter() {
  const streak = useStreak();
  if (!streak.data) return null;

  const days = streak.data.currentStreakDays;
  const description = describeStreak(streak.data);

  return (
    <Link to="/profile" className={styles.counter} aria-label={description} title={description}>
      <StreakText days={days}>
        {days}
        {/* Below the mobile breakpoint the header has no room for the words,
            so the long form swaps for a one-letter unit, the same CSS-only
            swap AppShell's nav labels use. */}
        <span className={styles.long}>-day streak</span>
        <span className={styles.short}>d</span>
      </StreakText>
    </Link>
  );
}
