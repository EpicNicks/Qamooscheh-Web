// Hover hints for a word written with endings attached — مادرم "my mother",
// خسته‌ام "I'm tired", کتاب‌ها "books" — that has no lexeme of its own
// (issue #16). The lexeme index already lists the endings themselves, tagged
// with a leading tatweel: "ـم<poss>" (my), "ـم<v><spoken>" (am), "ـها<pl>"
// (plural), with any other spelling in `forms` (ـم is written ‌ام after a
// vowel). So a word that misses the hint map is split into a stem the map
// knows plus up to MAX_ENDINGS known endings. Nothing new has to be authored
// per word.
//
// The written word doesn't say where its stem ends (سَرَم is one word), but
// the exercise's `tags` say which pieces it's made of (سر<n>, ـم<poss>). A
// split built only from those is trusted outright, whatever the stem's
// length, and names just the tagged senses: "head + -am (my)". Failing that —
// a decoy tile, or text with no tags — any split the course-wide map allows
// is used, guarded against false splits, and an ending gets its GENERAL
// meaning, every sense it has: "mother + -am (am / my)".
import { ZWNJ } from "./persian/normalize";
import type { WordHint, WordSense } from "./romanization";

/** How an ending is written in a lexeme tag: attached to nothing, after a tatweel. */
const ATTACH = "ـ";
const MAX_ENDINGS = 3;
/**
 * Without tags to go on, a stem an ending is written straight onto (no
 * half-space) has to be at least this long, unless it ends in a consonant —
 * shorter vowel-final ones find false splits among ordinary words (نون,
 * bread, is not نو "new" + ن "are (they)"; ماست, yogurt, is not ما + ست),
 * while a short consonant-final one is a real word taking it (سرم, my head).
 */
const MIN_JOINED_STEM = 3;
/** Letters a Persian word can end in with a vowel sound written out. */
const VOWEL_FINAL = /[اوی]$/;
/** VOWEL_FINAL plus the silent heh (خسته), which takes endings behind a half-space too. */
const VOWEL_OR_HEH_FINAL = /[اویه]$/;

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

/** A stem or ending of a split, with the senses it's read in. */
interface Piece {
  hint: WordHint;
  senses: WordSense[];
}

/** A written stem or ending (an ending with its tatweel) as a piece, or null when it can't be one. */
type PieceReader = (written: string) => Piece | null;

function sensesOf(hint: WordHint): WordSense[] {
  return hint.senses ?? [{ tag: "", pos: "", translation: hint.translation, romanization: hint.romanization }];
}

/** Anything the map knows, in every sense. */
function anyLexeme(hintMap: ReadonlyMap<string, WordHint>): PieceReader {
  return (written) => {
    const hint = hintMap.get(written);
    return hint ? { hint, senses: sensesOf(hint) } : null;
  };
}

/** Only this exercise's lexemes, in only their tagged senses. */
function taggedLexeme(hintMap: ReadonlyMap<string, WordHint>, tags: ReadonlySet<string>): PieceReader {
  return (written) => {
    const hint = hintMap.get(written);
    const senses = hint ? sensesOf(hint).filter((sense) => tags.has(sense.tag)) : [];
    return senses.length > 0 ? { hint: hint!, senses } : null;
  };
}

interface Split {
  stem: Piece;
  /** Stem outward, each as written without its tatweel, and whether it's written straight on (no half-space). */
  endings: { written: string; piece: Piece; joined: boolean }[];
}

/**
 * Every way `word` reads as a stem plus endings `read` accepts. `tagged`
 * lifts the short-stem guard: a split the exercise's tags spell out is no
 * guess.
 */
