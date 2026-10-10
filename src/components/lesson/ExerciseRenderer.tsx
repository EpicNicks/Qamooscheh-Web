import type { ExerciseType, KeyboardMode } from "../../domain/enums";
import type { TextDisplaySettings, WordHint } from "../../domain/romanization";
import type { ExerciseArtifact } from "../../types/content";
import { WordBankExercise } from "./WordBankExercise";
import { TypeInExercise } from "./TypeInExercise";
import { MatchExercise } from "./MatchExercise";
import { SpeakExercise } from "./SpeakExercise";
import { ExerciseVoiceScope } from "../../hooks/exerciseVoiceScope";

export interface ReviewedAnswer {
  /** Exactly what was handed to the grader. */
  text: string;
  correct: boolean;
}

export interface ExerciseProps {
  exercise: ExerciseArtifact;
  onSubmit: (submittedText: string, opts?: { usedHint?: boolean }) => void;
  disabled?: boolean;
  /** Drives RTL layout/font for native-script content (domain/language.ts) — null when the course's language isn't known/supported yet. */
  courseCode?: string | null;
  /** user_prefs.keyboard_mode — only consulted by TypeInExercise, when it renders a language-specific virtual keyboard. */
  keyboardMode?: KeyboardMode;
  /** user_prefs.autoplay_audio — plays the prompt aloud once, the moment it's shown (see ExercisePrompt). */
  autoplayAudio?: boolean;
  /**
   * Native word -> hover hint (domain/romanization.ts), for the hover-a-word
   * feature — the CALLER resolves this already gated to an empty map when
   * both hint toggles are off, the learner's own scriptMode preference is
   * "romanized", or this exercise's own scriptMode isn't "native" (nothing
   * native-script to hover in the first place), so every consumer here can
   * just render it unconditionally.
   */
  hintMap?: ReadonlyMap<string, WordHint>;
  /** Which of a word's hints (translation, phonetic reading) are actually enabled right now — see domain/romanization.ts's TextDisplaySettings. */
  textSettings?: TextDisplaySettings;
  /**
   * Set once this exercise has been answered and is waiting on the learner
   * to explicitly confirm before the lesson moves on — every exercise
   * type's own submit control becomes this instead (not a second button
   * alongside it), so there's exactly one "next step" affordance on screen
   * at a time. The exercise is expected to already be rendered `disabled`
   * whenever this is set.
   */
  advance?: { label: string; onAdvance: () => void };
  /**
   * What the learner submitted and whether it was right, set only while
   * reviewing an answer — the answer never disappears once it's checked.
   * TypeInExercise shows the typed words in place of its input, each green
   * or red; WordBankExercise puts the submitted tiles back in the answer
   * row, green where they're in the right order and red otherwise, and
   * outlines the bank tiles that should have been used. Other exercise
   * types ignore it.
   */
  reviewedAnswer?: ReviewedAnswer;
  /**
   * Set while reviewing a wrong typed answer (domain/retype.ts): the learner
   * types the correct answer once more as practice, or skips it. Replaces the
   * `advance` button with Skip and Submit; both move on the way `advance`
   * would. Practice only — `matches` is checked here, and nothing reaches
   * onSubmit or the grader. Only TypeInExercise reads it, and it's expected
   * to render enabled while this is set.
   */
  retype?: { matches: (text: string) => boolean; onContinue: () => void };
}

/** Renders the exercise inside its ExerciseVoiceScope, so a shuffled voice holds for everything heard in it (hooks/exerciseVoiceScope.ts). */
export function ExerciseRenderer(props: ExerciseProps & { renderType: ExerciseType }) {
  return (
    <ExerciseVoiceScope.Provider value={props.exercise}>
      <ExerciseByType {...props} />
    </ExerciseVoiceScope.Provider>
  );
}

/**
 * Dispatches on the RESOLVED render type (hooks/useLessonEngine.ts's
 * `current.renderType`), not `exercise.type` — a composite exercise's
 * authored type is `type_in`, but it may be resolved to render as
 * `word_bank` (API_SPEC.md §2.5). See domain/exerciseResolution.ts.
 */
function ExerciseByType({
  exercise,
  renderType,
  onSubmit,
  disabled,
  courseCode,
  keyboardMode,
  autoplayAudio,
  hintMap,
  textSettings,
  advance,
  reviewedAnswer,
  retype,
}: ExerciseProps & { renderType: ExerciseType }) {
  switch (renderType) {
    case "word_bank":
      return (
        <WordBankExercise
          exercise={exercise}
          onSubmit={onSubmit}
          disabled={disabled}
          courseCode={courseCode}
          autoplayAudio={autoplayAudio}
          hintMap={hintMap}
          textSettings={textSettings}
          advance={advance}
          reviewedAnswer={reviewedAnswer}
        />
      );
    case "type_in":
      return (
        <TypeInExercise
          exercise={exercise}
          onSubmit={onSubmit}
          disabled={disabled}
          courseCode={courseCode}
          keyboardMode={keyboardMode}
          autoplayAudio={autoplayAudio}
          hintMap={hintMap}
          textSettings={textSettings}
          advance={advance}
          reviewedAnswer={reviewedAnswer}
          retype={retype}
        />
      );
    case "match":
      return (
        <MatchExercise
          exercise={exercise}
          onSubmit={onSubmit}
          disabled={disabled}
          courseCode={courseCode}
          autoplayAudio={autoplayAudio}
          hintMap={hintMap}
          textSettings={textSettings}
          advance={advance}
        />
      );
    case "speak":
      return (
        <SpeakExercise
          exercise={exercise}
          onSubmit={onSubmit}
          disabled={disabled}
          courseCode={courseCode}
          autoplayAudio={autoplayAudio}
          hintMap={hintMap}
          textSettings={textSettings}
          advance={advance}
        />
      );
  }
}
