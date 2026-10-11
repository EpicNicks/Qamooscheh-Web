// Top-level "was this answer right" dispatcher for instant in-lesson
// feedback (never authoritative — the server re-grades every submission,
// API_SPEC.md §1). The verdict and the answer's XP come from the published
// offline grader (src/grader, API_SPEC.md §7), the same function the server
// grades with; this file builds the request, maps the response, and words the
// note that says where an accepted-but-imperfect or near-miss answer went
// wrong. A course with no published grader falls back to lib/textMatch.ts's
// plain exact-match check.
import { isPersian } from "./language";
import { looksCorrect } from "../lib/textMatch";
import { acceptedTileOrders } from "./wordBankOrders";
import {
  foldLatinVariance,
  levenshteinDistance,
  normalizeCase,
  separatorMistakes,
  type SeparatorMistake,
} from "./persian/answerDiff";
import { foldCodepoints, normalizeStrict } from "./persian/normalize";
import type { Grader, GraderRequest, GraderResponse } from "../grader/types";
import type { ExerciseArtifact } from "../types/content";

export type AnswerVerdict = "correct" | "accepted_with_correction" | "incorrect";

export interface AnswerFeedback {
  verdict: AnswerVerdict;
  /** A short, human-readable explanation when the answer was accepted but imperfect — null otherwise (including plain "incorrect", which needs no reason). */
  note: string | null;
  /** The XP this answer earns, as the grader prices it for the attempt/hint/retype in the AnswerContext. 0 without a grader. */
  xp: number;
}

/** What the answer's XP depends on besides its verdict (API_SPEC.md §2.3 point 8). Omitted: a first attempt without a hint. */
export interface AnswerContext {
  /** 1-indexed. */
  attempt?: number;
  usedHint?: boolean;
  /** Grades the optional retype after a wrong typed answer (domain/retype.ts); `retypeNumber` is which correct retype of the exercise this is. */
  retype?: boolean;
  retypeNumber?: number;
}

type GradedExercise = Pick<ExerciseArtifact, "type" | "scriptMode" | "answer" | "alternativeAnswers">;

/** The grader's names for the reasons it forgave an answer. The Japanese grader's own reasons have no wording here and add no note. */
const REASON_LABEL: Record<string, string> = {
  CodepointSubstitution: "used the Arabic form of a letter instead of the Persian one",
  ZwnjOrSpacing: "the half-space (ZWNJ) was off",
  LatinizationVariance: "romanization spelling",
  EditDistanceTypo: "a small typo",
};

/** A word in an English sentence, isolated so a Persian one keeps its place in the line. */
function isolate(word: string): string {
  return `\u2068${word}\u2069`;
}

/**
 * Which words a forgiven typo was in (issue #42) — "خانه, not خانا" — by
 * lining `submitted` up word for word with the answer it was matched to,
 * each word compared the way the grader compared the whole. When the
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

function describeReasons(response: GraderResponse, submitted: string, accepted: readonly string[], romanized: boolean, spacingMatters: boolean): string | null {
  const labels = Object.keys(REASON_LABEL)
    .filter((reason) => response.reasons.includes(reason))
    .map((reason) => {
      let detail = "";
      if (reason === "EditDistanceTypo" && response.matchedAnswer) {
        detail = describeTypo(submitted, response.matchedAnswer, romanized);
      } else if (reason === "ZwnjOrSpacing" && spacingMatters) {
        const mistakes = separatorMistakes(submitted, response.matchedAnswer ? [response.matchedAnswer, ...accepted] : accepted);
        if (mistakes && mistakes.length > 0) detail = `needs ${mistakes.map(describeSeparator).join("; ")}`;
      }
      return detail ? `${REASON_LABEL[reason]}: ${detail}` : REASON_LABEL[reason];
    });
  return labels.length === 0 ? null : `Close — ${labels.join(", ")}.`;
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

function verdictOf(response: GraderResponse): AnswerVerdict {
  return response.verdict === "Correct" ? "correct" : response.verdict === "AcceptedWithCorrection" ? "accepted_with_correction" : "incorrect";
}

/** The grader's spelling of an exercise's type and script (GraderCore.TryParseExerciseType / TryParseScriptMode; both are case-insensitive). */
function graderRequest(exercise: GradedExercise, submittedText: string, context: AnswerContext): GraderRequest {
  const selection = exercise.type === "word_bank" || exercise.type === "match";
  return {
    exerciseType: { word_bank: "WordBank", type_in: "TypeIn", match: "Match", speak: "Speak" }[exercise.type],
    scriptMode: exercise.scriptMode === "romanized" ? "Romanized" : "Native",
    submitted: submittedText,
    // A selection's `answer` is the ordered tiles of ONE correct selection, which the grader joins itself; the other correct orders go alongside.
    acceptedAnswers: exercise.answer,
    alternativeAnswers: selection ? exercise.alternativeAnswers : undefined,
    ...context,
  };
}

/**
 * The feedback for `submittedText` against `exercise`: the verdict and XP
 * from `grader`, plus the note. Without a grader (a course none is published
 * for), or when it can't interpret the request, a plain exact-match check
 * stands in and earns no XP.
 */
export function checkAnswer(
  grader: Grader | null,
  courseCode: string | null | undefined,
  exercise: GradedExercise,
  submittedText: string,
  context: AnswerContext = {},
): AnswerFeedback {
  const selection = exercise.type === "word_bank" || exercise.type === "match";
  const response = grader?.gradeEnvelope(graderRequest(exercise, submittedText, context));

  if (!response || response.error) {
    if (grader) console.warn("The grader couldn't interpret an answer; falling back to an exact match", response?.error);
    // Selection-based `answer`s are tiles (see graderRequest), so the plain check needs them joined.
    const accepted = selection ? acceptedTileOrders(exercise).map((order) => order.join(" ")) : exercise.answer;
    return { verdict: looksCorrect(submittedText, accepted) ? "correct" : "incorrect", note: null, xp: 0 };
  }

  const verdict = verdictOf(response);
  const xp = response.xp ?? 0;
  // Selection-based: a typo is structurally impossible either way, and there is nothing typed to describe.
  if (selection) return { verdict, note: null, xp };

  const romanized = exercise.scriptMode === "romanized";
  if (verdict === "incorrect") {
    // A speak exercise's answer is typed too until speech capture is wired up
    // (SpeakExercise.tsx); once speech recognition decides its spacing, the
    // learner shouldn't hear about it.
    const spacing = isPersian(courseCode) && !romanized ? describeSeparatorMistakes(submittedText, exercise.answer) : null;
    return { verdict, note: spacing, xp };
  }
  return { verdict, note: describeReasons(response, submittedText, exercise.answer, romanized, isPersian(courseCode) && !romanized), xp };
}

/**
 * `answers` with whichever is closest to what the learner submitted first
 * (issue #42), so a revealed answer is the one they were nearest to rather
 * than whichever was authored first. Ties, and an empty submission, keep the
 * authored order. Folds the way the Persian grader does; for any other
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
