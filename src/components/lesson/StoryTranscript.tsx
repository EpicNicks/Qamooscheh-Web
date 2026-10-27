// StoryPage's own screen, replacing the one-exercise-at-a-time layout
// ExerciseSessionScreen gives LessonPage/PracticePage with a scrollable
// transcript of the chapter so far: lines already answered sit above
// (collapsed to plain text, italicized and muted), and the line being worked
// on renders at full strength with its actual exercise widget. Lines still
// ahead render nothing at all — finishing the current line is what reveals
// the next one, rather than the whole chapter's shape being visible upfront.
import { useLayoutEffect, useRef } from "react";
import { ExerciseRenderer } from "./ExerciseRenderer";
import { SessionProgressBar } from "./SessionProgressBar";
import { AnswerFeedback } from "./AnswerFeedback";
import { ReportIssue } from "./ReportIssue";
import { revealedAnswers } from "../../domain/answerVariants";
import { AnnotatedText } from "./AnnotatedText";
import { SentenceRomanization } from "./SentenceRomanization";
import { SkipLessonModal } from "./SkipLessonModal";
import { CloseLessonButton } from "./CloseLessonButton";
import { LanguageSettingsButton } from "./languageSettings/LanguageSettingsButton";
import { displayDirection } from "../../domain/annotation";
import { gateLexemeHintMap } from "../../domain/romanization";
import { useNativeTextAlign } from "../../hooks/useNativeTextAlign";
import { useExerciseReportContext } from "../../hooks/useExerciseReportContext";
import type { ExerciseSession } from "../../hooks/useExerciseSession";
import type { WalkthroughExerciseInstance, WalkthroughAnswerResult } from "../../hooks/useSkillWalkthrough";
import { revealedTileOrder } from "../../domain/wordBankOrders";
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
  onSubmit: (submittedText: string, opts?: { usedHint?: boolean; playsUsed?: number }) => void;
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
  const { skip, confirmation, textSettings, courseHintMap, keyboardMode, autoplayAudio } = session;
  const transcriptRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const previousRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const { align: nativeTextAlign } = useNativeTextAlign();

  const hintMapFor = (exercise: ExerciseArtifact) =>
    gateLexemeHintMap(courseHintMap, { settings: textSettings, exerciseScriptMode: exercise.scriptMode });

  // The alignment setting only applies to RTL blocks (localAppPrefs.ts's
  // NativeTextAlign) — an LTR line keeps its natural browser default either
  // way. displayDirection, not detectScriptDirection: in "romanized" display
  // the rendered base line is Latin regardless of the source script.
  const alignStyleFor = (text: string) => (displayDirection(text, textSettings.display) === "rtl" ? { textAlign: nativeTextAlign } : undefined);

  const { answeredItem, feedback } = confirmation;
  const reportContext = useExerciseReportContext(answeredItem, feedback?.submittedText ?? null);
  // The line still being asked has nothing submitted to cite.
  const askingReportContext = useExerciseReportContext(answeredItem ? null : current, null);
  // Everything before this ordinal has been answered AND confirmed — the
  // reviewing line (if any) hasn't been confirmed yet, so it's excluded here
  // and rendered by its own branch below instead of as a collapsed past line.
  const historyCount = answeredItem ? answeredItem.ordinal : progress.completed;

  // As the chapter advances, the line being worked on sits at the top of the
  // transcript with only the most recent answered line above it; older lines
  // are a scroll up away. Early in a chapter there isn't enough content below
  // that line to scroll it to the top, so a spacer at the end supplies the
  // difference. It's resized whenever the active line changes height
  // (feedback appearing, an on-screen keyboard opening), without re-scrolling.
  useLayoutEffect(() => {
    const transcript = transcriptRef.current;
    const active = activeRef.current;
    const spacer = spacerRef.current;
    if (!transcript || !active || !spacer) return;
    const anchor = previousRef.current ?? active;
    const paddingTop = parseFloat(getComputedStyle(transcript).paddingTop) || 0;
    // offsetTop is relative to .transcript (position: relative).
    const anchorTop = () => anchor.offsetTop - paddingTop;
    const fitSpacer = () => {
      const contentBelowAnchor = active.offsetTop + active.offsetHeight - anchor.offsetTop;
      spacer.style.height = `${Math.max(0, transcript.clientHeight - contentBelowAnchor - paddingTop)}px`;
    };
    fitSpacer();
    transcript.scrollTo({ top: anchorTop(), behavior: "smooth" });
    const observer = new ResizeObserver(fitSpacer);
    observer.observe(active);
    observer.observe(transcript);
    return () => observer.disconnect();
  }, [current?.key, answeredItem?.key]);

  return (
    <div className={styles.wrap}>
      <div className={styles.topRow}>
        <SessionProgressBar completed={progress.completed} total={progress.total} />
        <LanguageSettingsButton courseCode={courseCode} />
        <CloseLessonButton isConfirming={skip.isConfirming} onClick={skip.requestSkip} />
      </div>
      {title && <h1 className={styles.chapterTitle}>{title}</h1>}

      <div className={styles.transcript} ref={transcriptRef}>
        {instances.map((instance) => {
          if (instance.ordinal < historyCount) {
            const result = resultsByOrdinal.get(instance.ordinal);
            const hintMap = hintMapFor(instance.exercise);
            // Same tokenized-vs-alternatives join AnswerFeedback uses: a
            // word_bank/match answer is one ordered set of tokens (the correct
            // order closest to what was submitted, when it has several),
            // every other type's `answer` is a list of interchangeable whole
            // answers to show side by side.
            const answerIsTokenized = instance.exercise.type === "word_bank" || instance.exercise.type === "match";
            const answerText = answerIsTokenized
              ? revealedTileOrder(instance.exercise, result?.submittedText).join(" ")
              : instance.exercise.answer.join(" / ");
            return (
              <div key={instance.key} className={styles.pastLine} ref={instance.ordinal === historyCount - 1 ? previousRef : undefined}>
                {/* A fixed-position gutter, outside the dir="rtl" text below —
                    inline placement inside RTL text gets reordered to the
                    visual right along with the words, which defeats the
                    point of a scannable correct/incorrect marker. */}
                <div className={styles.pastLineRow}>
                  <div className={result?.correct ? styles.correctMark : styles.incorrectMark} aria-hidden="true">
                    {result && (result.correct ? "✓" : "✗")}
                  </div>
                  <div className={styles.pastLineBody}>
                    <SentenceRomanization
                      text={instance.exercise.prompt}
                      authored={instance.exercise.promptRomanization}
                      hintMap={hintMap}
                      settings={textSettings}
                      tags={instance.exercise.tags}
                    />
                    <p
                      className={styles.pastPrompt}
                      dir={displayDirection(instance.exercise.prompt, textSettings.display)}
                      style={alignStyleFor(instance.exercise.prompt)}
                    >
                      <AnnotatedText text={instance.exercise.prompt} hintMap={hintMap} settings={textSettings} tags={instance.exercise.tags} />
                    </p>
                    {answerText && (
                      <p
                        className={styles.pastCorrectAnswer}
                        dir={displayDirection(answerText, textSettings.display)}
                        style={alignStyleFor(answerText)}
                      >
                        <AnnotatedText text={answerText} hintMap={hintMap} settings={textSettings} tags={instance.exercise.tags} />
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
            const answerIsTokenized = answeredItem.exercise.type === "word_bank" || answeredItem.exercise.type === "match";
            return (
              <div key={instance.key} className={styles.activeLine} ref={activeRef}>
                <AnswerFeedback
                  key={confirmation.submissionCount}
                  correct={feedback.correct}
                  note={feedback.note}
                  answer={revealedAnswers(answeredItem.exercise, feedback.submittedText)}
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
                <ExerciseRenderer
                  exercise={answeredItem.exercise}
                  renderType={answeredItem.renderType}
                  onSubmit={() => {}}
                  disabled
                  courseCode={courseCode}
                  keyboardMode={keyboardMode}
                  autoplayAudio={autoplayAudio}
                  hintMap={hintMap}
                  textSettings={textSettings}
                  advance={{ label: "Continue", onAdvance: confirmation.confirm }}
                  reviewedAnswer={{ text: feedback.submittedText, correct: feedback.correct, separators: feedback.separators }}
                />
              </div>
            );
          }

          if (!answeredItem && current && instance.ordinal === current.ordinal) {
            return (
              <div key={instance.key} className={styles.activeLine} ref={activeRef}>
                {askingReportContext && <ReportIssue key={current.key} context={askingReportContext} stage="unanswered" />}
                <ExerciseRenderer
                  exercise={current.exercise}
                  renderType={current.renderType}
                  onSubmit={onSubmit}
                  disabled={skip.isConfirming}
                  courseCode={courseCode}
                  keyboardMode={keyboardMode}
                  autoplayAudio={autoplayAudio}
                  hintMap={hintMapFor(current.exercise)}
                  textSettings={textSettings}
                />
              </div>
            );
          }

          // Not yet reached — stays unrendered so finishing the current line
          // is what reveals it, rather than the rest of the chapter already
          // being visible below.
          return null;
        })}
        <div ref={spacerRef} className={styles.spacer} aria-hidden="true" />
      </div>

      {skip.isConfirming && <SkipLessonModal onCancel={skip.cancelSkip} onConfirm={skip.confirmSkip} />}
    </div>
  );
}
