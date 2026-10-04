import type { ReactNode } from "react";
import styles from "./StreakText.module.css";

interface StreakTextProps {
  /** The streak this text is about — any run at all is drawn in fire colors, zero in muted grey. */
  days: number;
  /**
   * Whether today already counts toward `days`. False draws a live streak as
   * ash in a flame outline instead of full fire — alive, but waiting on today.
   * Omit for a figure that isn't about today (e.g. the longest streak).
   */
  practicedToday?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Streak-colored text, shared by the header counter (StreakCounter) and the
 * Profile page so both draw a streak the same way. Plain colored text only —
 * no flame icon — by design for now; the warmth comes entirely from the
 * --color-streak-* tokens in index.css.
 */
export function StreakText({ days, practicedToday = true, children, className }: StreakTextProps) {
  const tone = days === 0 ? styles.cold : practicedToday ? styles.fire : styles.pending;
  return <span className={className ? `${tone} ${className}` : tone}>{children}</span>;
}
