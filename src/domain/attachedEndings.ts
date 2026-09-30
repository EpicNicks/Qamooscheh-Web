// Hover hints for a word written with endings attached — مادرم "my mother",
// خسته‌ام "I'm tired", کتاب‌ها "books" — that has no lexeme of its own
// (issue #16). The lexeme index already lists the endings themselves, tagged
// with a leading tatweel: "ـم<poss>" (my), "ـم<v><spoken>" (am), "ـها<pl>"
// (plural), with any other spelling in `forms` (ـم is written ‌ام after a
// vowel). So a word that misses the hint map is split into a stem the map
// knows plus up to MAX_ENDINGS known endings, and hinted as the stem's
// meaning followed by each ending's GENERAL meaning — every sense it has,
// "mother + -am (am / my)" — rather than a guess at which one this is.
// Nothing new has to be authored per word.
import { ZWNJ } from "./persian/normalize";
import type { WordHint } from "./romanization";

/** How an ending is written in a lexeme tag: attached to nothing, after a tatweel. */
const ATTACH = "ـ";
const MAX_ENDINGS = 3;
/**
 * A stem an ending is written straight onto (no half-space) has to be at
 * least this long. Shorter ones find false splits among ordinary words — نون
 * (bread) is not نو "new" + ن "are (they)".
 */
const MIN_JOINED_STEM = 3;
/** Letters a Persian word can end in with a vowel sound written out. */
const VOWEL_FINAL = /[اوی]$/;

const endingsCache = new WeakMap<ReadonlyMap<string, WordHint>, string[]>();

/** Every ending the map knows (without its tatweel), longest first so ـمون wins over ـن. */
function endingsOf(hintMap: ReadonlyMap<string, WordHint>): string[] {
  let endings = endingsCache.get(hintMap);
  if (!endings) {
    endings = [...hintMap.keys()]
      .filter((key) => key.startsWith(ATTACH) && key.length > 1)
      .map((key) => key.slice(ATTACH.length))
      .sort((a, b) => b.length - a.length);
    endingsCache.set(hintMap, endings);
  }
  return endings;
}

interface Split {
  stem: WordHint;
  /** Stem outward. */
  endings: string[];
}

/** Every way `word` reads as a known stem plus known endings. */
function splits(word: string, hintMap: ReadonlyMap<string, WordHint>, endings: string[], depth: number): Split[] {
  const found: Split[] = [];
  if (depth > 0) {
    const stem = hintMap.get(word);
    if (stem) found.push({ stem, endings: [] });
  }
  if (depth === MAX_ENDINGS) return found;
  for (const ending of endings) {
    for (const separator of [ZWNJ, ""]) {
      const written = separator + ending;
      if (!word.endsWith(written)) continue;
      const rest = word.slice(0, -written.length);
      if (rest.length < (separator ? 1 : MIN_JOINED_STEM)) continue;
      // A ی written straight onto a vowel is the ezafe ("of" — عموی من, my
      // uncle; see domain/ezafe.ts), not an ending — "you are" is spelled
      // ‌ای there.
      if (!separator && ending === "ی" && VOWEL_FINAL.test(rest)) continue;
      for (const inner of splits(rest, hintMap, endings, depth + 1)) {
        found.push({ stem: inner.stem, endings: [...inner.endings, ending] });
      }
    }
  }
  return found;
}

/**
 * The most plausible split: fewest endings, then the longest ending next to
 * the stem — کتاب‌هام is کتاب + ها + م (books + my), not کتاب + ه + ام.
 */
function bestSplit(candidates: Split[]): Split | null {
  let best: Split | null = null;
  for (const candidate of candidates) {
    if (best === null || isBetter(candidate, best)) best = candidate;
  }
  return best;
}

function isBetter(a: Split, b: Split): boolean {
  if (a.endings.length !== b.endings.length) return a.endings.length < b.endings.length;
  for (let i = 0; i < a.endings.length; i++) {
    if (a.endings[i].length !== b.endings[i].length) return a.endings[i].length > b.endings[i].length;
  }
  return false;
}

/**
 * A gloss trimmed of its authoring notes, keeping what tells senses apart:
 * "are (you; attached to a predicate)" → "are (you)", "my (attached to a
 * noun: سرم = my head)" → "my", "mom (everyday word: …)" → "mom", while
 * "uncle (father's brother)" stays whole. A parenthetical part goes when it
 * explains attachment, gives an example (":", "=", Persian script), or both.
 */
export function tidyGloss(gloss: string): string {
  return gloss
    .replace(/, attached[^()]*/, "")
    .replace(/\s*\(([^()]*)\)/g, (_, inner: string) => {
      const kept = inner
        .split(";")
        .map((part) => part.trim())
        .filter((part) => part && !/attached|[:=]|\p{Script=Arabic}/u.test(part));
      return kept.length > 0 ? ` (${kept.join("; ")})` : "";
    })
    .trim();
}

/**
 * An ending's general meaning: every one of its senses' glosses, trimmed,
 * with a meaning two senses share said once — ـش is "his / her" (a
 * possessive) and "him / her / it" (an object), so "his / her / him / it".
 * A sense whose gloss is nothing but an authoring note (the relative ـی's)
 * contributes nothing.
 */
function generalMeaning(ending: WordHint): string {
  const meanings: string[] = [];
  for (const sense of ending.senses ?? [{ translation: ending.translation }]) {
    for (const meaning of tidyGloss(sense.translation).split(" / ")) {
      const trimmed = meaning.trim();
      if (trimmed && !meanings.includes(trimmed)) meanings.push(trimmed);
    }
  }
  return meanings.join(" / ");
}

/**
 * The hint for `word` read as a known stem plus attached endings, or null
 * when it doesn't split that way. Only ever consulted for a word the map has
 * no entry for.
 */
export function attachedEndingsHint(word: string, hintMap: ReadonlyMap<string, WordHint>): WordHint | null {
  const endings = endingsOf(hintMap);
  if (endings.length === 0) return null;
  const parts = bestSplit(splits(word, hintMap, endings, 0));
  if (!parts) return null;

  const glosses = [tidyGloss(parts.stem.translation)];
  let romanization = parts.stem.romanization;
  for (const ending of parts.endings) {
    const hint = hintMap.get(ATTACH + ending)!;
    const label = hint.romanization ?? `-${ending}`;
    const meaning = generalMeaning(hint);
    glosses.push(meaning ? `${label} (${meaning})` : label);
    romanization = romanization !== null && hint.romanization !== null ? romanization + hint.romanization.replace(/^-/, "") : null;
  }

  return {
    translation: glosses.join(" + "),
    romanization,
    ruby: romanization,
    register: parts.stem.register,
  };
}
