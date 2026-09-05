import { useState } from "react";
import { XpBurst } from "./XpBurst";
import { ReportIssue } from "./ReportIssue";
import { RomanizedText } from "./RomanizedText";
import { detectScriptDirection } from "../../domain/language";
import { EMPTY_HINT_MAP, NO_HINTS, type HintSettings, type WordHint } from "../../domain/romanization";
import styles from "./AnswerFeedback.module.css";

export interface AnswerFeedbackProps {
  correct: boolean;
  note: string | null;
  /** Cosmetic per-answer XP (domain/xp.ts) — 0/omitted renders no burst. */
  xp?: number;
  /** The accepted answer(s) — only ever read when `!correct`, to back "Reveal Answer?". Omit to hide that control (e.g. no exercise context available). */
  answer?: string[];
  /**
   * word_bank/match's `answer` is the ordered TOKENS of one correct
   * selection (matching `tiles`' granularity, joined with spaces to
   * display) — every other exercise type's `answer` is a list of
   * alternative whole-answer strings (joined with " / " to display all of
   * them). See domain/answerFeedback.ts's identical dispatch.
   */
  answerIsTokenized?: boolean;
  /** What the learner actually submitted, exactly as handed to the grader — shown as "Your answer" alongside the revealed correct answer, so a mismatched word-bank tile order (say) is visible rather than just "wrong". */
  submittedText?: string;
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
  answerIsTokenized = false,
  submittedText,
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
          <div className={styles.revealed}>
            <span className={styles.verdict} dir={answer ? detectScriptDirection(answer.join(" ")) : undefined}>
              {answer && (
                <RomanizedText
                  text={answerIsTokenized ? answer.join(" ") : answer.join(" / ")}
                  hintMap={hintMap}
                  settings={hintSettings}
                />
              )}
            </span>
            {submittedText !== undefined && (
              <span className={styles.yourAnswer}>Your answer: {submittedText || "(nothing submitted)"}</span>
            )}
          </div>
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
