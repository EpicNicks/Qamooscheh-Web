import type { ReactNode } from "react";
import { useLocalAppPref } from "../../hooks/useLocalAppPref";
import styles from "./StreakText.module.css";

interface StreakTextProps {
  /** The streak this text is about — any run at all is drawn in fire colors, zero in muted grey. */
  days: number;
  /**
   * Whether today already counts toward `days`. False draws a live streak as
   * ash in a flame outline instead of full fire — alive, but waiting on today;
   * true lets flames rise gently behind it. Omit for a figure that isn't about
   * today (e.g. the longest streak): plain fire, no flames.
   */
  practicedToday?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Streak-colored text, shared by the header counter (StreakCounter) and the
 * Profile page so both draw a streak the same way. No flame icon — the warmth
 * comes from the --color-streak-* tokens in index.css, and, once today is
 * done, soft flames rising behind the text.
 *
 * Both motions (the waiting streak's smoulder, the done streak's flames) sit
 * behind the one local pref, smoulderingStreak.
 */
export function StreakText({ days, practicedToday, children, className }: StreakTextProps) {
  const [animate] = useLocalAppPref("smoulderingStreak", true);
  const waiting = practicedToday === false;
  const tone =
    days === 0 ? styles.cold : !waiting ? styles.fire : animate ? `${styles.pending} ${styles.smoulder}` : styles.pending;
  if (days === 0 || practicedToday !== true || !animate) {
    return <span className={className ? `${tone} ${className}` : tone}>{children}</span>;
  }
  // The flames are a sibling under the text, not a pseudo-element of it: the
  // text's own color is a background clipped to its glyphs, and anything
  // inside that span would paint over it. The caller's className goes on the
  // outer element, the one its layout actually places.
  return (
    <span className={className ? `${styles.blaze} ${className}` : styles.blaze}>
      <span className={styles.flames} aria-hidden="true" />
      <span className={tone}>{children}</span>
    </span>
  );
}
