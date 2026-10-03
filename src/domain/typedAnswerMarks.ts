// Word-by-word coloring for a typed answer on the review screen: which words
// the learner got right, which were right but traded places, and which were
// wrong. Not grading — domain/answerFeedback.ts decides the verdict — just the
// same "which part was off" feedback a word bank's tiles already give, applied
// to free text by measuring its words against the closest accepted answer.
import { isPersian } from "./language";
import { foldCodepoints, normalizeStrict } from "./persian/normalize";
import { closestTileOrder, type TileMark } from "./wordBankOrders";

export interface MarkedWord {
  /** The word exactly as the learner typed it. */
  text: string;
  mark: TileMark;
}

// Punctuation never decides whether a word is right ("salam!" is "salam"),
// and neither do case or, in Persian, an Arabic codepoint the comparator
// itself already forgives. A half-space does: it's spelling (issue #39).
function wordKey(word: string, persian: boolean): string {
  const base = word.toLowerCase().replace(/[\p{P}\p{S}]/gu, "");
  return persian ? foldCodepoints(normalizeStrict(base)) : base;
}

function words(text: string): string[] {
  return text.trim().split(/\s+/).filter((word) => word !== "");
}

/**
 * The learner's typed words, each marked against whichever accepted answer
 * it comes closest to. A correct answer is all green: it was accepted, so any
 * word that differs was a forgiven typo, which the feedback note already
 * names.
 */
export function markTypedAnswer(
  courseCode: string | null | undefined,
  acceptedAnswers: readonly string[],
  submitted: string,
  correct: boolean,
): MarkedWord[] {
  const typed = words(submitted);
  if (correct) return typed.map((text) => ({ text, mark: "right" }));
  const persian = isPersian(courseCode);
  const orders = acceptedAnswers.map((answer) => words(answer).map((word) => wordKey(word, persian)));
  const { marks } = closestTileOrder(
    typed.map((word) => wordKey(word, persian)),
    orders,
  );
  return typed.map((text, i) => ({ text, mark: marks[i] }));
}
