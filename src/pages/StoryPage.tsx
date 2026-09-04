import { useNavigate, useParams } from "react-router-dom";
import { useSkillWalkthrough, type WalkthroughExerciseInstance, type WalkthroughAnswerResult } from "../hooks/useSkillWalkthrough";
import { useExerciseSession } from "../hooks/useExerciseSession";
import { ExerciseSessionScreen } from "../components/lesson/ExerciseSessionScreen";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { Button } from "../components/common/Button";
import styles from "./LessonPage.module.css";

/**
 * Reading one chapter of a story (or a conversation, or a song). Thin over
 * useSkillWalkthrough the same way LessonPage is over useLessonEngine, and
 * rendering the same ExerciseSessionScreen both of those do — these are the
 * same screen in every respect except which engine feeds them and what
 * surrounds it, which here is nothing but story copy.
 */
export function StoryPage() {
  const { unitKey = "", skillKey = "" } = useParams();
  const navigate = useNavigate();
  const walkthrough = useSkillWalkthrough(unitKey, skillKey);
  const session = useExerciseSession<WalkthroughExerciseInstance, WalkthroughAnswerResult>(walkthrough.course);
  const { confirmation } = session;

  if (walkthrough.status === "loading") {
    return <Spinner label="Opening the story…" />;
  }

  if (walkthrough.status === "error") {
    return <ErrorBanner message="Couldn't load this story." />;
  }

  if (walkthrough.status === "empty") {
    return (
      <div className={styles.done}>
        <h1>Nothing here yet</h1>
        <p>This chapter has no content to read.</p>
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
          <h1>Chapter complete!</h1>
          {walkthrough.result && (
            <p>{walkthrough.result.outcome === "AlreadyProcessed" ? "Already recorded." : "Nicely read."}</p>
          )}
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
