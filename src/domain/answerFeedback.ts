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
  separatorMistakes,
  type CorrectionReason,
  type SeparatorMistake,
} from "./persian/comparators";
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

function describeReasons(reasons: CorrectionReason[]): string | null {
  if (reasons.length === 0) return null;
  return `Close — ${reasons.map((r) => REASON_LABEL[r]).join(", ")}.`;
}

/** A word in an English sentence, isolated so a Persian one keeps its place in the line. */
function isolate(word: string): string {
  return `\u2068${word}\u2069`;
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
  return { verdict: result.verdict, note: describeReasons(result.reasons) };
}
