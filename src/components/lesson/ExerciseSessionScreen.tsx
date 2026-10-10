// The screen a learner is actually looking at while working through a queue
// of exercises, in both of its states:
//
//   * asking — top row, the exercise, the skip modal if it's been requested;
//   * reviewing — the same top row, this answer's feedback, and the answered
//     exercise still on screen (disabled, its submit control replaced by
//     "Continue") until the learner confirms.
//
// LessonPage, StoryPage and PracticePage all render exactly this; what differs
// between them is which engine feeds it and what surrounds it (the
// nothing-due/complete screens each page keeps to itself), not the screen. The
// three genuinely per-mode pieces inside it are props: an optional chapter
// title, the cosmetic XP burst (lessons only — see domain/xp.ts), and the
// first-lesson tutorial spotlight (lessons only).
import { useState, type ReactNode } from "react";
import { ExerciseRenderer } from "./ExerciseRenderer";
import { SessionProgressBar } from "./SessionProgressBar";
import { AnswerFeedback } from "./AnswerFeedback";
import { closestAnswerFirst } from "../../domain/answerFeedback";
import { needsRetype, retypeMatches } from "../../domain/retype";
import { SaveWordsRow } from "../vocabulary/SaveWordsRow";
import { SkipLessonModal } from "./SkipLessonModal";
import { CloseLessonButton } from "./CloseLessonButton";
import { LanguageSettingsButton } from "./languageSettings/LanguageSettingsButton";
import { gateLexemeHintMap } from "../../domain/romanization";
import { useAnswerAudio } from "../../hooks/useAnswerAudio";
import { useExerciseReportContext } from "../../hooks/useExerciseReportContext";
import { ExerciseVoiceScope } from "../../hooks/exerciseVoiceScope";
import type { ExerciseSession } from "../../hooks/useExerciseSession";
import type { ExerciseType } from "../../domain/enums";
import { revealedTileOrder } from "../../domain/wordBankOrders";
import type { ExerciseArtifact } from "../../types/content";
import styles from "./ExerciseSessionScreen.module.css";

/** The part of an engine's queue item this screen reads — satisfied by both useLessonEngine's LessonExerciseInstance and useSkillWalkthrough's WalkthroughExerciseInstance. */
export interface ExerciseSessionItem {
  key: string;
  exercise: ExerciseArtifact;
  renderType: ExerciseType;
  /** Where the exercise came from, when the engine knows — cited by the Report control (domain/exerciseReport.ts). */
  unitKey?: string | null;
  skillKey?: string;
  ordinal?: number;
}

/** The part of an engine's answer result this screen reads — everything else on it (verdict/attempt/requeued) is the page's business. */
export interface ExerciseSessionFeedback {
  correct: boolean;
  note: string | null;
  /** What was actually graded — shown on the revealed-answer feedback as "Your answer" so a learner can see exactly what the grader received. */
  submittedText: string;
}

interface ExerciseSessionScreenProps<TItem extends ExerciseSessionItem, TFeedback extends ExerciseSessionFeedback> {
  session: ExerciseSession<TItem, TFeedback>;
  courseCode: string | null;
  progress: { completed: number; total: number };
  /**
   * The exercise to ask next, or null once the queue has run out. Null is not
   * the end of the story: the last answer's review still renders, from the
   * confirmation's own snapshot, and only after that does the page take over
   * with its completion screen.
   */
  current: TItem | null;
  onSubmit: (submittedText: string, opts?: { usedHint?: boolean }) => void;
  /** Shown under the top row in both states — the chapter/lesson title Story and Practice have. A lesson is planned across skills and has no single title, so it passes none. */
  title?: string | null;
  /** Cosmetic per-answer XP for the review screen's burst (domain/xp.ts). Omitted — by Story and Practice — renders no burst at all. */
  feedbackXp?: (feedback: TFeedback) => number;
  /**
   * The first-lesson tutorial spotlight, rendered only while asking (never
   * over a review) and handed the DOM nodes it points at. A render prop rather
   * than a `showTutorial` flag because those nodes are this component's own
   * internals: only a caller that actually wants the overlay makes this
   * component capture them, and only then does the exercise pick up the extra
   * wrapper element the overlay needs to query inside.
   */
  overlay?: (targets: { item: TItem; topRowEl: HTMLElement | null; exerciseEl: HTMLElement | null }) => ReactNode;
  /** Lessons only — lets the learner re-open the first-lesson walkthrough from the lesson-settings cog. */
  onReplayTutorial?: () => void;
}

