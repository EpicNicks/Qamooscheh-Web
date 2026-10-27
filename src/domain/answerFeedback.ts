// Top-level "was this answer right" dispatcher for instant in-lesson
// feedback (never authoritative — the server re-grades every submission,
// API_SPEC.md §1). The verdict and the answer's XP come from the published
// offline grader (src/grader, API_SPEC.md §7), the same function the server
// grades with; this file builds the request, maps the response, and words the
// note that says where an accepted-but-imperfect or near-miss answer went
// wrong. A course with no published grader falls back to lib/textMatch.ts's
// plain exact-match check.
import { looksCorrect } from "../lib/textMatch";
import { acceptedTileOrders } from "./wordBankOrders";
import { isPersian } from "./language";
import { foldLatinVariance, levenshteinDistance, normalizeCase } from "./persian/answerDiff";
import { foldCodepoints, normalizeStrict, stripReadingAids, ZWNJ } from "./persian/normalize";
import type { Grader, GraderRequest, GraderResponse, SeparatorEdit } from "../grader/types";
import { explainXp } from "./xpReason";
import type { ExerciseArtifact } from "../types/content";

export type AnswerVerdict = "correct" | "accepted_with_correction" | "incorrect";

/** Where an accepted answer's separators differ from `matchedAnswer`, the accepted answer the grader matched — what the review marks (typedAnswerMarks.ts's markSeparatorGaps). */
export interface SeparatorMarks {
  matchedAnswer: string;
  edits: SeparatorEdit[];
}

export interface AnswerFeedback {
  verdict: AnswerVerdict;
  /** A short, human-readable explanation when the answer was accepted but imperfect — null otherwise (including plain "incorrect", which needs no reason). */
  note: string | null;
  /** The XP this answer earns, as the grader prices it for the attempt/hint/retype in the AnswerContext. 0 without a grader. */
  xp: number;
  /** Why `xp` is below the full award (domain/xpReason.ts); null when it paid in full or there is nothing to say. */
  xpNote: string | null;
  /** The grader's separator edits for an accepted answer whose half-spaces or spaces were off; null otherwise. */
  separators: SeparatorMarks | null;
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

function describeReasons(response: GraderResponse, submitted: string, romanized: boolean, spacingMatters: boolean): string | null {
  const labels = Object.keys(REASON_LABEL)
    .filter((reason) => response.reasons.includes(reason))
    .map((reason) => {
      let detail = "";
      if (reason === "EditDistanceTypo" && response.matchedAnswer) {
        detail = describeTypo(submitted, response.matchedAnswer, romanized);
      } else if (reason === "ZwnjOrSpacing" && spacingMatters && response.matchedAnswer && response.separatorEdits?.length) {
        detail = `needs ${response.separatorEdits.map((edit) => describeSeparatorEdit(response.matchedAnswer!, edit)).join("; ")}`;
      }
      return detail ? `${REASON_LABEL[reason]}: ${detail}` : REASON_LABEL[reason];
    });
  return labels.length === 0 ? null : `Close — ${labels.join(", ")}.`;
}

const SEPARATOR_PHRASE: Record<SeparatorEdit["kind"], string> = {
  missingZwnj: "a half-space",
  missingSpace: "a space",
  extraZwnj: "no half-space",
  extraSpace: "no space",
  spaceForZwnj: "a half-space, not a space,",
  zwnjForSpace: "a space, not a half-space,",
};

const LAST_WORD = new RegExp(`[^\\s${ZWNJ}]+$`, "u");
const FIRST_WORD = new RegExp(`^[^\\s${ZWNJ}]+`, "u");

/**
 * One of the grader's separator edits in words (issue #39) — "a half-space
 * after می" — naming the letters before it in `matchedAnswer`, or the ones
 * after when it sits at the start of a word.
 */
function describeSeparatorEdit(matchedAnswer: string, { kind, index, length }: SeparatorEdit): string {
  const before = LAST_WORD.exec(stripReadingAids(matchedAnswer.slice(0, index)))?.[0];
  if (before) return `${SEPARATOR_PHRASE[kind]} after ${isolate(before)}`;
  const next = FIRST_WORD.exec(stripReadingAids(matchedAnswer.slice(index + length)))?.[0];
  return next ? `${SEPARATOR_PHRASE[kind]} before ${isolate(next)}` : SEPARATOR_PHRASE[kind];
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
    return { verdict: looksCorrect(submittedText, accepted) ? "correct" : "incorrect", note: null, xp: 0, xpNote: null, separators: null };
  }

  const verdict = verdictOf(response);
  const xp = response.xp ?? 0;
  const xpNote = explainXp(xp, response.xpBase, response.xpReasons, response.xpLines);
  // Selection-based: a typo is structurally impossible either way, and there is nothing typed to describe.
  if (selection) return { verdict, note: null, xp, xpNote, separators: null };

  // An incorrect typed answer gets no note: a separator difference alone is
  // accepted with correction by the grader, so a wrong answer is wrong for
  // more than its spacing.
  if (verdict === "incorrect") return { verdict, note: null, xp, xpNote, separators: null };
  const romanized = exercise.scriptMode === "romanized";
  const spacingMatters = isPersian(courseCode) && !romanized;
  const edits = response.separatorEdits ?? [];
  const separators = spacingMatters && response.matchedAnswer && edits.length > 0 ? { matchedAnswer: response.matchedAnswer, edits } : null;
  return { verdict, note: describeReasons(response, submittedText, romanized, spacingMatters), xp, xpNote, separators };
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
