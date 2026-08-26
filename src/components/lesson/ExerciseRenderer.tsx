import type { ExerciseType, KeyboardMode } from "../../domain/enums";
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
}: ExerciseProps & { renderType: ExerciseType }) {
  switch (renderType) {
    case "word_bank":
      return <WordBankExercise exercise={exercise} onSubmit={onSubmit} disabled={disabled} courseCode={courseCode} />;
    case "type_in":
      return (
        <TypeInExercise
          exercise={exercise}
          onSubmit={onSubmit}
          disabled={disabled}
          courseCode={courseCode}
          keyboardMode={keyboardMode}
        />
      );
    case "match":
      return <MatchExercise exercise={exercise} onSubmit={onSubmit} disabled={disabled} courseCode={courseCode} />;
    case "speak":
      return <SpeakExercise exercise={exercise} onSubmit={onSubmit} disabled={disabled} courseCode={courseCode} />;
  }
}
