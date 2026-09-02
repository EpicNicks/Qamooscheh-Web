import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSkillWalkthrough, type WalkthroughAnswerResult } from "../hooks/useSkillWalkthrough";
import { usePrefs } from "../hooks/usePrefs";
import { useSkipConfirmation } from "../hooks/useSkipConfirmation";
import { ExerciseRenderer } from "../components/lesson/ExerciseRenderer";
import { SessionProgressBar } from "../components/lesson/SessionProgressBar";
import { AnswerFeedback } from "../components/lesson/AnswerFeedback";
import { SkipLessonModal } from "../components/lesson/SkipLessonModal";
import { CloseLessonButton } from "../components/lesson/CloseLessonButton";
import { LanguageSettingsButton } from "../components/lesson/languageSettings/LanguageSettingsButton";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { Button } from "../components/common/Button";
import styles from "./LessonPage.module.css";

/**
 * Reading one chapter of a story (or a conversation, or a song). Thin over
 * useSkillWalkthrough the same way LessonPage is over useLessonEngine, and
 * sharing LessonPage's stylesheet the way CheckpointPage already does —
 * these are the same screen in every respect except which engine feeds them.
 */
export function StoryPage() {
  const { unitKey = "", skillKey = "" } = useParams();
  const navigate = useNavigate();
  const walkthrough = useSkillWalkthrough(unitKey, skillKey);
  const prefs = usePrefs();
  const skip = useSkipConfirmation();

  const [feedback, setFeedback] = useState<WalkthroughAnswerResult | null>(null);

  if (walkthrough.status === "loading" || walkthrough.status === "submitting") {
    return <Spinner label={walkthrough.status === "submitting" ? "Saving your progress…" : "Opening the story…"} />;
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

  if (!walkthrough.current) return null;

  async function handleSubmit(text: string, opts?: { usedHint?: boolean }) {
    const result = await walkthrough.submitAnswer(text, opts);
    setFeedback(result);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.topRow}>
        <SessionProgressBar completed={walkthrough.progress.completed} total={walkthrough.progress.total} />
        <LanguageSettingsButton courseCode={walkthrough.courseCode} />
        <CloseLessonButton isConfirming={skip.isConfirming} onClick={skip.requestSkip} />
      </div>
      {walkthrough.title && <h1 className={styles.chapterTitle}>{walkthrough.title}</h1>}
      {feedback && <AnswerFeedback correct={feedback.correct} note={feedback.note} />}
      <ExerciseRenderer
        key={walkthrough.current.key}
        exercise={walkthrough.current.exercise}
        renderType={walkthrough.current.renderType}
        onSubmit={handleSubmit}
        courseCode={walkthrough.courseCode}
        keyboardMode={prefs.data?.keyboardMode}
        autoplayAudio={prefs.data?.autoplayAudio}
      />
      {skip.isConfirming && <SkipLessonModal onCancel={skip.cancelSkip} onConfirm={skip.confirmSkip} />}
    </div>
  );
}
