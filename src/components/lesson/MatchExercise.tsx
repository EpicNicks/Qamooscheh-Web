import { WordBankExercise } from "./WordBankExercise";
import type { ExerciseProps } from "./ExerciseRenderer";

/**
 * `match`-type exercises share the tile-selection shape `word_bank` uses —
 * ExerciseArtifact carries the same `tiles`/`answer` fields for both, and
 * nothing in the content schema distinguishes a separate pairing structure
 * (see Qamooscheh.Content's ExerciseArtifact). A true matching-pairs UI
 * (grid of cards to connect) is a presentation refinement for later, not a
 * different grading contract — reusing the tile picker keeps this correct
 * now rather than half-building a richer UI ahead of the content shape that
 * would drive it.
 */
export function MatchExercise(props: ExerciseProps) {
  return <WordBankExercise {...props} />;
}
