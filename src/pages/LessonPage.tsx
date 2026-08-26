import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLessonEngine, type SubmitAnswerResult } from "../hooks/useLessonEngine";
import { useBootstrap } from "../hooks/useBootstrap";
import { usePrefs } from "../hooks/usePrefs";
import { useLexemeIndex } from "../hooks/useCourseContent";
import { ExerciseRenderer } from "../components/lesson/ExerciseRenderer";
import { SessionProgressBar } from "../components/lesson/SessionProgressBar";
import { AnswerFeedback } from "../components/lesson/AnswerFeedback";
import { VocabularyPanel } from "../components/lesson/VocabularyPanel";
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

  const [feedback, setFeedback] = useState<SubmitAnswerResult | null>(null);

  if (engine.status === "loading" || engine.status === "submitting") {
    return <Spinner label={engine.status === "submitting" ? "Saving your progress…" : "Preparing your lesson…"} />;
  }

  if (engine.status === "error") {
    return <ErrorBanner message="Couldn't load your next lesson." />;
  }

  if (engine.status === "empty") {
    return (
      <div className={styles.done}>
        <h1>Nothing due right now</h1>
        <p>Come back later, or explore the path for a skill to practice.</p>
        <Button onClick={() => navigate("/path")}>Back to path</Button>
      </div>
    );
  }

  if (engine.status === "done") {
    return (
      <div className={styles.done}>
        <h1>Lesson complete!</h1>
        {engine.result && <p>{engine.result.outcome === "AlreadyProcessed" ? "Already recorded." : "Great work."}</p>}
        <Button onClick={() => navigate("/path")}>Back to path</Button>
      </div>
    );
  }

  if (!engine.current) return null;

  async function handleSubmit(text: string, opts?: { usedHint?: boolean }) {
    const result = await engine.submitAnswer(text, opts);
    setFeedback(result);
  }

  return (
    <div className={styles.wrap}>
      <SessionProgressBar completed={engine.progress.completed} total={engine.progress.total} />
      {feedback && <AnswerFeedback correct={feedback.correct} note={feedback.note} />}
      <ExerciseRenderer
        key={engine.current.key}
        exercise={engine.current.exercise}
        renderType={engine.current.renderType}
        onSubmit={handleSubmit}
        courseCode={engine.courseCode}
        keyboardMode={prefs.data?.keyboardMode}
      />
      <VocabularyPanel
        tags={engine.current.exercise.tags}
        lexemeIndex={lexemeIndex.data}
        courseCode={engine.courseCode}
        scriptMode={prefs.data?.scriptMode ?? "native"}
      />
    </div>
  );
}
