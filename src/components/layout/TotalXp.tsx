import { useBootstrap } from "../../hooks/useBootstrap";
import { useActivity } from "../../hooks/useCourseCatalog";
import { totalXp } from "../../domain/dailyGoal";
import { getLanguageInfo } from "../../domain/language";
import styles from "./TotalXp.module.css";

/**
 * The header's XP count for the active course (issue #40), beside the streak.
 * Per course, unlike the streak: daily_activity is kept per course, so this
 * sums the active course's own history (GET /v1/activity) and changes when
 * the learner switches courses. Renders nothing until that answers, like
 * StreakCounter.
 */
export function TotalXp() {
  const bootstrap = useBootstrap();
  const courseCode = bootstrap.data?.course?.code;
  const activity = useActivity(courseCode);
  if (!activity.data) return null;

  const xp = totalXp(activity.data.days).toLocaleString();
  const language = getLanguageInfo(courseCode)?.displayName;
  const description = language ? `${xp} XP in ${language}` : `${xp} XP`;

  return (
    <span className={styles.xp} aria-label={description} title={description}>
      {xp}
      <span className={styles.unit}>XP</span>
    </span>
  );
}
