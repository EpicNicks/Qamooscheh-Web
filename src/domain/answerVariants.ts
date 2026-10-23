// Which accepted answer the learner is shown after a check, and its recording.
// The backend records every accepted answer (ExerciseArtifact.answerVariantAudio,
// one entry per variant, index 0 = the first answer = answerAudio), so the audio
// played has to be the variant on screen, not always the first.
import { closestAnswerFirst } from "./answerFeedback";
import { acceptedTileOrders, revealedTileOrder } from "./wordBankOrders";
import type { AudioMap, ExerciseArtifact } from "../types/content";

type VariantExercise = Pick<ExerciseArtifact, "type" | "tiles" | "answer" | "alternativeAnswers" | "answerAudio" | "answerVariantAudio">;

export function isTokenized(exercise: Pick<ExerciseArtifact, "type">): boolean {
  return exercise.type === "word_bank" || exercise.type === "match";
}

/**
 * The accepted answer the review shows first for this submission, and its
 * index in the backend's variant order (word_bank/match: 0 = `answer`, i =
 * `alternativeAnswers[i - 1]`; otherwise `answer[i]`). Uses the same choice the
 * wrong-answer screen makes (revealedTileOrder / closestAnswerFirst), so the
 * text and the audio agree. No submission keeps the authored first answer.
 */
export function shownAnswerVariant(exercise: VariantExercise, submittedText: string | undefined): { index: number; text: string } {
  if (isTokenized(exercise)) {
    const shown = revealedTileOrder(exercise, submittedText);
    const index = acceptedTileOrders(exercise).findIndex((order) => order === shown || order.join(" ") === shown.join(" "));
    return { index: Math.max(index, 0), text: shown.join(" ") };
  }
  const text = closestAnswerFirst(submittedText ?? "", exercise.answer)[0] ?? "";
  return { index: Math.max(exercise.answer.indexOf(text), 0), text };
}

/**
 * Every accepted answer as a display string, the one closest to the submission
 * first (the one `shownAnswerVariant` and the audio use) and all the others
 * after it, so "Also accepted" lists each of them. word_bank/match orders are
 * their tokens joined with spaces; identical strings collapse to one line.
 */
export function revealedAnswers(exercise: VariantExercise, submittedText: string | undefined): string[] {
  if (!isTokenized(exercise)) return closestAnswerFirst(submittedText ?? "", exercise.answer);
  const first = revealedTileOrder(exercise, submittedText);
  const orders = [first, ...acceptedTileOrders(exercise).filter((order) => order !== first)];
  return [...new Set(orders.map((order) => order.join(" ")))];
}

/** The recording of variant `index`, falling back to `answerAudio` when the field or that entry is missing, null or holds no takes. */
export function variantAudio(exercise: Pick<ExerciseArtifact, "answerAudio" | "answerVariantAudio">, index: number): AudioMap | null {
  const entry = exercise.answerVariantAudio?.[index];
  if (entry && Object.values(entry).some((takes) => takes.length > 0)) return entry;
  return exercise.answerAudio ?? null;
}
