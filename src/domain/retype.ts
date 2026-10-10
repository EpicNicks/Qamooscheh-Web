// Retyping the correct answer after a wrong typed one (issue #44). Optional,
// and it never changes the answer's grade, score or requeueing: a match is
// only sent as that item's `retypeText`, which earns retype XP
// (domain/xp.ts, API_SPEC.md §2.3 point 8) and nothing else.
import { checkAnswer } from "./answerFeedback";
import type { ExerciseType } from "./enums";
import type { ExerciseArtifact } from "../types/content";

/** Whether the review of an answer offers a retype: only a typed (type_in) answer, and only a wrong one. */
export function needsRetype(renderType: ExerciseType, correct: boolean): boolean {
  return renderType === "type_in" && !correct;
}

/**
 * Whether a retype matches any accepted answer, compared exactly as the
 * exercise's own answer was (domain/answerFeedback.ts's checkAnswer) — so a
 * forgiven typo passes here too.
 */
export function retypeMatches(
  courseCode: string | null | undefined,
  exercise: Pick<ExerciseArtifact, "type" | "scriptMode" | "answer" | "alternativeAnswers">,
  retyped: string,
): boolean {
  if (retyped.trim().length === 0) return false;
  return checkAnswer(courseCode, exercise, retyped).verdict !== "incorrect";
}
