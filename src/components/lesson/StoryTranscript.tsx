// StoryPage's own screen, replacing the one-exercise-at-a-time layout
// ExerciseSessionScreen gives LessonPage/PracticePage with a scrollable
// transcript of the chapter so far: lines already answered sit above
// (collapsed to plain text, italicized and muted), and the line being worked
// on renders at full strength with its actual exercise widget. Lines still
// ahead render nothing at all — finishing the current line is what reveals
// the next one, rather than the whole chapter's shape being visible upfront.
import { useEffect, useRef } from "react";
import { ExerciseRenderer } from "./ExerciseRenderer";
import { SessionProgressBar } from "./SessionProgressBar";
import { AnswerFeedback } from "./AnswerFeedback";
import { RomanizedText } from "./RomanizedText";
import { SkipLessonModal } from "./SkipLessonModal";
import { CloseLessonButton } from "./CloseLessonButton";
import { LanguageSettingsButton } from "./languageSettings/LanguageSettingsButton";
import { detectScriptDirection } from "../../domain/language";
import { gateLexemeHintMap } from "../../domain/romanization";
import { useNativeTextAlign } from "../../hooks/useNativeTextAlign";
import type { ExerciseSession } from "../../hooks/useExerciseSession";
import type { WalkthroughExerciseInstance, WalkthroughAnswerResult } from "../../hooks/useSkillWalkthrough";
import type { ExerciseArtifact } from "../../types/content";
import styles from "./StoryTranscript.module.css";

interface StoryTranscriptProps {
  session: ExerciseSession<WalkthroughExerciseInstance, WalkthroughAnswerResult>;
  courseCode: string | null;
  progress: { completed: number; total: number };
  /** The exercise to ask next, or null once every line has been answered — the last line's review still renders from `confirmation`'s own snapshot even then. */
  current: WalkthroughExerciseInstance | null;
  /** Every line in the chapter, authored order — read alongside `current`/`confirmation` to decide each line's role (past/active/not-yet-reached, the last of which renders nothing). */
  instances: WalkthroughExerciseInstance[];
  /** This chapter's answers so far, keyed by ordinal — populated by the page at submit time, independent of `confirmation`'s single-item snapshot, so lines already confirmed can still show what was answered. */
  resultsByOrdinal: ReadonlyMap<number, WalkthroughAnswerResult>;
  title?: string | null;
  onSubmit: (submittedText: string, opts?: { usedHint?: boolean }) => void;
}

