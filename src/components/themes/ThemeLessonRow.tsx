import styles from "./ThemeLessonRow.module.css";

function usageTier(score: number | null): { label: string; className: string } | null {
  if (score == null) return null;
  if (score >= 70) return { label: "Core", className: styles.core };
  if (score >= 40) return { label: "Common", className: styles.common };
  return { label: "Niche", className: styles.niche };
}

/**
 * One lesson row in a theme's browse list — the presentational unit
 * ThemeBrowsePage renders per ThemeLessonRef. Deliberately not a reuse of
 * SkillNode: that component is coupled to PathSkill's locked/unlocked/
 * current journey semantics, which don't apply to "completed or not" here.
 * Only the `.locked` greyscale-filter CSS token convention is reused, not
 * the component itself.
 */
export function ThemeLessonRow({
  title,
  commonUsageScore,
  completed,
  highlighted,
  onSelect,
}: {
  title: string;
  commonUsageScore: number | null;
  completed: boolean;
  /** "You're doing this one now" — the landing state for the deep-dive-from-journey entry point. */
  highlighted: boolean;
  onSelect: () => void;
}) {
  const tier = usageTier(commonUsageScore);
  const classes = [styles.row, completed && styles.completed, highlighted && styles.highlighted]
    .filter(Boolean)
    .join(" ");

  return (
    <button type="button" className={classes} onClick={onSelect}>
      <span className={styles.title}>{title}</span>
      <span className={styles.meta}>
        {highlighted && <span className={styles.badge}>You're doing this now</span>}
        {completed && <span className={styles.badge}>Done</span>}
        {tier && <span className={`${styles.badge} ${tier.className}`}>{tier.label}</span>}
      </span>
    </button>
  );
}
