// Short grammar reminders for common mistakes, shown on the word the review
// screen marks (issue #59). Each hint is keyed by the kind of mistake it
// explains, so adding one is a new kind, its text and its detection here.
import { isPersian } from "./language";
import { foldCodepoints, normalizeStrict } from "./persian/normalize";

export type MistakeKind = "missingRa";

export const MISTAKE_HINTS: Record<MistakeKind, string> = {
  missingRa:
    "را marks a specific (definite) direct object. It follows the object: کتاب را خواندم, I read the book. Leave it out for an indefinite object: کتابی خواندم.",
};

const RA = "را";

/**
 * The common mistake a marked word of a correction shows, if it's one there's
 * a hint for: a typed answer's word (typedAnswerMarks.ts) or a word-bank tile
 * the learner left out ("missing" either way).
 */
export function mistakeKind(courseCode: string | null | undefined, word: { text: string; mark: string }): MistakeKind | null {
  if (!isPersian(courseCode) || word.mark !== "missing") return null;
  return foldCodepoints(normalizeStrict(word.text)) === RA ? "missingRa" : null;
}
