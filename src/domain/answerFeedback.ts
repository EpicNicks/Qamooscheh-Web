// Top-level "was this answer right" dispatcher for instant in-lesson
// feedback (never authoritative — the server re-grades every submission,
// API_SPEC.md §1). Mirrors AnswerComparatorCatalog.For's dispatch on
// (ExerciseType, ScriptMode), scoped further by course language: Persian
// exercises go through domain/persian's faithful comparator port; every
// other course (including one this client doesn't recognize) falls back to
// lib/textMatch.ts's plain exact-match check.
import { isPersian } from "./language";
import { looksCorrect } from "../lib/textMatch";
import { acceptedTileOrders } from "./wordBankOrders";
import {
  compareExact,
  compareNative,
  compareRomanized,
  compareSpeak,
  foldLatinVariance,
  levenshteinDistance,
  normalizeCase,
  separatorMistakes,
  type CorrectionReason,
  type PersianComparisonResult,
  type SeparatorMistake,
} from "./persian/comparators";
import { foldCodepoints, normalizeStrict } from "./persian/normalize";
import type { ExerciseArtifact } from "../types/content";

export type AnswerVerdict = "correct" | "accepted_with_correction" | "incorrect";

export interface AnswerFeedback {
  verdict: AnswerVerdict;
  /** A short, human-readable explanation when the answer was accepted but imperfect — null otherwise (including plain "incorrect", which needs no reason). */
  note: string | null;
}

const REASON_LABEL: Record<CorrectionReason, string> = {
  codepoint_substitution: "used the Arabic form of a letter instead of the Persian one",
  edit_distance_typo: "a small typo",
  latinization_variance: "romanization spelling",
};


/** A word in an English sentence, isolated so a Persian one keeps its place in the line. */
function isolate(word: string): string {
  return `\u2068${word}\u2069`;
}

/**
 * Which words a forgiven typo was in (issue #42) — "خانه, not خانا" — by
 * lining `submitted` up word for word with the answer it was matched to,
 * each word compared the way the comparator compared the whole. When the
 * words don't line up (a romanized typo that added or dropped a space), the
 * whole answer stands in for them.
 */
function describeTypo(submitted: string, matchedAnswer: string, romanized: boolean): string {
  const words = (text: string) => (romanized ? normalizeCase(text) : normalizeStrict(text)).split(" ");
  const fold = romanized ? foldLatinVariance : foldCodepoints;
  const typedWords = words(submitted);
  const acceptedWords = words(matchedAnswer);
  if (typedWords.length !== acceptedWords.length) return `it's ${isolate(acceptedWords.join(" "))}`;
  return acceptedWords
    .map((accepted, i) => ({ accepted, typed: typedWords[i] }))
    .filter(({ accepted, typed }) => fold(accepted) !== fold(typed))
    .map(({ accepted, typed }) => `${isolate(accepted)}, not ${isolate(typed)}`)
    .join("; ");
}

function describeReasons(result: PersianComparisonResult, submitted: string, romanized: boolean): string | null {
  if (result.reasons.length === 0) return null;
  const labels = result.reasons.map((r) => REASON_LABEL[r]);
  const typoAt = result.reasons.indexOf("edit_distance_typo");
  if (typoAt >= 0 && result.matchedAnswer !== null) {
    const typo = describeTypo(submitted, result.matchedAnswer, romanized);
    if (typo) labels[typoAt] += `: ${typo}`;
  }
  return `Close — ${labels.join(", ")}.`;
}

function describeSeparator({ after, expected, typed }: SeparatorMistake): string {
  const what =
    expected === "none"
      ? `no ${typed} after`
      : typed === "none"
        ? `a ${expected} after`
        : `a ${expected}, not a ${typed}, after`;
  return `${what} ${isolate(after)}`;
}

/**
 * Where a typed answer's spacing went wrong when its letters are all right
 * (issue #39) — "Needs a half-space after می." Null when some letter is off
 * too, since then the spacing isn't the whole story.
 */
function describeSeparatorMistakes(submitted: string, acceptedAnswers: readonly string[]): string | null {
  const mistakes = separatorMistakes(submitted, acceptedAnswers);
  if (!mistakes || mistakes.length === 0) return null;
  return `Needs ${mistakes.map(describeSeparator).join("; ")}.`;
}

export function checkAnswer(
  courseCode: string | null | undefined,
  exercise: Pick<ExerciseArtifact, "type" | "scriptMode" | "answer" | "alternativeAnswers">,
  submittedText: string,
): AnswerFeedback {
  if (exercise.type === "word_bank" || exercise.type === "match") {
    // Selection-based: a typo is structurally impossible either way. Unlike
    // every other exercise type, `answer` here is the ordered tokens of ONE
    // correct selection (matching `tiles`' granularity), not a list of
    // alternative whole-answer strings — WordBankExercise submits them
    // space-joined, so join here too before comparing. Any listed
    // alternative order is just as correct (domain/wordBankOrders.ts).
    const acceptedAnswer = acceptedTileOrders(exercise).map((order) => order.join(" "));
    const result = isPersian(courseCode) ? compareExact(submittedText, acceptedAnswer) : null;
    const correct = result ? result.verdict === "correct" : looksCorrect(submittedText, acceptedAnswer);
    return { verdict: correct ? "correct" : "incorrect", note: null };
  }

  if (!isPersian(courseCode)) {
    // No language-specific comparator built for this course yet — fall
    // back to the generic exact-match check every exercise type used
    // before this pass.
    return { verdict: looksCorrect(submittedText, exercise.answer) ? "correct" : "incorrect", note: null };
  }

  const result =
    exercise.type === "speak"
      ? compareSpeak(submittedText, exercise.answer, exercise.scriptMode)
      : exercise.scriptMode === "romanized"
        ? compareRomanized(submittedText, exercise.answer)
        : compareNative(submittedText, exercise.answer);

  // A speak exercise's answer is typed too until speech capture is wired up
  // (SpeakExercise.tsx); once speech recognition decides its spacing, the
  // learner shouldn't hear about it.
  if (result.verdict === "incorrect" && exercise.scriptMode !== "romanized") {
    return { verdict: "incorrect", note: describeSeparatorMistakes(submittedText, exercise.answer) };
  }
  return { verdict: result.verdict, note: describeReasons(result, submittedText, exercise.scriptMode === "romanized") };
}

/**
 * `answers` with whichever is closest to what the learner submitted first
 * (issue #42), so a revealed answer is the one they were nearest to rather
 * than whichever was authored first. Ties, and an empty submission, keep the
 * authored order. Folds the way the Persian comparators do; for any other
 * language that folding only touches case and spacing.
 */
export function closestAnswerFirst(submitted: string, answers: readonly string[]): string[] {
  const fold = (text: string) => foldCodepoints(normalizeStrict(text)).toLowerCase();
  const typed = fold(submitted);
  if (typed === "" || answers.length < 2) return [...answers];
  return answers
    .map((answer, i) => ({ answer, i, distance: levenshteinDistance(typed, fold(answer)) }))
    .sort((a, b) => a.distance - b.distance || a.i - b.i)
    .map(({ answer }) => answer);
}
