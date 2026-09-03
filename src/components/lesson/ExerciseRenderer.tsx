import type { ExerciseType, KeyboardMode } from "../../domain/enums";
import type { HintSettings, WordHint } from "../../domain/romanization";
import type { ExerciseArtifact } from "../../types/content";
import { WordBankExercise } from "./WordBankExercise";
import { TypeInExercise } from "./TypeInExercise";
import { MatchExercise } from "./MatchExercise";
import { SpeakExercise } from "./SpeakExercise";

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
  /** Which of a word's hints (translation, phonetic reading) are actually enabled right now — see domain/romanization.ts's HintSettings. */
  hintSettings?: HintSettings;
  /**
   * Set once this exercise has been answered and is waiting on the learner
   * to explicitly confirm before the lesson moves on — every exercise
   * type's own submit control becomes this instead (not a second button
   * alongside it), so there's exactly one "next step" affordance on screen
   * at a time. The exercise is expected to already be rendered `disabled`
   * whenever this is set.
   */
  advance?: { label: string; onAdvance: () => void };
}

/**
 * Dispatches on the RESOLVED render type (hooks/useLessonEngine.ts's
 * `current.renderType`), not `exercise.type` — a composite exercise's
 * authored type is `type_in`, but it may be resolved to render as
 * `word_bank` (API_SPEC.md §2.5). See domain/exerciseResolution.ts.
 */
export function ExerciseRenderer({
  exercise,
  renderType,
  onSubmit,
  disabled,
  courseCode,
  keyboardMode,
  autoplayAudio,
  hintMap,
  hintSettings,
  advance,
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
          hintSettings={hintSettings}
          advance={advance}
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
          hintSettings={hintSettings}
          advance={advance}
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
          hintSettings={hintSettings}
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
          hintSettings={hintSettings}
          advance={advance}
        />
      );
  }
}
