import { useParams, useNavigate } from "react-router-dom";
import { useCheckpoint } from "../hooks/useCheckpoint";
import { usePrefs } from "../hooks/usePrefs";
import { ExerciseRenderer } from "../components/lesson/ExerciseRenderer";
import { LanguageSettingsButton } from "../components/lesson/languageSettings/LanguageSettingsButton";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { Button } from "../components/common/Button";
// The two halves of the lesson-flow chrome this page borrows: the in-session
// screen's own layout, and the between-sessions result screen the pages share.
import screenStyles from "../components/lesson/ExerciseSessionScreen.module.css";
import styles from "./LessonPage.module.css";

export function CheckpointPage() {
  const { unitKey = "", skillKey = "" } = useParams();
  const navigate = useNavigate();
  const checkpoint = useCheckpoint(unitKey, skillKey);
  const prefs = usePrefs();

  if (checkpoint.isLoading) return <Spinner label="Preparing checkpoint…" />;
  if (checkpoint.isError) return <ErrorBanner message="Couldn't load this checkpoint." />;

  if (checkpoint.submitResult) {
    const { passed, score } = checkpoint.submitResult;
    return (
      <div className={styles.done}>
        <h1>{passed ? "Checkpoint passed!" : "Not quite there yet"}</h1>
        <p>Score: {Math.round(score * 100)}%</p>
        <Button onClick={() => navigate("/path")}>Back to path</Button>
      </div>
    );
  }

  if (checkpoint.instances.length === 0) {
    return <ErrorBanner message="This checkpoint has nothing to sample yet." />;
  }

  if (!checkpoint.current) {
    return (
      <div className={styles.done}>
        <h1>Ready to submit</h1>
        <p>You've answered every question. Submit when ready.</p>
        {checkpoint.submitError && <ErrorBanner message={checkpoint.submitError} />}
        <Button onClick={() => void checkpoint.submit()} disabled={checkpoint.isSubmitting}>
          {checkpoint.isSubmitting ? "Submitting…" : "Submit checkpoint"}
        </Button>
      </div>
    );
  }

  return (
    <div className={screenStyles.wrap}>
      <div className={screenStyles.topRow}>
        <p>
          Question {checkpoint.index + 1} of {checkpoint.instances.length}
        </p>
        <LanguageSettingsButton courseCode={checkpoint.courseCode} />
      </div>
      <ExerciseRenderer
        key={checkpoint.current.key}
        exercise={checkpoint.current.exercise}
        renderType={checkpoint.current.renderType}
        onSubmit={(text) => checkpoint.answerCurrent(text)}
        courseCode={checkpoint.courseCode}
        keyboardMode={prefs.data?.keyboardMode}
        autoplayAudio={prefs.data?.autoplayAudio}
      />
    </div>
  );
}
