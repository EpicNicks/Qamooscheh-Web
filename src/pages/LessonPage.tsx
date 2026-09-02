import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLessonEngine, type SubmitAnswerResult, type LessonExerciseInstance } from "../hooks/useLessonEngine";
import { usePrefs } from "../hooks/usePrefs";
import { useSkipConfirmation } from "../hooks/useSkipConfirmation";
import { useAnswerConfirmation } from "../hooks/useAnswerConfirmation";
import { xpForAnswer } from "../domain/xp";
import { ExerciseRenderer } from "../components/lesson/ExerciseRenderer";
import { SessionProgressBar } from "../components/lesson/SessionProgressBar";
import { AnswerFeedback } from "../components/lesson/AnswerFeedback";
import { SkipLessonModal } from "../components/lesson/SkipLessonModal";
import { CloseLessonButton } from "../components/lesson/CloseLessonButton";
import { LanguageSettingsButton } from "../components/lesson/languageSettings/LanguageSettingsButton";
import { RealLessonOverlay } from "../components/tutorial/RealLessonOverlay";
import { LessonResults } from "../components/lesson/LessonResults";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { Button } from "../components/common/Button";
import styles from "./LessonPage.module.css";

export function LessonPage() {
  const navigate = useNavigate();
  const engine = useLessonEngine();
  const prefs = usePrefs();
  const skip = useSkipConfirmation();
  const [topRowEl, setTopRowEl] = useState<HTMLDivElement | null>(null);
  const [exerciseEl, setExerciseEl] = useState<HTMLDivElement | null>(null);
  const [lastUsedHint, setLastUsedHint] = useState(false);
  const confirmation = useAnswerConfirmation<LessonExerciseInstance, SubmitAnswerResult>(skip.isConfirming);

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
  if (confirmation.answeredItem && confirmation.feedback) {
    const { answeredItem, feedback } = confirmation;
    return (
      <div className={styles.wrap}>
        <div className={styles.topRow}>
          <SessionProgressBar completed={engine.progress.completed} total={engine.progress.total} />
          <LanguageSettingsButton courseCode={engine.courseCode} />
          <CloseLessonButton isConfirming={skip.isConfirming} onClick={skip.requestSkip} />
        </div>
        <AnswerFeedback
          key={confirmation.submissionCount}
          correct={feedback.correct}
          note={feedback.note}
          xp={xpForAnswer(feedback.verdict, feedback.attempt, lastUsedHint)}
        />
        <ExerciseRenderer
          key={answeredItem.key}
          exercise={answeredItem.exercise}
          renderType={answeredItem.renderType}
          onSubmit={() => {}}
          disabled
          courseCode={engine.courseCode}
          keyboardMode={prefs.data?.keyboardMode}
          autoplayAudio={prefs.data?.autoplayAudio}
          advance={{ label: "Continue", onAdvance: confirmation.confirm }}
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
    if (!answered) return;
    const result = await engine.submitAnswer(text, opts);
    setLastUsedHint(opts?.usedHint ?? false);
    confirmation.record(answered, result);
  }

  return (
    <div className={styles.wrap}>
      <div ref={setTopRowEl} className={styles.topRow}>
        <SessionProgressBar completed={engine.progress.completed} total={engine.progress.total} />
        <LanguageSettingsButton courseCode={engine.courseCode} />
        <CloseLessonButton isConfirming={skip.isConfirming} onClick={skip.requestSkip} />
      </div>
      <div ref={setExerciseEl}>
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
          autoplayAudio={prefs.data?.autoplayAudio}
        />
      </div>
      <RealLessonOverlay topRowEl={topRowEl} exerciseEl={exerciseEl} renderType={engine.current.renderType} />
      {skip.isConfirming && <SkipLessonModal onCancel={skip.cancelSkip} onConfirm={skip.confirmSkip} />}
    </div>
  );
}
