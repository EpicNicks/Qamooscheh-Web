// The ezafe — the unwritten "-e" that links a Persian noun to what describes
// or owns it (ketāb-e man, "my book"; havā-ye khub, "good weather"). Ordinary
// Persian never writes it, so content marks it where it's relevant, the way
// teaching texts do (the graders ignore both marks — domain/persian/normalize.ts):
//
//   کتابِ من    a kasra on the word                        -> ketāb-e
//   هوایِ خوب   after a vowel, a kasra on the linking ی    -> havā-ye
//   خانهٔ من    after a silent heh, a hamza above it       -> khāne-ye
//
// A marked word is looked up WITHOUT its mark (and without the linking ی),
// and carries the ezafe beside its own hint, so the display can show it as
// its own highlighted piece — [ketāb](-e) — rather than as part of the word.
import { HAMZA_ABOVE, KASRA, ZWNJ, stripReadingAids } from "./persian/normalize";
import type { WordHint } from "./romanization";

export type Ezafe = "-e" | "-ye";

const HEH = "ه";
const YEH = "ی";
/** Letters that end a word on a written-out vowel, after which the ezafe is a linking ی (-ye). */
const VOWEL_FINAL = /[او]$/;
/** Shadda (doubling). Unicode normalization orders it AFTER a kasra on the same letter, so it can hide a final ezafe mark. */
const SHADDA = String.fromCharCode(0x0651);

/**
 * The ways a marked `word` can read as a bare word plus its ezafe, most
 * likely first — empty when it carries no ezafe mark. A kasra on a final ی is
 * either the linking ی after a vowel (هوایِ = havā-ye) or a word that simply
 * ends in ی (چایِ = chāy-e); which one is decided by which bare word the
 * lexicon actually has.
 */
export function ezafeReadings(marked: string): { base: string; ezafe: Ezafe }[] {
  const word = marked.endsWith(SHADDA) ? marked.slice(0, -SHADDA.length) : marked;
  if (word.endsWith(HEH + HAMZA_ABOVE)) return [{ base: word.slice(0, -HAMZA_ABOVE.length), ezafe: "-ye" }];
  if (!word.endsWith(KASRA)) return [];
  const bare = word.slice(0, -KASRA.length);
  if (!bare.endsWith(YEH)) return [{ base: bare, ezafe: "-e" }];
  const beforeYeh = bare.slice(0, -YEH.length);
  // خانه‌یِ: a linking ی after a half-space always follows a vowel.
  if (beforeYeh.endsWith(ZWNJ)) return [{ base: beforeYeh.slice(0, -ZWNJ.length), ezafe: "-ye" }];
  const linking = { base: beforeYeh, ezafe: "-ye" as const };
  const ownYeh = { base: bare, ezafe: "-e" as const };
  return VOWEL_FINAL.test(beforeYeh) ? [linking, ownYeh] : [ownYeh, linking];
}

/**
 * The hint for an ezafe-marked `word`: its bare word's hint (from `lookup`,
 * which may itself split off attached endings, and is handed the word without
 * any of its vowel marks) plus the ezafe — or null when the word carries no
 * mark or no reading of it is a word `lookup` knows.
 */
export function ezafeHint(word: string, lookup: (bare: string) => WordHint | null): WordHint | null {
  for (const { base, ezafe } of ezafeReadings(word)) {
    const hint = lookup(stripReadingAids(base));
    if (hint) return { ...hint, ezafe };
  }
  return null;
}
