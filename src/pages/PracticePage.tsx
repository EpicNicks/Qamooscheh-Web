import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useCompletedLessons } from "../hooks/useCompletedLessons";
import { useBootstrap } from "../hooks/useBootstrap";
import { useSkillWalkthrough, type WalkthroughExerciseInstance, type WalkthroughAnswerResult } from "../hooks/useSkillWalkthrough";
import { useExerciseSession } from "../hooks/useExerciseSession";
import { ExerciseSessionScreen } from "../components/lesson/ExerciseSessionScreen";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { Button } from "../components/common/Button";
import { LessonResults } from "../components/lesson/LessonResults";
import { LESSON_PASS_THRESHOLD } from "../domain/lessonScore";
import styles from "./LessonPage.module.css";

/**
 * Re-practicing a standard skill the learner has already passed. GET
 * /v1/sessions/next only ever plans the learner's own cursor (API_SPEC.md
 * §2.2), so a skill behind that cursor can't be reached through /lesson —
 * and it isn't a checkpoint target either, since GET /v1/checkpoint rejects
 * anything that isn't strictly ahead of the cursor. useSkillWalkthrough
 * already covers "load one named skill from the CDN and submit it" for
 * exactly this kind of out-of-sequence access (it's how StoryPage works),
 * so this is that same shell with lesson-appropriate copy instead of
 * story copy.
 *
 * `?first=1` (domain/skillRoute.ts) marks a skill the learner never completed
 * — a fork alternate passed over when its sibling advanced the cursor. That is
 * a real first attempt, so it submits like any graded lesson.
 */
export function PracticePage() {
  // Remounting the run is what "Try again" does: a fresh walkthrough, queue and score.
  const [attempt, setAttempt] = useState(0);
  return <PracticeRun key={attempt} onTryAgain={() => setAttempt((n) => n + 1)} />;
}

function PracticeRun({ onTryAgain }: { onTryAgain: () => void }) {
  const { unitKey = "", skillKey = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bootstrap = useBootstrap();
  const completed = useCompletedLessons(bootstrap.data?.course?.code);
  // The URL only asks for a graded run; a stale or bookmarked `?first=1` on a
  // lesson since completed must not re-grade it. Decided once the completed set
  // has settled and then frozen, since the pass itself refetches that set.
  const [graded, setGraded] = useState<boolean | null>(null);
  if (graded === null && (completed.isSuccess || completed.isError)) {
    setGraded(searchParams.get("first") === "1" && !(completed.data?.completedLessonKeys.includes(skillKey) ?? false));
  }
  const isFirstAttempt = graded === true;
  // A replay keeps the run local-only — the screen promises "doesn't count
  // toward your review schedule", so it must not submit a graded,
  // `completed: true` session (useLessonEngine's practice mode does the same).
  const walkthrough = useSkillWalkthrough(unitKey, skillKey, { practice: !isFirstAttempt });
  const session = useExerciseSession<WalkthroughExerciseInstance, WalkthroughAnswerResult>(walkthrough.course);
  const { confirmation } = session;

  if (walkthrough.status === "loading" || (graded === null && walkthrough.status !== "error")) {
    return <Spinner label="Preparing practice…" />;
  }

  if (walkthrough.status === "error") {
    return <ErrorBanner message="Couldn't load this lesson." />;
  }

  if (walkthrough.status === "empty") {
    return (
      <div className={styles.done}>
        <h1>Nothing here yet</h1>
        <p>This lesson has no content to practice.</p>
        <Button onClick={() => navigate("/path")}>Back to path</Button>
      </div>
    );
  }

  // An unconfirmed answer outranks both branches below — see LessonPage's
  // identical check for why: submitAnswer() already kicked off the session
  // submission the instant the last exercise was answered, but the learner
  // still needs to confirm it before landing on the completion screen.
  if (!(confirmation.answeredItem && confirmation.feedback)) {
    if (walkthrough.status === "submitting") {
      return <Spinner label="Saving your progress…" />;
    }

    // The server's verdict on a first attempt; a replay or an offline-queued
    // submission carries none, which reads as done.
    if (walkthrough.status === "done" && walkthrough.result?.outcome === "Rejected") {
      return (
        <div className={styles.done}>
          <h1>This lesson wasn't saved</h1>
          <p>{"The server didn't record this session, so it won't count toward your progress."}</p>
          <div className={styles.doneActions}>
            <Button onClick={() => navigate("/path")}>Back to path</Button>
          </div>
        </div>
      );
    }

    if (walkthrough.status === "done" && walkthrough.result?.lessonCompleted === false) {
      return (
        <div className={styles.done}>
          <h1>Not passed yet</h1>
          <p>
            You need {Math.round(LESSON_PASS_THRESHOLD * 100)}% on your first tries to pass this lesson. Your answers
            still count toward your reviews — take it again to pass.
          </p>
          <LessonResults
            correct={walkthrough.score.correct}
            total={walkthrough.score.total}
            score={walkthrough.score.score}
            passMark={LESSON_PASS_THRESHOLD}
            sound="lessonFailed"
          />
          <div className={styles.doneActions}>
            <Button variant="secondary" onClick={() => navigate("/path")}>
              Back to path
            </Button>
            <Button onClick={onTryAgain}>Try again</Button>
          </div>
        </div>
      );
    }

    if (walkthrough.status === "done") {
      return (
        <div className={styles.done}>
          <h1>Lesson complete!</h1>
          {walkthrough.isPracticeMode && (
            <p className={styles.practiceNote}>Practice round — doesn't count toward your review schedule.</p>
          )}
          {!walkthrough.isPracticeMode && walkthrough.result == null && (
            <p className={styles.practiceNote}>Saved on this device — it will sync when you're back online.</p>
          )}
          <LessonResults
            correct={walkthrough.score.correct}
            total={walkthrough.score.total}
            score={walkthrough.score.score}
            passMark={walkthrough.result?.lessonCompleted != null ? LESSON_PASS_THRESHOLD : undefined}
            sound="lessonPassed"
          />
          <Button onClick={() => navigate("/path")}>Back to path</Button>
        </div>
      );
    }
  }

  function handleSubmit(text: string, opts?: { usedHint?: boolean }) {
    const answered = walkthrough.current; // snapshot before submitAnswer advances the queue
    if (!answered) return;
    const result = walkthrough.submitAnswer(text, opts);
    confirmation.record(answered, result);
  }

  return (
    <ExerciseSessionScreen
      session={session}
      courseCode={walkthrough.courseCode}
      progress={walkthrough.progress}
      current={walkthrough.current}
      title={walkthrough.title}
      onSubmit={handleSubmit}
    />
  );
}
