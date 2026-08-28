import { XpBurst } from "./XpBurst";
import styles from "./AnswerFeedback.module.css";

export interface AnswerFeedbackProps {
  correct: boolean;
  note: string | null;
  /** Cosmetic per-answer XP (domain/xp.ts) — 0/omitted renders no burst. */
  xp?: number;
}

/**
 * Instant, non-authoritative feedback after one submitted answer — see
 * domain/answerFeedback.ts's own caveat: the server's grading is what
 * actually counts. Callers should `key` this by a per-submission counter so
 * the correct-answer XP pop / wrong-answer shake (both mount-triggered CSS
 * animations) replay on every submission rather than just the first.
 */
export function AnswerFeedback({ correct, note, xp = 0 }: AnswerFeedbackProps) {
  return (
    <div className={correct ? styles.correct : `${styles.incorrect} ${styles.shake}`} role="status">
      <span className={styles.verdict}>{correct ? "Correct!" : "Not quite."}</span>
      {note && <span className={styles.note}>{note}</span>}
      {correct && <XpBurst amount={xp} />}
    </div>
  );
}
