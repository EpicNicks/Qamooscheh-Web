import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../common/Button";
import { AnnotatedText } from "../lesson/AnnotatedText";
import { ExerciseRenderer } from "../lesson/ExerciseRenderer";
import { displayDirection } from "../../domain/annotation";
import { attemptWorth, gradeCloze, MAX_CLOZE_ATTEMPTS, type ClozeCard as ClozeCardData, type ClozeResult } from "../../domain/cloze";
import { stripReadingAids } from "../../domain/persian/normalize";
import { gateLexemeHintMap } from "../../domain/romanization";
import type { ExerciseSession } from "../../hooks/useExerciseSession";
import type { ExerciseArtifact } from "../../types/content";
import exerciseStyles from "../lesson/Exercise.module.css";
import styles from "./ClozeCard.module.css";

interface ClozeCardProps {
  card: ClozeCardData;
  courseCode: string | null;
  /** The learner's render preferences and the course's hover-hint map. */
  session: Pick<ExerciseSession<unknown, unknown>, "keyboardMode" | "textSettings" | "courseHintMap">;
  /** Hardcore mode: no typo is forgiven. */
  hardcore: boolean;
  /** Called once, when the learner moves past the card. */
  onFinished: (result: ClozeResult) => void;
}

type Outcome = { correct: boolean; typed: string; typo: boolean; attempt: number };

/**
 * One fill-in-the-blank card (issue #87). The sentence has the word's English
 * where it belongs; the learner types the word with the same field and
 * keyboards a typed exercise has (TypeInExercise, handed the sentence as its
 * prompt). A wrong answer is tried again — each attempt pays less (domain/
 * cloze.ts's clozeXp) — until it is right or the learner shows the answer.
 * Key it by tag so a new card starts fresh.
 */
export function ClozeCard({ card, courseCode, session, hardcore, onFinished }: ClozeCardProps) {
  const { keyboardMode, textSettings, courseHintMap } = session;
  const [attempt, setAttempt] = useState(1);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const shownAt = useRef(0);
  // The clock starts when the card comes on screen.
  useEffect(() => {
    shownAt.current = performance.now();
  }, []);
  const wrapRef = useRef<HTMLDivElement>(null);

  // What the typed-exercise field needs to grade nothing itself: the accepted
  // spellings stand as its answer, for marking the typed word once answered.
  const exercise = useMemo<ExerciseArtifact>(
    () => ({ type: "type_in", scriptMode: "native", prompt: "", tiles: null, answer: card.accepted, tags: card.contextTags }),
    [card],
  );
  const hintMap = gateLexemeHintMap(courseHintMap, { settings: textSettings, exerciseScriptMode: "native" });

  // Continue takes focus once the card is answered, so Enter moves on.
  useEffect(() => {
    if (!outcome) return;
    const buttons = Array.from(wrapRef.current?.querySelectorAll("button") ?? []);
    buttons.find((button) => button.textContent === "Continue")?.focus();
  }, [outcome]);

  function submit(typed: string) {
    const grade = gradeCloze(typed, card.accepted, hardcore);
    if (grade !== "wrong") setOutcome({ correct: true, typed, typo: grade === "typo", attempt });
    else if (attempt >= MAX_CLOZE_ATTEMPTS) setOutcome({ correct: false, typed, typo: false, attempt });
    else setAttempt(attempt + 1);
  }

  function giveUp() {
    setOutcome({ correct: false, typed: "", typo: false, attempt });
  }

  const direction = displayDirection(card.before + card.blankText + card.after, textSettings.display);
  const answerShown = outcome !== null;
  const gapText = textSettings.vowelMarks ? card.blankText : stripReadingAids(card.blankText);

  const sentence = (
    <>
      <p className={`${exerciseStyles.prompt} ${styles.sentence}`} dir={direction}>
        <AnnotatedText text={card.before} hintMap={hintMap} settings={textSettings} tags={card.contextTags} />
        {answerShown ? (
          <span className={`${styles.gap} ${outcome.correct ? styles.gapRight : styles.gapWrong}`}>{gapText}</span>
        ) : (
          // The blank never offers its own hint: it is the answer.
          <span className={styles.gap} dir="ltr" aria-label={`Missing word: ${card.gapLabel}`}>
            {card.gapLabel}
          </span>
        )}
        <AnnotatedText text={card.after} hintMap={hintMap} settings={textSettings} tags={card.contextTags} />
      </p>
      <p className={styles.english}>{card.english}</p>
    </>
  );

  return (
    <div className={styles.wrap} ref={wrapRef}>
      {outcome ? (
        <p className={styles.status} role="status">
          {outcome.correct
            ? outcome.typo
              ? `Close, a small typo. It's spelled ${gapText}. `
              : "Correct! "
            : "Here's the word. "}
          {outcome.correct && outcome.attempt === 1 && "First try."}
        </p>
      ) : (
        <p className={styles.worth} role="status">
          {attemptWorth(attempt)}
        </p>
      )}
      <ExerciseRenderer
        // A new key per attempt starts the field empty again.
        key={outcome ? "answered" : `attempt-${attempt}`}
        exercise={exercise}
        renderType="type_in"
        onSubmit={submit}
        disabled={answerShown}
        courseCode={courseCode}
        keyboardMode={keyboardMode}
        hintMap={hintMap}
        textSettings={textSettings}
        promptSlot={sentence}
        reviewedAnswer={outcome ? { text: outcome.typed, correct: outcome.correct } : undefined}
        advance={
          outcome
            ? {
                label: "Continue",
                onAdvance: () =>
                  onFinished({ tag: card.tag, correct: outcome.correct, attempt: outcome.attempt, elapsedMs: Math.min(600000, Math.round(performance.now() - shownAt.current)) }),
              }
            : undefined
        }
      />
      {!outcome && attempt > 1 && (
        <Button variant="secondary" onClick={giveUp} className={styles.giveUp}>
          Show the answer
        </Button>
      )}
    </div>
  );
}
