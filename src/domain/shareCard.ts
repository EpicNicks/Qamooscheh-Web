// What a passed Parsle's share card shows — the same card Android shares
// (its ShareCard.kt): a headline, the XP, the streak and one word from the
// Parsle. Drawing it is components/lesson/ShareCardButton.tsx's job.
import type { WordHint } from "./romanization";

export interface ShareCardContent {
  headline: string;
  xp: number;
  /** Left off the card when there's no streak going. */
  streakDays: number | null;
  /** One word from the Parsle, as written, with its reading and meaning. */
  word: { text: string; reading: string | null; gloss: string } | null;
}

export const SHARE_HEADLINE = "Parsle complete!";

/**
 * The card's word: the first of the Parsle's lexeme tags (in the order they
 * were answered) that has a hint, preferring one with a reading so the card
 * can say how it's pronounced. A tag's written word is its part before "<",
 * the same key domain/romanization.ts's hint map uses.
 */
export function pickShareWord(tags: readonly string[], hintMap: ReadonlyMap<string, WordHint>): ShareCardContent["word"] {
  let fallback: ShareCardContent["word"] = null;
  for (const tag of tags) {
    const text = tag.split("<", 1)[0];
    const hint = text ? hintMap.get(text) : undefined;
    if (!hint) continue;
    if (hint.romanization) return { text, reading: hint.romanization, gloss: hint.translation };
    fallback ??= { text, reading: null, gloss: hint.translation };
  }
  return fallback;
}

export function shareCardContent(
  xp: number | null,
  streakDays: number | null | undefined,
  tags: readonly string[],
  hintMap: ReadonlyMap<string, WordHint>,
): ShareCardContent {
  return {
    headline: SHARE_HEADLINE,
    xp: xp ?? 0,
    streakDays: streakDays != null && streakDays > 0 ? streakDays : null,
    word: pickShareWord(tags, hintMap),
  };
}
