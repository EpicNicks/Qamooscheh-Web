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
export function RealLessonOverlay({ topRowEl, exerciseEl, renderType }: RealLessonOverlayProps) {
  const kind = KIND_BY_RENDER_TYPE[renderType];
  const overlay = useLessonOverlaySeen(kind ?? "wordBank");

  if (!kind || overlay.seen || !exerciseEl) return null;

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

  return <TutorialOverlay resetKey={kind} steps={steps} onFinish={overlay.markSeen} onRepeatedOutsideClick={overlay.markSeen} />;
}
