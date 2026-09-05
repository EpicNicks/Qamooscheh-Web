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
import { SkipLessonModal } from "./SkipLessonModal";
import { CloseLessonButton } from "./CloseLessonButton";
import { LanguageSettingsButton } from "./languageSettings/LanguageSettingsButton";
import { gateLexemeHintMap } from "../../domain/romanization";
import type { ExerciseSession } from "../../hooks/useExerciseSession";
import type { ExerciseType } from "../../domain/enums";
import type { ExerciseArtifact } from "../../types/content";
import styles from "./ExerciseSessionScreen.module.css";

/** The part of an engine's queue item this screen reads — satisfied by both useLessonEngine's LessonExerciseInstance and useSkillWalkthrough's WalkthroughExerciseInstance. */
export interface ExerciseSessionItem {
  key: string;
  exercise: ExerciseArtifact;
  renderType: ExerciseType;
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
}: ExerciseSessionScreenProps<TItem, TFeedback>) {
  const { skip, confirmation, hintSettings, courseHintMap, keyboardMode, autoplayAudio } = session;
  const [topRowEl, setTopRowEl] = useState<HTMLDivElement | null>(null);
  const [exerciseEl, setExerciseEl] = useState<HTMLDivElement | null>(null);

  /** Whether this exercise has any native-script text worth hovering — see gateLexemeHintMap's own conditions. */
  const hintMapFor = (exercise: ExerciseArtifact) =>
    gateLexemeHintMap(courseHintMap, {
      settings: hintSettings,
      exerciseScriptMode: exercise.scriptMode,
    });

  const topRow = (ref?: (el: HTMLDivElement | null) => void) => (
    <div ref={ref} className={styles.topRow}>
      <SessionProgressBar completed={progress.completed} total={progress.total} />
      <LanguageSettingsButton courseCode={courseCode} />
      <CloseLessonButton isConfirming={skip.isConfirming} onClick={skip.requestSkip} />
    </div>
  );

  const skipModal = skip.isConfirming && <SkipLessonModal onCancel={skip.cancelSkip} onConfirm={skip.confirmSkip} />;

  const { answeredItem, feedback } = confirmation;
  if (answeredItem && feedback) {
    const hintMap = hintMapFor(answeredItem.exercise);
    return (
      <div className={styles.wrap}>
        {topRow()}
        {title && <h1 className={styles.chapterTitle}>{title}</h1>}
        <AnswerFeedback
          key={confirmation.submissionCount}
          correct={feedback.correct}
          note={feedback.note}
          xp={feedbackXp?.(feedback)}
          answer={answeredItem.exercise.answer}
          answerIsTokenized={answeredItem.exercise.type === "word_bank" || answeredItem.exercise.type === "match"}
          submittedText={feedback.submittedText}
          hintMap={hintMap}
          hintSettings={hintSettings}
          reportContext={{ exerciseTags: answeredItem.exercise.tags, prompt: answeredItem.exercise.prompt }}
        />
        <ExerciseRenderer
          key={answeredItem.key}
          exercise={answeredItem.exercise}
          renderType={answeredItem.renderType}
          onSubmit={() => {}}
          disabled
          courseCode={courseCode}
          keyboardMode={keyboardMode}
          autoplayAudio={autoplayAudio}
          hintMap={hintMap}
          hintSettings={hintSettings}
          advance={{ label: "Continue", onAdvance: confirmation.confirm }}
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
      hintSettings={hintSettings}
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
