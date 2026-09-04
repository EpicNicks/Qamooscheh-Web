import { useNavigate, useParams } from "react-router-dom";
import { useSkillWalkthrough, type WalkthroughExerciseInstance, type WalkthroughAnswerResult } from "../hooks/useSkillWalkthrough";
import { useExerciseSession } from "../hooks/useExerciseSession";
import { ExerciseSessionScreen } from "../components/lesson/ExerciseSessionScreen";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { Button } from "../components/common/Button";
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
 */
export function PracticePage() {
  const { unitKey = "", skillKey = "" } = useParams();
  const navigate = useNavigate();
  const walkthrough = useSkillWalkthrough(unitKey, skillKey);
  const session = useExerciseSession<WalkthroughExerciseInstance, WalkthroughAnswerResult>(walkthrough.course);
  const { confirmation } = session;

  if (walkthrough.status === "loading") {
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

    if (walkthrough.status === "done") {
      return (
        <div className={styles.done}>
          <h1>Lesson complete!</h1>
          <p className={styles.practiceNote}>Practice round — doesn't count toward your review schedule.</p>
          <Button onClick={() => navigate("/path")}>Back to path</Button>
        </div>
      );
    }
  }

  async function handleSubmit(text: string, opts?: { usedHint?: boolean }) {
    const answered = walkthrough.current; // snapshot before submitAnswer advances the queue
    if (!answered) return;
    const result = await walkthrough.submitAnswer(text, opts);
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
