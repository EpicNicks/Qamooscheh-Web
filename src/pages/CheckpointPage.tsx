import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCheckpoint } from "../hooks/useCheckpoint";
import { usePrefs } from "../hooks/usePrefs";
import { ExerciseRenderer } from "../components/lesson/ExerciseRenderer";
import { SessionProgressBar } from "../components/lesson/SessionProgressBar";
import { LanguageSettingsButton } from "../components/lesson/languageSettings/LanguageSettingsButton";
import { CloseLessonButton } from "../components/lesson/CloseLessonButton";
import { LeaveCheckpointModal } from "../components/lesson/LeaveCheckpointModal";
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
  // Nothing here is saved before the single final submit() call
  // (useCheckpoint's own doc comment), so leaving mid-checkpoint is always
  // safe to do immediately — this just guards against a stray tap on the ×
  // throwing away answers already filled in.
  const [confirmingExit, setConfirmingExit] = useState(false);
  const exitModal = confirmingExit && (
    <LeaveCheckpointModal onCancel={() => setConfirmingExit(false)} onConfirm={() => navigate("/path")} />
  );

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
        <div className={styles.doneActions}>
          <Button variant="secondary" onClick={() => setConfirmingExit(true)}>
            Exit without submitting
          </Button>
          <Button onClick={() => void checkpoint.submit()} disabled={checkpoint.isSubmitting}>
            {checkpoint.isSubmitting ? "Submitting…" : "Submit checkpoint"}
          </Button>
        </div>
        {exitModal}
      </div>
    );
  }

  return (
    <div className={screenStyles.wrap}>
      <div className={screenStyles.topRow}>
        <SessionProgressBar completed={checkpoint.index} total={checkpoint.instances.length} />
        <LanguageSettingsButton courseCode={checkpoint.courseCode} />
        <CloseLessonButton isConfirming={confirmingExit} onClick={() => setConfirmingExit(true)} />
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
      {exitModal}
    </div>
  );
}
