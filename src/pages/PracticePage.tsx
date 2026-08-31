import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSkillWalkthrough, type WalkthroughAnswerResult } from "../hooks/useSkillWalkthrough";
import { useBootstrap } from "../hooks/useBootstrap";
import { usePrefs } from "../hooks/usePrefs";
import { useLexemeIndex } from "../hooks/useCourseContent";
import { useSkipConfirmation } from "../hooks/useSkipConfirmation";
import { ExerciseRenderer } from "../components/lesson/ExerciseRenderer";
import { SessionProgressBar } from "../components/lesson/SessionProgressBar";
import { AnswerFeedback } from "../components/lesson/AnswerFeedback";
import { VocabularyPanel } from "../components/lesson/VocabularyPanel";
import { SkipLessonModal } from "../components/lesson/SkipLessonModal";
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
  const bootstrap = useBootstrap();
  const prefs = usePrefs();
  const lexemeIndex = useLexemeIndex(bootstrap.data?.course ?? null);
  const skip = useSkipConfirmation();

  const [feedback, setFeedback] = useState<WalkthroughAnswerResult | null>(null);

  if (walkthrough.status === "loading" || walkthrough.status === "submitting") {
    return <Spinner label={walkthrough.status === "submitting" ? "Saving your progress…" : "Preparing practice…"} />;
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

  if (walkthrough.status === "done") {
    return (
      <div className={styles.done}>
        <h1>Lesson complete!</h1>
        <p className={styles.practiceNote}>Practice round — doesn't count toward your review schedule.</p>
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
        <Button variant="secondary" className={styles.skip} onClick={skip.requestSkip}>
          Skip
        </Button>
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
      />
      <VocabularyPanel
        tags={walkthrough.current.exercise.tags}
        lexemeIndex={lexemeIndex.data}
        courseCode={walkthrough.courseCode}
        scriptMode={prefs.data?.scriptMode ?? "native"}
      />

      {skip.isConfirming && <SkipLessonModal onCancel={skip.cancelSkip} onConfirm={skip.confirmSkip} />}
    </div>
  );
}
