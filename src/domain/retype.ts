// Retyping the correct answer after a wrong typed one (issue #44): practice
// only. Nothing here feeds grading, score, XP, requeueing or what the
// session submits — the answer that counted was already recorded before the
// retype is offered, and a retype is never handed to an engine.
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
