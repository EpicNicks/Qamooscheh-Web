// Retyping the correct answer after a wrong typed one (issue #44). Optional,
// and it never changes the answer's grade, score or requeueing: a match is
// only sent as that item's `retypeText`, which earns retype XP
// (priced by the grader, API_SPEC.md §2.3 point 8) and nothing else.
import { checkAnswer } from "./answerFeedback";
import type { ExerciseType } from "./enums";
import type { Grader } from "../grader/types";
import type { ExerciseArtifact } from "../types/content";

/**
 * How many matching retypes of one exercise a run sends: the server credits
 * the first two (2 XP, then 1) and nothing after, so a later one stays practice.
 */
export const MAX_CREDITED_RETYPES = 2;

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
  grader: Grader | null,
  courseCode: string | null | undefined,
  exercise: Pick<ExerciseArtifact, "type" | "scriptMode" | "answer" | "alternativeAnswers">,
  retyped: string,
): boolean {
  if (retyped.trim().length === 0) return false;
  return checkAnswer(grader, courseCode, exercise, retyped).verdict !== "incorrect";
}
