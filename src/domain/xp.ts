// The XP one answered exercise attempt is worth (API_SPEC.md §2.3 point 8): a
// TypeScript port of the backend's Qamooscheh.Domain.Grading.AnswerXp, the
// function the server sums over a submitted session (SessionXp). So the "+N
// XP" pop shows what the server credits for that answer — barring the session
// rules only the server applies (which correct retype of an exercise this is,
// nothing after an exercise's first correct attempt), which the pages honor
// themselves.
//
// A stopgap: the web doesn't load the offline grader build, which returns
// this same number on every grading call. Remove this port when web issue #71
// (WASI grader) lands. xp.test.ts checks it against xp-vectors.json, the
// backend's own conformance table.
import type { AnswerVerdict } from "./answerFeedback";

const FIRST_TRY_XP = 10;
const ACCEPTED_WITH_CORRECTION_XP = 7;
const RETRY_XP = 3;
const RETYPE_XP = 2;
const SECOND_RETYPE_XP = 1;

/**
 * attempt is 1-indexed (see useLessonEngine's `current.attempt + 1`).
 * `retype` prices a retype of the answer after a wrong typed attempt
 * (domain/retype.ts): `verdict` is then the retype's own, `attempt` and
 * `usedHint` the wrong attempt's, and `retypeNumber` counts the exercise's
 * correct retypes this run, this one included: the first earns 2, the second
 * 1, any further one nothing. A hint halves the award, rounding half up (7
 * becomes 4, 3 becomes 2, 2 and 1 become 1). Answer speed is not an input.
 */
export function xpForAnswer(
  verdict: AnswerVerdict,
  attempt: number,
  usedHint: boolean,
  retype = false,
  retypeNumber = 1,
): number {
  if (verdict === "incorrect") return 0;

  const award = retype
    ? retypeNumber === 1
      ? RETYPE_XP
      : retypeNumber === 2
        ? SECOND_RETYPE_XP
        : 0
    : attempt !== 1
      ? RETRY_XP
      : verdict === "accepted_with_correction"
        ? ACCEPTED_WITH_CORRECTION_XP
        : FIRST_TRY_XP;
  return usedHint ? Math.round(award / 2) : award;
}
