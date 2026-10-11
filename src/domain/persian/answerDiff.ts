// How a typed answer differs from an accepted one, for the feedback note
// (answerFeedback.ts) and for ordering the answers a learner is shown. Display
// only: whether an answer is right is the published grader's call (src/grader).
import { foldCodepoints, normalizeStrict, stripSeparators, ZWNJ } from "./normalize";

export function levenshteinDistance(a: string, b: string): number {
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

export type Separator = "half-space" | "space" | "none";

/** One place a separator went wrong: what belonged after `after` (the accepted word's letters up to it), and what was typed there. */
export interface SeparatorMistake {
  after: string;
  expected: Separator;
  typed: Separator;
}

function separatorAt(text: string, start: number): { separator: Separator; end: number } {
  let end = start;
  let separator: Separator = "none";
  while (end < text.length && (text[end] === ZWNJ || text[end] === " ")) {
    if (text[end] === " ") separator = "space";
    else if (separator === "none") separator = "half-space";
    end++;
  }
  return { separator, end };
}

/**
 * When `submitted` has every letter right and only its spaces/half-spaces
 * differ from an accepted answer, each place they differ (issue #39) —
 * against whichever accepted answer it differs from least. Null when no
 * accepted answer has the same letters.
 */
export function separatorMistakes(submitted: string, acceptedAnswers: readonly string[]): SeparatorMistake[] | null {
  const typedText = foldCodepoints(normalizeStrict(submitted));
  let best: SeparatorMistake[] | null = null;
  for (const accepted of acceptedAnswers) {
    const acceptedText = foldCodepoints(normalizeStrict(accepted));
    if (stripSeparators(acceptedText) !== stripSeparators(typedText)) continue;
    const mistakes: SeparatorMistake[] = [];
    let wordStart = 0;
    let i = 0;
    let j = 0;
    while (i < acceptedText.length) {
      const expected = separatorAt(acceptedText, i);
      const typed = separatorAt(typedText, j);
      if (expected.separator !== typed.separator && i > 0) {
        mistakes.push({ after: stripSeparators(acceptedText.slice(wordStart, i)), expected: expected.separator, typed: typed.separator });
      }
      if (expected.separator !== "none") wordStart = expected.end;
      // Both now sit on the same letter: step past it.
      i = expected.end + 1;
      j = typed.end + 1;
    }
    if (best === null || mistakes.length < best.length) best = mistakes;
  }
  return best;
}

export function normalizeCase(input: string): string {
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

export function foldLatinVariance(normalized: string): string {
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
