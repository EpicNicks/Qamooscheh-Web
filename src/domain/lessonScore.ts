// The lesson pass mark, mirroring the backend's ExerciseScore
// (SessionSubmit/ExerciseScore.cs): a lesson completes its skill only when
// every exercise was answered AND the first attempts score at least 75%, each
// exercise weighted Correct = 1, AcceptedWithCorrection = 0.5, otherwise 0.
// The server's own verdict (SubmittedSessionResponse.lessonCompleted) is what
// counts; this lets the recap say the same thing without waiting on it, and
// covers a session that was queued offline.
import type { AnswerVerdict } from "./answerFeedback";

export const LESSON_PASS_THRESHOLD = 0.75;

export function verdictWeight(verdict: AnswerVerdict): number {
  return verdict === "correct" ? 1 : verdict === "accepted_with_correction" ? 0.5 : 0;
}
