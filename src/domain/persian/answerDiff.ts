// How a typed answer differs from an accepted one, for the feedback note
// (answerFeedback.ts) and for ordering the answers a learner is shown. Display
// only: whether an answer is right is the published grader's call (src/grader).

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
