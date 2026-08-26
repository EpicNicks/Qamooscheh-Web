// Top-level "was this answer right" dispatcher for instant in-lesson
// feedback (never authoritative — the server re-grades every submission,
// API_SPEC.md §1). Mirrors AnswerComparatorCatalog.For's dispatch on
// (ExerciseType, ScriptMode), scoped further by course language: Persian
// exercises go through domain/persian's faithful comparator port; every
// other course (including one this client doesn't recognize) falls back to
// lib/textMatch.ts's plain exact-match check.
import { isPersian } from "./language";
import { looksCorrect } from "../lib/textMatch";
import { compareExact, compareNative, compareRomanized, compareSpeak, type CorrectionReason } from "./persian/comparators";
import type { ExerciseArtifact } from "../types/content";

export type AnswerVerdict = "correct" | "accepted_with_correction" | "incorrect";

export interface AnswerFeedback {
  verdict: AnswerVerdict;
  /** A short, human-readable explanation when the answer was accepted but imperfect — null otherwise (including plain "incorrect", which needs no reason). */
  note: string | null;
}

const REASON_LABEL: Record<CorrectionReason, string> = {
  codepoint_substitution: "used the Arabic form of a letter instead of the Persian one",
  zwnj_or_spacing: "the half-space (ZWNJ) was off",
  edit_distance_typo: "a small typo",
  latinization_variance: "romanization spelling",
};

function describeReasons(reasons: CorrectionReason[]): string | null {
  if (reasons.length === 0) return null;
  return `Close — ${reasons.map((r) => REASON_LABEL[r]).join(", ")}.`;
}

export function checkAnswer(
  courseCode: string | null | undefined,
  exercise: Pick<ExerciseArtifact, "type" | "scriptMode" | "answer">,
  submittedText: string,
): AnswerFeedback {
  if (exercise.type === "word_bank" || exercise.type === "match") {
    // Selection-based: a typo is structurally impossible either way.
    const result = isPersian(courseCode) ? compareExact(submittedText, exercise.answer) : null;
    const correct = result ? result.verdict === "correct" : looksCorrect(submittedText, exercise.answer);
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

  return { verdict: result.verdict, note: describeReasons(result.reasons) };
}
