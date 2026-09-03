import { useState } from "react";
import { XpBurst } from "./XpBurst";
import { ReportIssue } from "./ReportIssue";
import { RomanizedText } from "./RomanizedText";
import { EMPTY_HINT_MAP, NO_HINTS, type HintSettings, type WordHint } from "../../domain/romanization";
import styles from "./AnswerFeedback.module.css";

export interface AnswerFeedbackProps {
  correct: boolean;
  note: string | null;
  /** Cosmetic per-answer XP (domain/xp.ts) — 0/omitted renders no burst. */
  xp?: number;
  /** The accepted answer(s) — only ever read when `!correct`, to back "Reveal Answer?". Omit to hide that control (e.g. no exercise context available). */
  answer?: string[];
  /** Native word -> hover hint (domain/romanization.ts), pre-gated by the caller — see ExerciseProps.hintMap's own doc. Words with no entry render plain, so an empty/omitted map is the same as plain text. */
  hintMap?: ReadonlyMap<string, WordHint>;
  /** Which of a word's hints are enabled — see domain/romanization.ts's HintSettings. */
  hintSettings?: HintSettings;
  /** Cites which lesson part a report is about — omit to hide the Report control entirely. */
  reportContext?: { exerciseTags: string[]; prompt: string };
}

/**
 * Instant, non-authoritative feedback after one submitted answer — see
 * domain/answerFeedback.ts's own caveat: the server's grading is what
 * actually counts. Callers should `key` this by a per-submission counter so
 * the correct-answer XP pop / wrong-answer shake (both mount-triggered CSS
 * animations) replay on every submission rather than just the first.
 */
export function AnswerFeedback({
  correct,
  note,
  xp = 0,
  answer,
  hintMap = EMPTY_HINT_MAP,
  hintSettings = NO_HINTS,
  reportContext,
}: AnswerFeedbackProps) {
  const [revealed, setRevealed] = useState(false);

  if (correct) {
    return (
      <div className={styles.correct} role="status">
        <span className={styles.verdict}>Correct!</span>
        {note && <span className={styles.note}>{note}</span>}
        <XpBurst amount={xp} />
      </div>
    );
  }

  return (
    <div className={styles.wrongWrap}>
      {reportContext && <ReportIssue exerciseTags={reportContext.exerciseTags} prompt={reportContext.prompt} />}
      <div className={`${styles.incorrect} ${styles.shake}`} role="status">
        {revealed ? (
          <span className={styles.verdict}>
            {answer && <RomanizedText text={answer.join(" / ")} hintMap={hintMap} settings={hintSettings} />}
          </span>
        ) : (
          <>
            <span className={styles.verdict}>Not quite.</span>
            {note && <span className={styles.note}>{note}</span>}
            {answer && answer.length > 0 && (
              <button type="button" className={styles.reveal} onClick={() => setRevealed(true)}>
                Reveal Answer?
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