export function ExerciseSessionScreen<TItem extends ExerciseSessionItem, TFeedback extends ExerciseSessionFeedback>({
  session,
  courseCode,
  progress,
  current,
  onSubmit,
  title,
  feedbackXp,
  overlay,
  onReplayTutorial,
}: ExerciseSessionScreenProps<TItem, TFeedback>) {
  const { skip, confirmation, textSettings, courseHintMap, keyboardMode, autoplayAudio } = session;
  const [topRowEl, setTopRowEl] = useState<HTMLDivElement | null>(null);
  const [exerciseEl, setExerciseEl] = useState<HTMLDivElement | null>(null);
  // Says the correct answer when its review comes up (localAppPrefs.speakAnswers).
  const answerAudio = useAnswerAudio(
    confirmation.answeredItem?.exercise ?? null,
    courseCode,
    confirmation.submissionCount,
    confirmation.answeredItem?.renderType ?? null,
    confirmation.feedback?.correct ?? false,
    confirmation.feedback?.submittedText,
  );
  const reportContext = useExerciseReportContext(confirmation.answeredItem, confirmation.feedback?.submittedText ?? null);

  /** Whether this exercise has any native-script text worth hovering — see gateLexemeHintMap's own conditions. */
  const hintMapFor = (exercise: ExerciseArtifact) =>
    gateLexemeHintMap(courseHintMap, {
      settings: textSettings,
      exerciseScriptMode: exercise.scriptMode,
    });

  const topRow = (ref?: (el: HTMLDivElement | null) => void) => (
    <div ref={ref} className={styles.topRow}>
      <SessionProgressBar completed={progress.completed} total={progress.total} />
      <LanguageSettingsButton courseCode={courseCode} onReplayTutorial={onReplayTutorial} />
      <CloseLessonButton isConfirming={skip.isConfirming} onClick={skip.requestSkip} />
    </div>
  );

  const skipModal = skip.isConfirming && <SkipLessonModal onCancel={skip.cancelSkip} onConfirm={skip.confirmSkip} />;

  const { answeredItem, feedback } = confirmation;
  if (answeredItem && feedback) {
    const hintMap = hintMapFor(answeredItem.exercise);
    const answerIsTokenized = answeredItem.exercise.type === "word_bank" || answeredItem.exercise.type === "match";
    // A wrong typed answer is retyped correctly once more before moving on
    // (issue #44) — practice only: the answer was already graded and
    // recorded, and the retype goes nowhere but domain/retype.ts.
    const retyping = needsRetype(answeredItem.renderType, feedback.correct);
    return (
      <div className={styles.wrap}>
        {topRow()}
        {title && <h1 className={styles.chapterTitle}>{title}</h1>}
        {/* The answer's words, hovered, are heard in the question's voice too. */}
        <ExerciseVoiceScope.Provider value={answeredItem.exercise}>
          <AnswerFeedback
            key={confirmation.submissionCount}
            correct={feedback.correct}
            answerAudio={answerAudio}
            note={feedback.note}
            xp={feedbackXp?.(feedback)}
            answer={
              answerIsTokenized
                ? revealedTileOrder(answeredItem.exercise, feedback.submittedText)
                : closestAnswerFirst(feedback.submittedText, answeredItem.exercise.answer)
            }
            answerIsTokenized={answerIsTokenized}
            // A type-in or word-bank answer stays visible in the (red/green)
            // exercise below, so the feedback box shows only the correct answer.
            submittedText={answeredItem.renderType === "type_in" || answeredItem.renderType === "word_bank" ? undefined : feedback.submittedText}
            hintMap={hintMap}
            textSettings={textSettings}
            answerRomanization={{
              text: answerIsTokenized ? answeredItem.exercise.answer.join(" ") : answeredItem.exercise.answer[0],
              romanization: answeredItem.exercise.answerRomanization,
            }}
            tags={answeredItem.exercise.tags}
            reportContext={reportContext}
          />
        </ExerciseVoiceScope.Provider>
        <SaveWordsRow tags={answeredItem.exercise.tags} />
        <ExerciseRenderer
          key={answeredItem.key}
          exercise={answeredItem.exercise}
          renderType={answeredItem.renderType}
          onSubmit={() => {}}
          // A retype takes typing, so it stays enabled — but, as while asking,
          // not under the Skip modal.
          disabled={retyping ? skip.isConfirming : true}
          courseCode={courseCode}
          keyboardMode={keyboardMode}
          autoplayAudio={autoplayAudio}
          hintMap={hintMap}
          textSettings={textSettings}
          advance={{ label: "Continue", onAdvance: confirmation.confirm }}
          reviewedAnswer={{ text: feedback.submittedText, correct: feedback.correct }}
          retype={
            retyping
              ? { matches: (text) => retypeMatches(courseCode, answeredItem.exercise, text), onContinue: confirmation.confirm }
              : undefined
          }
        />
        {skipModal}
      </div>
    );
  }

  if (!current) return null;

  const exercise = (
    <ExerciseRenderer
      key={current.key}
      exercise={current.exercise}
      renderType={current.renderType}
      onSubmit={onSubmit}
      // Suspends TypeInExercise's window-level keydown handling while the
      // Skip modal is open — it has its own document-level keydown
      // listener (Escape/Tab), and both firing for the same keystroke
      // would type into the hidden answer at the same time.
      disabled={skip.isConfirming}
      courseCode={courseCode}
      keyboardMode={keyboardMode}
      autoplayAudio={autoplayAudio}
      hintMap={hintMapFor(current.exercise)}
      textSettings={textSettings}
    />
  );

  return (
    <div className={styles.wrap}>
      {topRow(overlay ? setTopRowEl : undefined)}
      {title && <h1 className={styles.chapterTitle}>{title}</h1>}
      {overlay ? <div ref={setExerciseEl}>{exercise}</div> : exercise}
      {overlay?.({ item: current, topRowEl, exerciseEl })}
      {skipModal}
    </div>
  );
}