export function StoryTranscript({
  session,
  courseCode,
  progress,
  current,
  instances,
  resultsByOrdinal,
  title,
  onSubmit,
}: StoryTranscriptProps) {
  const { skip, confirmation, hintSettings, courseHintMap, keyboardMode, autoplayAudio } = session;
  const activeRef = useRef<HTMLDivElement>(null);
  const { align: nativeTextAlign } = useNativeTextAlign();

  const hintMapFor = (exercise: ExerciseArtifact) =>
    gateLexemeHintMap(courseHintMap, { settings: hintSettings, exerciseScriptMode: exercise.scriptMode });

  // The alignment setting only applies to RTL blocks (localAppPrefs.ts's
  // NativeTextAlign) — an LTR line keeps its natural browser default either
  // way.
  const alignStyleFor = (text: string) => (detectScriptDirection(text) === "rtl" ? { textAlign: nativeTextAlign } : undefined);

  const { answeredItem, feedback } = confirmation;
  // Everything before this ordinal has been answered AND confirmed — the
  // reviewing line (if any) hasn't been confirmed yet, so it's excluded here
  // and rendered by its own branch below instead of as a collapsed past line.
  const historyCount = answeredItem ? answeredItem.ordinal : progress.completed;

  // Keeps the line actually being worked on in view as the chapter advances —
  // a story reads top-to-bottom, so the natural place to land is centered
  // rather than snapped to an edge.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [current?.key, answeredItem?.key]);

  return (
    <div className={styles.wrap}>
      <div className={styles.topRow}>
        <SessionProgressBar completed={progress.completed} total={progress.total} />
        <LanguageSettingsButton courseCode={courseCode} />
        <CloseLessonButton isConfirming={skip.isConfirming} onClick={skip.requestSkip} />
      </div>
      {title && <h1 className={styles.chapterTitle}>{title}</h1>}

      <div className={styles.transcript}>
        {instances.map((instance) => {
          if (instance.ordinal < historyCount) {
            const result = resultsByOrdinal.get(instance.ordinal);
            const hintMap = hintMapFor(instance.exercise);
            // Same tokenized-vs-alternatives join AnswerFeedback uses: a
            // word_bank/match answer is one ordered set of tokens, every
            // other type's `answer` is a list of interchangeable whole
            // answers to show side by side.
            const answerIsTokenized = instance.exercise.type === "word_bank" || instance.exercise.type === "match";
            const answerText = instance.exercise.answer.join(answerIsTokenized ? " " : " / ");
            return (
              <div key={instance.key} className={styles.pastLine}>
                {/* A fixed-position gutter, outside the dir="rtl" text below —
                    inline placement inside RTL text gets reordered to the
                    visual right along with the words, which defeats the
                    point of a scannable correct/incorrect marker. */}
                <div className={styles.pastLineRow}>
                  <div className={result?.correct ? styles.correctMark : styles.incorrectMark} aria-hidden="true">
                    {result && (result.correct ? "✓" : "✗")}
                  </div>
                  <div className={styles.pastLineBody}>
                    <p
                      className={styles.pastPrompt}
                      dir={detectScriptDirection(instance.exercise.prompt)}
                      style={alignStyleFor(instance.exercise.prompt)}
                    >
                      <RomanizedText text={instance.exercise.prompt} hintMap={hintMap} settings={hintSettings} />
                    </p>
                    {answerText && (
                      <p className={styles.pastCorrectAnswer} dir={detectScriptDirection(answerText)} style={alignStyleFor(answerText)}>
                        <RomanizedText text={answerText} hintMap={hintMap} settings={hintSettings} />
                      </p>
                    )}
                    {result && !result.correct && (
                      <p className={styles.pastAnswer}>You answered: {result.submittedText || "(nothing submitted)"}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          if (answeredItem && feedback && instance.ordinal === answeredItem.ordinal) {
            const hintMap = hintMapFor(answeredItem.exercise);
            return (
              <div key={instance.key} className={styles.activeLine} ref={activeRef}>
                <AnswerFeedback
                  key={confirmation.submissionCount}
                  correct={feedback.correct}
                  note={feedback.note}
                  answer={answeredItem.exercise.answer}
                  answerIsTokenized={answeredItem.exercise.type === "word_bank" || answeredItem.exercise.type === "match"}
                  submittedText={feedback.submittedText}
                  hintMap={hintMap}
                  hintSettings={hintSettings}
                  reportContext={{ exerciseTags: answeredItem.exercise.tags, prompt: answeredItem.exercise.prompt }}
                />
                <ExerciseRenderer
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
              </div>
            );
          }

          if (!answeredItem && current && instance.ordinal === current.ordinal) {
            return (
              <div key={instance.key} className={styles.activeLine} ref={activeRef}>
                <ExerciseRenderer
                  exercise={current.exercise}
                  renderType={current.renderType}
                  onSubmit={onSubmit}
                  disabled={skip.isConfirming}
                  courseCode={courseCode}
                  keyboardMode={keyboardMode}
                  autoplayAudio={autoplayAudio}
                  hintMap={hintMapFor(current.exercise)}
                  hintSettings={hintSettings}
                />
              </div>
            );
          }

          // Not yet reached — stays unrendered so finishing the current line
          // is what reveals it, rather than the rest of the chapter already
          // being visible below.
          return null;
        })}
      </div>

      {skip.isConfirming && <SkipLessonModal onCancel={skip.cancelSkip} onConfirm={skip.confirmSkip} />}
    </div>
  );
}