function splits(word: string, read: PieceReader, endings: string[], depth: number, tagged: boolean): Split[] {
  const found: Split[] = [];
  if (depth > 0) {
    const stem = read(word);
    if (stem) found.push({ stem, endings: [] });
  }
  if (depth === MAX_ENDINGS) return found;
  for (const ending of endings) {
    const piece = read(ATTACH + ending);
    if (!piece) continue;
    for (const separator of [ZWNJ, ""]) {
      const written = separator + ending;
      if (!word.endsWith(written)) continue;
      const rest = word.slice(0, -written.length);
      if (rest.length < 1) continue;
      if (!tagged && !separator && rest.length < MIN_JOINED_STEM && VOWEL_OR_HEH_FINAL.test(rest)) continue;
      // A ی written straight onto a vowel is the ezafe ("of" — عموی من, my
      // uncle; see domain/ezafe.ts), not an ending — "you are" is spelled
      // ‌ای there.
      if (!separator && ending === "ی" && VOWEL_FINAL.test(rest)) continue;
      for (const inner of splits(rest, read, endings, depth + 1, tagged)) {
        found.push({ stem: inner.stem, endings: [...inner.endings, { written: ending, piece, joined: !separator }] });
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
    if (a.endings[i].written.length !== b.endings[i].written.length) return a.endings[i].written.length > b.endings[i].written.length;
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
 * An ending's meaning in the senses it's read in: each one's gloss, trimmed,
 * with a meaning two senses share said once — ـش is "his / her" (a
 * possessive) and "him / her / it" (an object), so "his / her / him / it".
 * A sense whose gloss is nothing but an authoring note (the relative ـی's)
 * contributes nothing.
 */
function meaningOf(ending: Piece): string {
  const meanings: string[] = [];
  for (const sense of ending.senses) {
    for (const meaning of tidyGloss(sense.translation).split(" / ")) {
      const trimmed = meaning.trim();
      if (trimmed && !meanings.includes(trimmed)) meanings.push(trimmed);
    }
  }
  return meanings.join(" / ");
}

function romanizationOf(piece: Piece): string | null {
  return piece.senses.find((sense) => sense.romanization !== null)?.romanization ?? null;
}

const ROMAN_VOWEL_FINAL = /[aeiouāīūō]$/;
const ROMAN_VOWEL_THEN_MORE = /^[aeiouāīūō]./;

/**
 * An ending's romanization added on. Written straight onto a vowel, its own
 * leading vowel isn't said: پام is pā + -am = pām, پاش pāsh. A lone vowel
 * (-e, "is") stays, and so does one behind a half-space (خسته‌ام, khasteam).
 */
function appendEnding(stem: string, ending: string, joined: boolean): string {
  const suffix = ending.replace(/^-/, "");
  return stem + (joined && ROMAN_VOWEL_FINAL.test(stem) && ROMAN_VOWEL_THEN_MORE.test(suffix) ? suffix.slice(1) : suffix);
}

/**
 * The hint for `word` read as a known stem plus attached endings, or null
 * when it doesn't split that way. Only ever consulted for a word the map has
 * no entry for. `tags` are the exercise's own lexeme tags, tried first.
 */
export function attachedEndingsHint(word: string, hintMap: ReadonlyMap<string, WordHint>, tags?: ReadonlySet<string>): WordHint | null {
  const endings = endingsOf(hintMap);
  if (endings.length === 0) return null;
  const parts =
    (tags && tags.size > 0 ? bestSplit(splits(word, taggedLexeme(hintMap, tags), endings, 0, true)) : null) ??
    bestSplit(splits(word, anyLexeme(hintMap), endings, 0, false));
  if (!parts) return null;

  const glosses = [tidyGloss(parts.stem.senses[0].translation)];
  let romanization = romanizationOf(parts.stem);
  for (const { written, piece, joined } of parts.endings) {
    const endingRomanization = romanizationOf(piece);
    const label = endingRomanization ?? `-${written}`;
    const meaning = meaningOf(piece);
    glosses.push(meaning ? `${label} (${meaning})` : label);
    romanization = romanization !== null && endingRomanization !== null ? appendEnding(romanization, endingRomanization, joined) : null;
  }

  return {
    translation: glosses.join(" + "),
    romanization,
    ruby: romanization,
    register: parts.stem.hint.register,
  };
}
