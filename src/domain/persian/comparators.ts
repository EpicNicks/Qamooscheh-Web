// Client-side mirror of Qamooscheh.Persian's comparator strategies
// (AnswerComparatorCatalog + TypeInComparator/RomanizedComparator/
// ExactMatchComparatorBase/SpeakComparator), for instant in-lesson feedback
// only — see normalize.ts's header comment. Tuning constants (edit-distance
// budgets, minimum lengths) are copied verbatim from those files; if the
// backend's tuning changes, this drifts until re-synced by re-reading them.
import { foldCodepoints, normalizeStrict, stripSeparators } from "./normalize";

export type AnswerVerdict = "correct" | "accepted_with_correction" | "incorrect";

export type CorrectionReason = "codepoint_substitution" | "zwnj_or_spacing" | "edit_distance_typo" | "latinization_variance";

export interface PersianComparisonResult {
  verdict: AnswerVerdict;
  matchedAnswer: string | null;
  reasons: CorrectionReason[];
}

const INCORRECT: PersianComparisonResult = { verdict: "incorrect", matchedAnswer: null, reasons: [] };

function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[rows - 1][cols - 1];
}

function verdictRank(v: AnswerVerdict): number {
  return v === "correct" ? 2 : v === "accepted_with_correction" ? 1 : 0;
}

function better(current: PersianComparisonResult, candidate: PersianComparisonResult): PersianComparisonResult {
  return verdictRank(candidate.verdict) > verdictRank(current.verdict) ? candidate : current;
}

/** Mirrors TypeInComparator(maxEditDistance = 1, minLengthForEditTolerance = 4). */
export function compareNative(
  submitted: string,
  acceptedAnswers: readonly string[],
  maxEditDistance = 1,
  minLengthForEditTolerance = 4,
): PersianComparisonResult {
  const strictSubmitted = normalizeStrict(submitted);
  const foldedSubmitted = foldCodepoints(strictSubmitted);
  const looseSubmitted = stripSeparators(foldedSubmitted);

  let best = INCORRECT;

  for (const accepted of acceptedAnswers) {
    const strictAccepted = normalizeStrict(accepted);
    if (strictSubmitted === strictAccepted) {
      return { verdict: "correct", matchedAnswer: accepted, reasons: [] };
    }

    const foldedAccepted = foldCodepoints(strictAccepted);
    const looseAccepted = stripSeparators(foldedAccepted);

    const reasons: CorrectionReason[] = [];
    if (foldedSubmitted !== strictSubmitted || foldedAccepted !== strictAccepted) reasons.push("codepoint_substitution");
    if (looseSubmitted !== foldedSubmitted || looseAccepted !== foldedAccepted) reasons.push("zwnj_or_spacing");

    if (looseSubmitted === looseAccepted) {
      best = better(best, { verdict: "accepted_with_correction", matchedAnswer: accepted, reasons });
      continue;
    }

    if (maxEditDistance > 0 && looseAccepted.length >= minLengthForEditTolerance) {
      const distance = levenshteinDistance(looseSubmitted, looseAccepted);
      if (distance <= maxEditDistance) {
        best = better(best, {
          verdict: "accepted_with_correction",
          matchedAnswer: accepted,
          reasons: [...reasons, "edit_distance_typo"],
        });
      }
    }
  }

  return best;
}

function normalizeCase(input: string): string {
  let out = "";
  let lastWasSpace = false;
  for (const ch of input.toLowerCase()) {
    if (/\s/.test(ch)) {
      if (!lastWasSpace && out.length > 0) out += " ";
      lastWasSpace = true;
      continue;
    }
    out += ch;
    lastWasSpace = false;
  }
  return out.trimEnd();
}

const VOWELS = new Set(["a", "e", "i", "o", "u"]);

function foldLatinVariance(normalized: string): string {
  let out = "";
  let lastAppended = "";
  for (const ch of normalized) {
    if (ch === "'" || ch === "-") continue; // hamza/ayin marker in most romanization schemes
    if (VOWELS.has(ch) && ch === lastAppended) continue; // collapse doubled vowels
    out += ch;
    lastAppended = ch;
  }
  return out;
}

/** Mirrors RomanizedComparator(maxEditDistance = 2, minLengthForEditTolerance = 3). */
export function compareRomanized(
  submitted: string,
  acceptedAnswers: readonly string[],
  maxEditDistance = 2,
  minLengthForEditTolerance = 3,
): PersianComparisonResult {
  const strictSubmitted = normalizeCase(submitted);
  const looseSubmitted = foldLatinVariance(strictSubmitted);

  let best = INCORRECT;

  for (const accepted of acceptedAnswers) {
    const strictAccepted = normalizeCase(accepted);
    if (strictSubmitted === strictAccepted) {
      return { verdict: "correct", matchedAnswer: accepted, reasons: [] };
    }

    const looseAccepted = foldLatinVariance(strictAccepted);
    if (looseSubmitted === looseAccepted) {
      best = better(best, { verdict: "accepted_with_correction", matchedAnswer: accepted, reasons: ["latinization_variance"] });
      continue;
    }

    if (maxEditDistance > 0 && looseAccepted.length >= minLengthForEditTolerance) {
      const distance = levenshteinDistance(looseSubmitted, looseAccepted);
      if (distance <= maxEditDistance) {
        best = better(best, {
          verdict: "accepted_with_correction",
          matchedAnswer: accepted,
          reasons: ["latinization_variance", "edit_distance_typo"],
        });
      }
    }
  }

  return best;
}

/** Mirrors ExactMatchComparatorBase — WordBank/Match: selection-based, no correction tier possible. */
export function compareExact(submitted: string, acceptedAnswers: readonly string[]): PersianComparisonResult {
  const normalizedSubmitted = normalizeStrict(submitted);
  for (const accepted of acceptedAnswers) {
    if (normalizedSubmitted === normalizeStrict(accepted)) {
      return { verdict: "correct", matchedAnswer: accepted, reasons: [] };
    }
  }
  return INCORRECT;
}

/** Mirrors SpeakComparator: the script-appropriate comparator with a wider edit-distance budget for ASR noise. */
export function compareSpeak(
  submitted: string,
  acceptedAnswers: readonly string[],
  scriptMode: "native" | "romanized",
  extraEditDistance = 1,
): PersianComparisonResult {
  return scriptMode === "romanized"
    ? compareRomanized(submitted, acceptedAnswers, 2 + extraEditDistance)
    : compareNative(submitted, acceptedAnswers, 1 + extraEditDistance);
}
