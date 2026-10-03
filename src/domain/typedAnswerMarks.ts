// Word-by-word coloring for a typed answer on the review screen: which words
// the learner got right, which were right but traded places, and which were
// wrong. Not grading — domain/answerFeedback.ts decides the verdict — just the
// same "which part was off" feedback a word bank's tiles already give, applied
// to free text by measuring its words against the closest accepted answer.
import { isPersian } from "./language";
import { foldCodepoints, normalizeStrict } from "./persian/normalize";
import { alignTiles, closestTileOrder, type AlignmentStep, type TileMark } from "./wordBankOrders";

export interface MarkedWord {
  /** The word exactly as the learner typed it — or, for a missing word, as the accepted answer writes it. */
  text: string;
  /** A missing word is one the closest accepted answer has that the learner left out, placed where it belongs (issue #38). */
  mark: TileMark | "missing";
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
 * Close enough to show what's missing: at least half the closest answer's
 * words typed in their right places. Any less and the blue words would be
 * most of a sentence — a reveal the learner didn't ask for, not a hint.
 */
const MIN_PLACED_FOR_MISSING = 0.5;

/**
 * The learner's typed words, each marked against whichever accepted answer
 * it comes closest to. A correct answer is all green: it was accepted, so any
 * word that differs was a forgiven typo, which the feedback note already
 * names. A wrong one that's close also gets the words it left out, in
 * place, marked "missing" — only words left out, not ones it misspelled.
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
  const acceptedWords = acceptedAnswers.map(words);
  const orders = acceptedWords.map((answer) => answer.map((word) => wordKey(word, persian)));
  const typedKeys = typed.map((word) => wordKey(word, persian));
  const { order, marks } = closestTileOrder(typedKeys, orders);
  const marked: MarkedWord[] = typed.map((text, i) => ({ text, mark: marks[i] }));

  // A swapped pair has every word there already; nothing to add.
  const placed = marks.filter((mark) => mark === "right").length;
  if (marks.includes("swapped") || placed === order.length || placed < order.length * MIN_PLACED_FOR_MISSING) return marked;

  const answerWords = acceptedWords[orders.indexOf(order)];
  const result: MarkedWord[] = [];
  for (const run of unmatchedRuns(alignTiles(typedKeys, order))) {
    // A run with a typed word in it is that word standing in for the missing
    // one — a misspelling, already red, not something left out. Only a run
    // of nothing but missing words is a gap.
    const substitution = run.some((step) => step.kind === "extra");
    for (const step of run) {
      if (step.kind !== "missing") result.push(marked[step.submitted]);
      else if (!substitution) result.push({ text: answerWords[step.answer], mark: "missing" });
    }
  }
  return result;
}

/** The alignment cut into its matches, each on its own, and the unmatched stretches between them. */
function unmatchedRuns(steps: AlignmentStep[]): AlignmentStep[][] {
  const runs: AlignmentStep[][] = [];
  for (const step of steps) {
    const last = runs[runs.length - 1];
    if (step.kind !== "match" && last && last[0].kind !== "match") last.push(step);
    else runs.push([step]);
  }
  return runs;
}
