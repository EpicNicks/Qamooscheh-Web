// API_SPEC.md §2.5's "exercise resolution step", client half. An exercise is
// "composite" when it carries both a nonempty `answer` and nonempty `tiles`.
// The FIRST time a composite exercise is shown in a lesson, which mode it
// renders in should come from the learner's FSRS state for that lexeme tag
// (new/recently-lapsed -> word_bank, established -> type_in) — "recall
// first, multiple choice only when warranted." The server independently
// re-derives the served mode at grading time and never trusts this choice
// (§2.3 point 1), so getting this heuristic exactly right is a UX quality
// question, not a correctness one.
//
// SIMPLIFIED for this general-components pass: the real rule needs
// LexemeCard.State.IsNew and a recent-lapse check, which need the full FSRS
// retrievability model this client doesn't implement. What's available here
// is lib/cardStateStore.ts's local mirror (reviewCount/lapseCount from the
// last time the server graded this tag). Treat this as a placeholder to
// replace once FSRS state is available client-side, not the final rule.
import type { CardState } from "../types/api";
import type { ExerciseArtifact } from "../types/content";
import type { ExerciseType } from "./enums";

export function isComposite(exercise: ExerciseArtifact): boolean {
  return exercise.type === "type_in" && !!exercise.tiles && exercise.tiles.length > 0;
}

/**
 * Resolves which mode to render a (possibly composite) exercise in, given
 * the learner's locally-known card state for its primary tag (or `null` for
 * a lexeme the client has no local history for — the "new card" case).
 */
export function resolveExerciseType(exercise: ExerciseArtifact, cardState: CardState | null): ExerciseType {
  if (!isComposite(exercise)) return exercise.type;

  const isNew = cardState == null;
  const recentlyLapsed = cardState != null && cardState.lapseCount > 0 && cardState.reviewCount <= cardState.lapseCount + 1;
  return isNew || recentlyLapsed ? "word_bank" : "type_in";
}
