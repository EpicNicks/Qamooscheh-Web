import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLessonEngine, type SubmitAnswerResult, type LessonExerciseInstance } from "../hooks/useLessonEngine";
import { useExerciseSession } from "../hooks/useExerciseSession";
import { xpForAnswer } from "../domain/xp";
import { ExerciseSessionScreen } from "../components/lesson/ExerciseSessionScreen";
import { RealLessonOverlay } from "../components/tutorial/RealLessonOverlay";
import { LessonResults } from "../components/lesson/LessonResults";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { Button } from "../components/common/Button";
import styles from "./LessonPage.module.css";

/**
 * A planned lesson from the learner's own cursor (API_SPEC.md §2.2). The
 * in-session screen itself is components/lesson/ExerciseSessionScreen.tsx,
 * shared with StoryPage and PracticePage; what's here is what's specific to a
 * real, graded lesson — the nothing-due offer, the XP burst, the first-lesson
 * tutorial spotlight, and the scored recap.
 */
export function LessonPage() {
  const navigate = useNavigate();
  const engine = useLessonEngine();
  const session = useExerciseSession<LessonExerciseInstance, SubmitAnswerResult>(engine.course);
  const { confirmation } = session;
  const [lastUsedHint, setLastUsedHint] = useState(false);

  // Restart the engine's latency clock exactly when an exercise becomes
  // visible — i.e. once the previous answer's feedback has been dismissed
  // (by the Continue button OR the hook's own Enter handling), not when that
  // answer was submitted. Otherwise feedback-reading time is billed to the
  // next exercise's latencyMs, which the server grades on.
  const { markShown } = engine;
  const isReviewing = confirmation.answeredItem !== null;
  useEffect(() => {
    if (!isReviewing) markShown();
  }, [isReviewing, markShown]);

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

  // An unconfirmed answer outranks BOTH of these: submitAnswer() already
  // kicked off the session submission the instant the last exercise was
  // answered, but the learner still needs to confirm it before landing on the
  // results screen — the engine finishing in the background doesn't get to
  // skip that. ExerciseSessionScreen keeps showing that review until then.
  if (!(confirmation.answeredItem && confirmation.feedback)) {
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
  }

  async function handleSubmit(text: string, opts?: { usedHint?: boolean }) {
    const answered = engine.current; // snapshot before submitAnswer advances the queue
    if (!answered) return;
    const result = await engine.submitAnswer(text, opts);
    setLastUsedHint(opts?.usedHint ?? false);
    confirmation.record(answered, result);
  }

  return (
    <ExerciseSessionScreen
      session={session}
      courseCode={engine.courseCode}
      progress={engine.progress}
      current={engine.current}
      onSubmit={handleSubmit}
      feedbackXp={(feedback) => xpForAnswer(feedback.verdict, feedback.attempt, lastUsedHint)}
      overlay={({ item, topRowEl, exerciseEl }) => (
        <RealLessonOverlay topRowEl={topRowEl} exerciseEl={exerciseEl} renderType={item.renderType} />
      )}
    />
  );
}
