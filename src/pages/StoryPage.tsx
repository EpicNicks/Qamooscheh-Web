import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSkillWalkthrough, type WalkthroughExerciseInstance, type WalkthroughAnswerResult } from "../hooks/useSkillWalkthrough";
import { useExerciseSession } from "../hooks/useExerciseSession";
import { StoryTranscript } from "../components/lesson/StoryTranscript";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { Button } from "../components/common/Button";
import styles from "./LessonPage.module.css";

/**
 * Reading one chapter of a story (or a conversation, or a song). Thin over
 * useSkillWalkthrough the same way LessonPage is over useLessonEngine, but
 * rendering StoryTranscript rather than ExerciseSessionScreen — a story reads
 * top to bottom, so its screen is a scrollable transcript of every line
 * rather than one exercise on screen at a time.
 */
export function StoryPage() {
  const { unitKey = "", skillKey = "" } = useParams();
  const navigate = useNavigate();
  const walkthrough = useSkillWalkthrough(unitKey, skillKey);
  const session = useExerciseSession<WalkthroughExerciseInstance, WalkthroughAnswerResult>(walkthrough.course);
  const { confirmation } = session;

  // Every line's result, kept independent of `confirmation`'s single-item
  // snapshot (which clears on confirm) so a line already confirmed can still
  // show what was answered once it collapses into the transcript's history.
  const [resultsByOrdinal, setResultsByOrdinal] = useState<Map<number, WalkthroughAnswerResult>>(new Map());

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
    setResultsByOrdinal((prev) => new Map(prev).set(answered.ordinal, result));
    confirmation.record(answered, result);
  }

  return (
    <StoryTranscript
      session={session}
      courseCode={walkthrough.courseCode}
      progress={walkthrough.progress}
      current={walkthrough.current}
      instances={walkthrough.instances}
      resultsByOrdinal={resultsByOrdinal}
      title={walkthrough.title}
      onSubmit={handleSubmit}
    />
  );
}
