import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLessonEngine, type SubmitAnswerResult, type LessonExerciseInstance } from "../hooks/useLessonEngine";
import { useBootstrap } from "../hooks/useBootstrap";
import { usePrefs } from "../hooks/usePrefs";
import { useLexemeIndex } from "../hooks/useCourseContent";
import { useSkipConfirmation } from "../hooks/useSkipConfirmation";
import { xpForAnswer } from "../domain/xp";
import { ExerciseRenderer } from "../components/lesson/ExerciseRenderer";
import { SessionProgressBar } from "../components/lesson/SessionProgressBar";
import { AnswerFeedback } from "../components/lesson/AnswerFeedback";
import { VocabularyPanel } from "../components/lesson/VocabularyPanel";
import { SkipLessonModal } from "../components/lesson/SkipLessonModal";
import { LessonResults } from "../components/lesson/LessonResults";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { Button } from "../components/common/Button";
import styles from "./LessonPage.module.css";

export function LessonPage() {
  const navigate = useNavigate();
  const engine = useLessonEngine();
  const bootstrap = useBootstrap();
  const prefs = usePrefs();
  const lexemeIndex = useLexemeIndex(bootstrap.data?.course ?? null);
  const skip = useSkipConfirmation();

  const [feedback, setFeedback] = useState<SubmitAnswerResult | null>(null);
  const [lastUsedHint, setLastUsedHint] = useState(false);
  // Bumped on every submission so AnswerFeedback remounts and its
  // shake/XP-pop animations replay instead of only firing once.
  const [submissionCount, setSubmissionCount] = useState(0);
  // The exercise that was just answered, snapshotted at submit time — the
  // engine's queue has already advanced past it by then (submitAnswer both
  // records the attempt and moves the cursor in one call), but the learner
  // still needs to see IT plus the feedback until they explicitly continue,
  // not whatever comes next.
  const [answeredExercise, setAnsweredExercise] = useState<LessonExerciseInstance | null>(null);

  // While awaiting confirmation, Enter presses the Continue button — the
  // exercise itself is disabled (unfocusable) at this point, so this has to
  // be a window-level listener rather than relying on some element's own
  // onKeyDown to still be reachable.
  useEffect(() => {
    if (!(answeredExercise && feedback) || skip.isConfirming) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Enter") {
        event.preventDefault();
        setAnsweredExercise(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [answeredExercise, feedback, skip.isConfirming]);

  if (engine.status === "loading") {
    return <Spinner label="Preparing your lesson…" />;
  }

  if (engine.status === "error") {
    return <ErrorBanner message="Couldn't load your next lesson." />;
  }

  if (engine.status === "empty") {
    return (
      <div className={styles.done}>
        <h1>Nothing due right now</h1>
        <p>
          Nothing's scheduled for review, but that doesn't mean you can't go through it again — practice rounds just
          don't count toward your review schedule.
        </p>
        <div className={styles.doneActions}>
          <Button variant="secondary" onClick={() => navigate("/path")}>
            Back to path
          </Button>
          <Button onClick={engine.startPractice}>Practice anyway</Button>
        </div>
      </div>
    );
  }

  // Checked BEFORE "submitting"/"done": submitAnswer() already kicked off
  // the session submission the instant the last exercise was answered, but
  // the learner still needs to confirm it before landing on the results
  // screen — the engine finishing in the background doesn't get to skip that.
  if (answeredExercise && feedback) {
    return (
      <div className={styles.wrap}>
        <div className={styles.topRow}>
          <SessionProgressBar completed={engine.progress.completed} total={engine.progress.total} />
          <Button variant="secondary" className={styles.skip} onClick={skip.requestSkip}>
            Skip
          </Button>
        </div>
        <AnswerFeedback
          key={submissionCount}
          correct={feedback.correct}
          note={feedback.note}
          xp={xpForAnswer(feedback.verdict, feedback.attempt, lastUsedHint)}
        />
        <ExerciseRenderer
          key={answeredExercise.key}
          exercise={answeredExercise.exercise}
          renderType={answeredExercise.renderType}
          onSubmit={() => {}}
          disabled
          courseCode={engine.courseCode}
          keyboardMode={prefs.data?.keyboardMode}
          advance={{ label: "Continue", onAdvance: () => setAnsweredExercise(null) }}
        />
        <VocabularyPanel
          tags={answeredExercise.exercise.tags}
          lexemeIndex={lexemeIndex.data}
          courseCode={engine.courseCode}
          scriptMode={prefs.data?.scriptMode ?? "native"}
        />
        {skip.isConfirming && <SkipLessonModal onCancel={skip.cancelSkip} onConfirm={skip.confirmSkip} />}
      </div>
    );
  }

  if (engine.status === "submitting") {
    return <Spinner label="Saving your progress…" />;
  }

  if (engine.status === "done") {
    return (
      <div className={styles.done}>
        <h1>Lesson complete!</h1>
        {engine.isPracticeMode && <p className={styles.practiceNote}>Practice round — doesn't count toward your review schedule.</p>}
        {engine.result && engine.result.outcome === "AlreadyProcessed" && <p>Already recorded.</p>}
        <LessonResults correct={engine.score.correct} total={engine.score.total} />
        <div className={styles.doneActions}>
          <Button onClick={() => navigate("/path")}>Back to path</Button>
          <Button variant="secondary" onClick={engine.startPractice}>
            Practice again
          </Button>
        </div>
      </div>
    );
  }

  if (!engine.current) return null;

  async function handleSubmit(text: string, opts?: { usedHint?: boolean }) {
    const answered = engine.current; // snapshot before submitAnswer advances the queue
    const result = await engine.submitAnswer(text, opts);
    setFeedback(result);
    setLastUsedHint(opts?.usedHint ?? false);
    setSubmissionCount((n) => n + 1);
    setAnsweredExercise(answered);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.topRow}>
        <SessionProgressBar completed={engine.progress.completed} total={engine.progress.total} />
        <Button variant="secondary" className={styles.skip} onClick={skip.requestSkip}>
          Skip
        </Button>
      </div>
      <ExerciseRenderer
        key={engine.current.key}
        exercise={engine.current.exercise}
        renderType={engine.current.renderType}
        onSubmit={handleSubmit}
        // Suspends TypeInExercise's window-level keydown handling while the
        // Skip modal is open — it has its own document-level keydown
        // listener (Escape/Tab), and both firing for the same keystroke
        // would type into the hidden answer at the same time.
        disabled={skip.isConfirming}
        courseCode={engine.courseCode}
        keyboardMode={prefs.data?.keyboardMode}
      />
      <VocabularyPanel
        tags={engine.current.exercise.tags}
        lexemeIndex={lexemeIndex.data}
        courseCode={engine.courseCode}
        scriptMode={prefs.data?.scriptMode ?? "native"}
      />

      {skip.isConfirming && <SkipLessonModal onCancel={skip.cancelSkip} onConfirm={skip.confirmSkip} />}
    </div>
  );
}
