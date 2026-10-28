// The lesson pass mark, mirroring the backend's ExerciseScore
// (SessionSubmit/ExerciseScore.cs): a lesson completes its skill only when
// every exercise was answered AND the score is at least 75%. Each exercise
// counts once, weighted Correct = 1, AcceptedWithCorrection = 0.5, otherwise
// 0, halved for each attempt before the one that got it right
// (Qamooscheh-Backend#86): right on attempt 2 is worth half, on attempt 3 a
// quarter, and never right is 0.
// The server's own verdict (SubmittedSessionResponse.lessonCompleted) is what
// counts; this lets the recap say the same thing without waiting on it, and
// covers a session that was queued offline.
import type { AnswerVerdict } from "./answerFeedback";

export const LESSON_PASS_THRESHOLD = 0.75;

/** What each attempt before the right one multiplies a lesson exercise's credit by. */
export const RETRY_CREDIT_FACTOR = 0.5;

export function verdictWeight(verdict: AnswerVerdict): number {
  return verdict === "correct" ? 1 : verdict === "accepted_with_correction" ? 0.5 : 0;
}

/**
 * One answer's lesson credit: its verdictWeight, halved for each attempt
 * before it (`attempt` is 1-indexed). 0 for an attempt below 1. An exercise
 * is asked again only after a wrong answer, so its one right attempt is its
 * best and the only one that adds anything.
 */
export function retryWeight(verdict: AnswerVerdict, attempt: number): number {
  return attempt < 1 ? 0 : verdictWeight(verdict) * RETRY_CREDIT_FACTOR ** (attempt - 1);
}
