import type { ExerciseType } from "../../domain/enums";
import type { ExerciseArtifact } from "../../types/content";
import { WordBankExercise } from "./WordBankExercise";
import { TypeInExercise } from "./TypeInExercise";
import { MatchExercise } from "./MatchExercise";
import { SpeakExercise } from "./SpeakExercise";

export interface ExerciseProps {
  exercise: ExerciseArtifact;
  onSubmit: (submittedText: string, opts?: { usedHint?: boolean }) => void;
  disabled?: boolean;
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
}: ExerciseProps & { renderType: ExerciseType }) {
  switch (renderType) {
    case "word_bank":
      return <WordBankExercise exercise={exercise} onSubmit={onSubmit} disabled={disabled} />;
    case "type_in":
      return <TypeInExercise exercise={exercise} onSubmit={onSubmit} disabled={disabled} />;
    case "match":
      return <MatchExercise exercise={exercise} onSubmit={onSubmit} disabled={disabled} />;
    case "speak":
      return <SpeakExercise exercise={exercise} onSubmit={onSubmit} disabled={disabled} />;
  }
}
