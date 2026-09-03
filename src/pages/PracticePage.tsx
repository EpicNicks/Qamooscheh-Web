import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSkillWalkthrough, type WalkthroughExerciseInstance, type WalkthroughAnswerResult } from "../hooks/useSkillWalkthrough";
import { usePrefs } from "../hooks/usePrefs";
import { useSkipConfirmation } from "../hooks/useSkipConfirmation";
import { useAnswerConfirmation } from "../hooks/useAnswerConfirmation";
import { useLexemeIndex } from "../hooks/useCourseContent";
import { useShowRomanizationHints } from "../hooks/useShowRomanizationHints";
import { useShowTranslationHints } from "../hooks/useShowTranslationHints";
import { buildLexemeHintMap, gateLexemeHintMap, type HintSettings } from "../domain/romanization";
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
  const prefs = usePrefs();
  const lexemeIndex = useLexemeIndex(walkthrough.course);
  const romanizationHints = useShowRomanizationHints();
  const translationHints = useShowTranslationHints();
  const hintSettings: HintSettings = { translationEnabled: translationHints.enabled, romanizationEnabled: romanizationHints.enabled };
  const courseHintMap = useMemo(() => buildLexemeHintMap(lexemeIndex.data), [lexemeIndex.data]);
  const skip = useSkipConfirmation();
  const confirmation = useAnswerConfirmation<WalkthroughExerciseInstance, WalkthroughAnswerResult>(skip.isConfirming);

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

  // Checked BEFORE "submitting"/"done" — see LessonPage's identical check
  // for why: submitAnswer() already kicked off the session submission the
  // instant the last exercise was answered, but the learner still needs to
  // confirm it before landing on the completion screen.
  if (confirmation.answeredItem && confirmation.feedback) {
    const { answeredItem, feedback } = confirmation;
    return (
      <div className={styles.wrap}>
        <div className={styles.topRow}>
          <SessionProgressBar completed={walkthrough.progress.completed} total={walkthrough.progress.total} />
          <LanguageSettingsButton courseCode={walkthrough.courseCode} />
          <CloseLessonButton isConfirming={skip.isConfirming} onClick={skip.requestSkip} />
        </div>
        {walkthrough.title && <h1 className={styles.chapterTitle}>{walkthrough.title}</h1>}
        <AnswerFeedback
          key={confirmation.submissionCount}
          correct={feedback.correct}
          note={feedback.note}
          answer={answeredItem.exercise.answer}
          hintMap={gateLexemeHintMap(courseHintMap, {
            settings: hintSettings,
            scriptModePref: prefs.data?.scriptMode,
            exerciseScriptMode: answeredItem.exercise.scriptMode,
          })}
          hintSettings={hintSettings}
          reportContext={{ exerciseTags: answeredItem.exercise.tags, prompt: answeredItem.exercise.prompt }}
        />
        <ExerciseRenderer
          key={answeredItem.key}
          exercise={answeredItem.exercise}
          renderType={answeredItem.renderType}
          onSubmit={() => {}}
          disabled
          courseCode={walkthrough.courseCode}
          keyboardMode={prefs.data?.keyboardMode}
          autoplayAudio={prefs.data?.autoplayAudio}
          hintMap={gateLexemeHintMap(courseHintMap, {
            settings: hintSettings,
            scriptModePref: prefs.data?.scriptMode,
            exerciseScriptMode: answeredItem.exercise.scriptMode,
          })}
          hintSettings={hintSettings}
          advance={{ label: "Continue", onAdvance: confirmation.confirm }}
        />
        {skip.isConfirming && <SkipLessonModal onCancel={skip.cancelSkip} onConfirm={skip.confirmSkip} />}
      </div>
    );
  }

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

  if (!walkthrough.current) return null;

  async function handleSubmit(text: string, opts?: { usedHint?: boolean }) {
    const answered = walkthrough.current; // snapshot before submitAnswer advances the queue
    if (!answered) return;
    const result = await walkthrough.submitAnswer(text, opts);
    confirmation.record(answered, result);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.topRow}>
        <SessionProgressBar completed={walkthrough.progress.completed} total={walkthrough.progress.total} />
        <LanguageSettingsButton courseCode={walkthrough.courseCode} />
        <CloseLessonButton isConfirming={skip.isConfirming} onClick={skip.requestSkip} />
      </div>
      {walkthrough.title && <h1 className={styles.chapterTitle}>{walkthrough.title}</h1>}
      <ExerciseRenderer
        key={walkthrough.current.key}
        exercise={walkthrough.current.exercise}
        renderType={walkthrough.current.renderType}
        onSubmit={handleSubmit}
        disabled={skip.isConfirming}
        courseCode={walkthrough.courseCode}
        keyboardMode={prefs.data?.keyboardMode}
        autoplayAudio={prefs.data?.autoplayAudio}
        hintMap={gateLexemeHintMap(courseHintMap, {
          settings: hintSettings,
          scriptModePref: prefs.data?.scriptMode,
          exerciseScriptMode: walkthrough.current.exercise.scriptMode,
        })}
        hintSettings={hintSettings}
      />
      {skip.isConfirming && <SkipLessonModal onCancel={skip.cancelSkip} onConfirm={skip.confirmSkip} />}
    </div>
  );
}
