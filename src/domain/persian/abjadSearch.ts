// Parsing for the abjad glossary's letter search (components/glossary/
// AbjadLetterSearch.tsx): each valid character typed becomes a token that
// selects one or more letters, and anything else is dropped.
//
// Two kinds of token:
//  - a Persian letter selects just itself (ث → ث);
//  - a Latin character selects every letter it romanizes to (s → ث س ص),
//    using the same romanization as ABJAD_SOUNDS. The digraphs sh/ch/kh/gh/zh
//    are built as they're typed: an "h" right after an s/k/g/z token turns it
//    into sh/kh/gh/zh (all of which ARE sounds, unlike s+h as two letters),
//    and "c", which is nothing on its own, waits in `pending` for its "h".

import { ABJAD_LETTERS, type SoundId } from "./abjad";

export interface LetterSearchToken {
  /** Unique per token — "fa:ث" or "latin:s" — so the same search can't be added twice. */
  key: string;
  kind: "persian" | "latin";
  /** What the chip shows: the letter itself, or the Latin text typed. */
  label: string;
  /** The letters this token selects, in alphabet order. */
  letters: string[];
}

function bySound(...sounds: SoundId[]): string[] {
  return ABJAD_LETTERS.filter((l) => sounds.includes(l.sound)).map((l) => l.letter);
}

const CONSONANTS: SoundId[] = ["b", "p", "t", "s", "j", "ch", "h", "kh", "d", "z", "r", "zh", "sh", "gh", "f", "k", "g", "l", "m", "n"];

/** Latin text → the letters it can be spelled with. Vowels follow ABJAD_SOUNDS' own labels (ā/a/e/o for ا, v/u/o for و, y/i for ی). */
export const LATIN_SEARCH: Readonly<Record<string, string[]>> = {
  ...Object.fromEntries(CONSONANTS.map((sound) => [sound, bySound(sound)])),
  a: bySound("a"),
  e: bySound("a"),
  o: bySound("a", "v"),
  u: bySound("v"),
  v: bySound("v"),
  w: bySound("v"),
  i: bySound("y"),
  y: bySound("y"),
  // ق specifically — the common "q" romanization of it — not غ as well.
  q: ["ق"],
  "'": bySound("glottal"),
  "’": bySound("glottal"),
};

const DIGRAPH_FIRSTS = new Set(["s", "k", "g", "z"]);
const PERSIAN_LETTERS = new Set(ABJAD_LETTERS.map((l) => l.letter));

// Arabic-keyboard look-alikes of Persian letters. NFD (in parseLetterSearch)
// already splits آ/أ/إ/ؤ/ئ into a base letter plus a combining mark, so only
// the letters that differ in their base code point need mapping here.
const PERSIAN_EQUIVALENTS: Record<string, string> = {
  "ي": "ی", // ي Arabic yeh
  "ى": "ی", // ى alef maksura
  "ك": "ک", // ك Arabic kaf
  "ة": "ه", // ة teh marbuta
};

function persianToken(letter: string): LetterSearchToken {
  return { key: `fa:${letter}`, kind: "persian", label: letter, letters: [letter] };
}

function latinToken(text: string): LetterSearchToken {
  return { key: `latin:${text}`, kind: "latin", label: text, letters: LATIN_SEARCH[text] };
}

/** Appends `token`, or — if an identical one exists — moves that one to the end, so the chip for what was just typed is always the last one. */
function add(tokens: LetterSearchToken[], token: LetterSearchToken): LetterSearchToken[] {
  return [...tokens.filter((t) => t.key !== token.key), token];
}

/**
 * Folds newly typed `text` into the existing tokens. `text` is whatever the
 * input holds (the previous `pending` plus what was just typed or pasted);
 * the returned `pending` is what the input should keep showing.
 */
export function parseLetterSearch(text: string, tokens: LetterSearchToken[]): { tokens: LetterSearchToken[]; pending: string } {
  let next = tokens;
  let pending = "";

  // NFD splits ā into a + a combining macron (dropped below), and آ into ا + madde.
  for (const raw of text.normalize("NFD").toLowerCase()) {
    const char = PERSIAN_EQUIVALENTS[raw] ?? raw;

    if (PERSIAN_LETTERS.has(char)) {
      pending = "";
      next = add(next, persianToken(char));
      continue;
    }

    if (pending === "c") {
      pending = "";
      if (char === "h") {
        next = add(next, latinToken("ch"));
        continue;
      }
    }

    const last = next[next.length - 1];
    if (char === "h" && last?.kind === "latin" && DIGRAPH_FIRSTS.has(last.label)) {
      next = add(next.slice(0, -1), latinToken(`${last.label}h`));
    } else if (char === "c") {
      pending = "c";
    } else if (char in LATIN_SEARCH) {
      next = add(next, latinToken(char));
    }
  }

  return { tokens: next, pending };
}

/** The letters any token selects — null when there are no tokens, meaning "no filter", not "nothing matches". */
export function lettersMatching(tokens: LetterSearchToken[]): Set<string> | null {
  if (tokens.length === 0) return null;
  return new Set(tokens.flatMap((t) => t.letters));
}
