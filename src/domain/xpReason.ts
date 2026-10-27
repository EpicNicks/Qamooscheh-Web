// Why an answer's XP is what it is, from the grader's `xpBase` and
// `xpReasons` (API_SPEC.md §2.3 point 8). Wording only: the amount is the
// grader's (`xp`), so a code this client doesn't know falls back to a
// generic line rather than guessing at it.

/** The one base code per paying answer, then `hint_halved` when a hint lowered it. */
const BASE_REASON: Record<string, string> = {
  first_try: "a first try",
  corrected: "accepted with a correction",
  retry: "a retry",
  retype: "a retype",
  second_retype: "a second retype",
};

const FULL_XP = 10;

/**
 * The line that says why `xp` is what it is — "Hint used: half of the 10 XP
 * for a first try" — or null when the answer paid in full (or didn't pay),
 * where nothing needs explaining.
 */
export function explainXp(xp: number, xpBase: number | null | undefined, xpReasons: readonly string[] | null | undefined): string | null {
  if (xp <= 0 || !xpReasons || xpReasons.length === 0) return null;
  const hinted = xpReasons.includes("hint_halved");
  const base = xpReasons.find((reason) => reason !== "hint_halved");
  const baseText = base === undefined ? null : (BASE_REASON[base] ?? "an earlier slip");
  const baseXp = xpBase ?? xp;
  if (hinted) return `Hint used: half of the ${baseXp} XP for ${baseText ?? "this answer"}.`;
  if (base === "first_try" && xp >= FULL_XP) return null;
  return baseText === null ? null : `${xp} XP for ${baseText}.`;
}
