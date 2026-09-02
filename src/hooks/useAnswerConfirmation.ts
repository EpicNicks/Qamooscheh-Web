// Holds the just-answered exercise (and its feedback) on screen until the
// learner explicitly confirms. Both useLessonEngine.submitAnswer and
// useSkillWalkthrough.submitAnswer splice their own queue SYNCHRONOUSLY
// inside that same call — by the time either resolves, `current` has
// already moved on to the next exercise (or gone null, on the last one).
// Without holding a snapshot here, the next exercise would render
// immediately underneath feedback that's actually about the one just
// answered, and answering the last exercise in a queue would jump straight
// to the completion screen with no chance to see that final answer's result.
import { useEffect, useState } from "react";

export interface AnswerConfirmation<TItem, TFeedback> {
  answeredItem: TItem | null;
  feedback: TFeedback | null;
  /** Bumped on every submission — key a feedback component by this so its shake/XP-pop animations replay instead of only firing once. */
  submissionCount: number;
  /** Snapshot the just-answered item and its result — call this instead of setting feedback state directly. */
  record: (item: TItem, feedback: TFeedback) => void;
  /** Wire to the exercise's "Continue" advance button (and, via the Enter-key handling below, to the Enter key itself). */
  confirm: () => void;
}

/**
 * `suppressEnter` lets a caller silence the Enter-confirms behavior while
 * some OTHER modal (a skip confirmation, say) is already claiming
 * Enter/Escape for itself.
 */
export function useAnswerConfirmation<TItem, TFeedback>(suppressEnter = false): AnswerConfirmation<TItem, TFeedback> {
  const [answeredItem, setAnsweredItem] = useState<TItem | null>(null);
  const [feedback, setFeedback] = useState<TFeedback | null>(null);
  const [submissionCount, setSubmissionCount] = useState(0);

  function record(item: TItem, result: TFeedback) {
    setFeedback(result);
    setSubmissionCount((n) => n + 1);
    setAnsweredItem(item);
  }

  function confirm() {
    setAnsweredItem(null);
  }

  // The exercise itself renders `disabled` while this review is showing, so
  // Enter has nowhere on-screen to be caught — a window-level listener,
  // same reasoning as TypeInExercise's own keydown handling.
  useEffect(() => {
    if (!(answeredItem && feedback) || suppressEnter) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Enter") {
        event.preventDefault();
        confirm();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [answeredItem, feedback, suppressEnter]);

  return { answeredItem, feedback, submissionCount, record, confirm };
}
