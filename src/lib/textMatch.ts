// A deliberately crude, language-agnostic approximation of "is this answer
// right" — used ONLY for instant in-lesson UI feedback (highlight
// green/red, decide whether to advance or requeue). It is never
// authoritative: the server re-grades every submitted item itself
// (Qamooscheh.Persian / Qamooscheh.Japanese's real comparators, API_SPEC.md
// §1's "the server is grading-authoritative"), and POST /v1/sessions/submit's
// response is the actual source of truth for card state.
//
// A per-language pass (typo tolerance tiers, script normalization,
// romanization) belongs in a later, language-specific module — not here.
export function looksCorrect(submitted: string, accepted: readonly string[]): boolean {
  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const normalizedSubmitted = normalize(submitted);
  return accepted.some((answer) => normalize(answer) === normalizedSubmitted);
}
