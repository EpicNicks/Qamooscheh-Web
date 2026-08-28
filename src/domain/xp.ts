// Purely cosmetic, client-only "XP" for the in-lesson pop animation and the
// end-of-lesson summary. There is no per-answer XP anywhere in the API —
// SubmittedItem/SubmittedSessionResponse (types/api.ts) carry FSRS card
// state only, and ActivityResponse.xp is a daily aggregate the backend
// computes server-side, unrelated to any one answer. This value is never
// sent anywhere; it exists only to make a correct answer feel rewarding.
import type { AnswerVerdict } from "./answerFeedback";

/** attempt is 1-indexed (see useLessonEngine's `current.attempt + 1`). */
export function xpForAnswer(verdict: AnswerVerdict, attempt: number, usedHint: boolean): number {
  if (verdict === "incorrect") return 0;

  const base = verdict === "correct" && attempt === 1 ? 10 : verdict === "correct" ? 5 : 7;
  return usedHint ? Math.round(base / 2) : base;
}
