import { useNavigate } from "react-router-dom";
import { useLessonEngine } from "../hooks/useLessonEngine";
import { ExerciseRenderer } from "../components/lesson/ExerciseRenderer";
import { SessionProgressBar } from "../components/lesson/SessionProgressBar";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { Button } from "../components/common/Button";
import styles from "./LessonPage.module.css";

export function LessonPage() {
  const navigate = useNavigate();
  const { status, current, progress, submitAnswer, result } = useLessonEngine();

  if (status === "loading" || status === "submitting") {
    return <Spinner label={status === "submitting" ? "Saving your progress…" : "Preparing your lesson…"} />;
  }

  if (status === "error") {
    return <ErrorBanner message="Couldn't load your next lesson." />;
  }

  if (status === "empty") {
    return (
      <div className={styles.done}>
        <h1>Nothing due right now</h1>
        <p>Come back later, or explore the path for a skill to practice.</p>
        <Button onClick={() => navigate("/path")}>Back to path</Button>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className={styles.done}>
        <h1>Lesson complete!</h1>
        {result && <p>{result.outcome === "AlreadyProcessed" ? "Already recorded." : "Great work."}</p>}
        <Button onClick={() => navigate("/path")}>Back to path</Button>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className={styles.wrap}>
      <SessionProgressBar completed={progress.completed} total={progress.total} />
      <ExerciseRenderer exercise={current.exercise} renderType={current.renderType} onSubmit={submitAnswer} />
    </div>
  );
}
