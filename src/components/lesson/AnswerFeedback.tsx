import styles from "./AnswerFeedback.module.css";

export interface AnswerFeedbackProps {
  correct: boolean;
  note: string | null;
}

/** Instant, non-authoritative feedback after one submitted answer — see domain/answerFeedback.ts's own caveat: the server's grading is what actually counts. */
export function AnswerFeedback({ correct, note }: AnswerFeedbackProps) {
  return (
    <div className={correct ? styles.correct : styles.incorrect} role="status">
      <span className={styles.verdict}>{correct ? "Correct!" : "Not quite."}</span>
      {note && <span className={styles.note}>{note}</span>}
    </div>
  );
}
