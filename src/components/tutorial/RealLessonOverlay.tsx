import { useEffect, useRef } from "react";
import { TutorialOverlay, type TutorialStep } from "./TutorialOverlay";
import { useLessonOverlaySeen, type LessonOverlayKind } from "../../hooks/useLessonOverlaySeen";
import type { ExerciseType } from "../../domain/enums";
import exerciseStyles from "../lesson/Exercise.module.css";

interface RealLessonOverlayProps {
  /** The DOM node wrapping the page's top row (progress bar / settings cog / close button) — LessonPage attaches a ref here. */
  topRowEl: HTMLElement | null;
  /** The DOM node wrapping the rendered exercise (ExerciseRenderer's output) — LessonPage attaches a ref here. */
  exerciseEl: HTMLElement | null;
  /** Only word_bank and type_in get a walkthrough — match/speak aren't in scope, and this renders nothing for either. */
  renderType: ExerciseType;
  /**
   * Whether this is a lesson position the walkthrough is allowed to
   * auto-trigger on at all — the very first standard position of the
   * course (see domain/pathProgress.ts's isFirstStandardPosition). A learner
   * who reaches word_bank/type_in for the first time on a LATER lesson (say,
   * because their first lesson was all word_bank and the type_in kind is
   * still unseen) must not get the walkthrough sprung on them there instead.
   */
  allowAutoTrigger: boolean;
  /** Set true (by the lesson-settings "replay walkthrough" control) to show it regardless of allowAutoTrigger/already-seen. Caller clears it once shown. */
  forceShow?: boolean;
  onForceShowHandled?: () => void;
}

const KIND_BY_RENDER_TYPE: Partial<Record<ExerciseType, LessonOverlayKind>> = {
  word_bank: "wordBank",
  type_in: "typeIn",
};

/**
 * The first time a learner reaches a real word_bank or type_in exercise,
 * spotlights that screen's own controls — distinct from the onboarding
 * tutorial (OnboardingTutorialStep), which teaches the same shape with mock
 * English content before a real lesson screen (or its real audio button,
 * language settings cog, native-script keyboard) exists to point at.
 * Tracked independently per exercise kind (hooks/useLessonOverlaySeen.ts),
 * so seeing the word-bank walkthrough doesn't suppress the type-in one.
 *
 * Finds its targets by querying Exercise.module.css's own classes inside
 * the two container elements the caller hands it, rather than threading
 * ref-callback props through WordBankExercise/TypeInExercise — those
 * components have no other reason to know a tutorial exists.
 */
export function RealLessonOverlay({ topRowEl, exerciseEl, renderType, allowAutoTrigger, forceShow, onForceShowHandled }: RealLessonOverlayProps) {
  const kind = KIND_BY_RENDER_TYPE[renderType];
  const overlay = useLessonOverlaySeen(kind ?? "wordBank");
  const shouldShow = !!kind && !!exerciseEl && (forceShow || (allowAutoTrigger && !overlay.seen));

  function handleDismiss() {
    overlay.markSeen();
    onForceShowHandled?.();
  }

  // Marks the walkthrough seen (and clears a forced replay) the moment it
  // stops being shown for any reason — finishing it, dismissing it, or
  // navigating/closing away from it mid-walkthrough — not only on
  // TutorialOverlay's own onFinish. A ref (rather than depending on
  // `handleDismiss` itself, a fresh closure every render) keeps this effect
  // from re-firing except on the true shouldShow transition.
  const handleDismissRef = useRef(handleDismiss);
  useEffect(() => {
    handleDismissRef.current = handleDismiss;
  });
  useEffect(() => {
    if (!shouldShow) return;
    return () => handleDismissRef.current();
  }, [shouldShow]);

  if (!shouldShow || !exerciseEl) return null;

  const promptEl = exerciseEl.querySelector<HTMLElement>(`.${CSS.escape(exerciseStyles.prompt)}`);
  const submitEl = exerciseEl.querySelector<HTMLElement>(`.${CSS.escape(exerciseStyles.actions)}`);
  const mainEl =
    kind === "wordBank"
      ? exerciseEl.querySelector<HTMLElement>(`.${CSS.escape(exerciseStyles.tiles)}`)
      : exerciseEl.querySelector<HTMLElement>(`.${CSS.escape(exerciseStyles.input)}`);

  const steps: TutorialStep[] = [
    { targetEl: topRowEl, title: "Your progress", description: "This fills up as you go — and lets you check settings or leave the lesson." },
    { targetEl: promptEl, title: "The prompt", description: "This tells you what to do for this exercise." },
    kind === "wordBank"
      ? { targetEl: mainEl, title: "Word bank", description: "Tap the tiles, in order, to build your answer." }
      : { targetEl: mainEl, title: "Your answer", description: "Type your answer here." },
    { targetEl: submitEl, title: "Submit", description: "Once your answer looks right, submit it to check." },
  ];

  return <TutorialOverlay resetKey={kind} steps={steps} onFinish={handleDismiss} onRepeatedOutsideClick={handleDismiss} />;
}
