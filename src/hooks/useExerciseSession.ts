// Everything a "run through a queue of exercises" screen needs that isn't the
// queue itself: the learner's render preferences, the course-wide hover-hint
// map, the skip gate and the answer-confirmation snapshot.
//
// Split out from the pages (LessonPage/StoryPage/PracticePage) rather than
// pulled inside components/lesson/ExerciseSessionScreen.tsx on purpose: these
// are queries, and the pages mount long before the first exercise renders
// (they spend that time on `loading`). Calling them here — at the top of the
// page, above its own loading/error branches, exactly where each page used to
// call them one by one — keeps prefs and lexemes being fetched in parallel
// with the session plan, so `autoplayAudio`/`keyboardMode`/the hint map are
// already resolved by the time the first exercise appears.
//
// The engine itself stays with the page: useLessonEngine and
// useSkillWalkthrough answer different questions (a planned, requeueing
// session vs. one named skill read straight through) and neither is
// substitutable for the other.
import { useMemo } from "react";
import { usePrefs } from "./usePrefs";
import { useLexemeIndex } from "./useCourseContent";
import { useShowRomanizationHints } from "./useShowRomanizationHints";
import { useShowTranslationHints } from "./useShowTranslationHints";
import { useSkipConfirmation, type SkipConfirmation } from "./useSkipConfirmation";
import { useAnswerConfirmation, type AnswerConfirmation } from "./useAnswerConfirmation";
import { buildLexemeHintMap, type HintSettings, type WordHint } from "../domain/romanization";
import type { KeyboardMode } from "../domain/enums";
import type { CourseRef } from "../types/api";

export interface ExerciseSession<TItem, TFeedback> {
  /** user_prefs.keyboard_mode — threaded to TypeInExercise's virtual keyboard. */
  keyboardMode: KeyboardMode | undefined;
  /** user_prefs.autoplay_audio — plays a prompt aloud the moment it's shown. */
  autoplayAudio: boolean | undefined;
  /** The learner's two local hint toggles, in the shape RomanizedText reads. */
  hintSettings: HintSettings;
  /** Course-wide word -> hint map, UNGATED — pass through gateLexemeHintMap with the exercise at hand before handing it to a component. */
  courseHintMap: ReadonlyMap<string, WordHint>;
  skip: SkipConfirmation;
  confirmation: AnswerConfirmation<TItem, TFeedback>;
}

/**
 * `TItem`/`TFeedback` are the engine's own instance and answer-result types —
 * this hook never inspects either, it only carries them through
 * useAnswerConfirmation so a page keeps its exact types on
 * `confirmation.answeredItem`/`confirmation.feedback`.
 */
export function useExerciseSession<TItem, TFeedback>(
  course: CourseRef | null | undefined,
): ExerciseSession<TItem, TFeedback> {
  const prefs = usePrefs();
  const lexemeIndex = useLexemeIndex(course);
  const romanizationHints = useShowRomanizationHints();
  const translationHints = useShowTranslationHints();
  const courseHintMap = useMemo(() => buildLexemeHintMap(lexemeIndex.data), [lexemeIndex.data]);
  const skip = useSkipConfirmation();
  // Enter confirms the answer — unless the skip modal is up, which claims
  // Enter/Escape for itself.
  const confirmation = useAnswerConfirmation<TItem, TFeedback>(skip.isConfirming);

  return {
    keyboardMode: prefs.data?.keyboardMode,
    autoplayAudio: prefs.data?.autoplayAudio,
    hintSettings: { translationEnabled: translationHints.enabled, romanizationEnabled: romanizationHints.enabled },
    courseHintMap,
    skip,
    confirmation,
  };
}
