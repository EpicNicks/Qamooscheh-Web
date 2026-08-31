// The "workshop" data file for the Persian phonetic keyboard: which Persian
// letter(s) a Latin sound maps to, ordered by frequency (index 0 is the
// default/auto-picked candidate). Deliberately its own small file, separate
// from the state machine in phoneticEngine.ts, so the mapping itself is easy
// to tweak after it's actually being used — see phoneticEngine.ts's header
// for "e", the one vowel still handled specially (a bare short vowel,
// mostly omitted in Persian orthography — not in this table at all).
//
// Digraphs are matched before their single-letter prefix would otherwise
// resolve (phoneticEngine.ts's buffering) — e.g. "s" then "h" is "sh" (ش),
// not "s" (س) followed by "h" (ه/ح).
export const DIGRAPHS: Record<string, readonly string[]> = {
  kh: ["خ"],
  gh: ["غ", "ق"],
  ch: ["چ"],
  sh: ["ش"],
  zh: ["ژ"],
};

/** First letters of every digraph above — feedLatinChar buffers on these instead of resolving immediately, to see if a digraph follows. */
export const DIGRAPH_STARTERS = new Set(["k", "g", "c", "s", "z"]);

export const SINGLES: Record<string, readonly string[]> = {
  // ا (alef) is the default; آ (alef madda, the "â"/long-a form) is one tap
  // away in the candidate picker — the toggle IS the picker, same as every
  // other ambiguous letter, not a separate mechanism.
  a: ["ا", "آ"],
  b: ["ب"],
  p: ["پ"],
  t: ["ت", "ط"],
  s: ["س", "ص", "ث"],
  j: ["ج"],
  h: ["ه", "ح"],
  d: ["د"],
  z: ["ز", "ذ", "ض", "ظ"],
  r: ["ر"],
  f: ["ف"],
  k: ["ک"],
  g: ["گ"],
  l: ["ل"],
  m: ["م"],
  n: ["ن"],
  v: ["و"],
  w: ["و"],
  y: ["ی"],
  q: ["ق", "غ"],
  "'": ["ع", "ء"],
};

/** Looks up an already-resolved trigger (a full digraph or a single letter) — not responsible for the buffering itself. */
export function resolveTrigger(sound: string): readonly string[] | null {
  return DIGRAPHS[sound] ?? SINGLES[sound] ?? null;
}

/**
 * Every Latin letter the phonetic keyboard actually does something with:
 * either it inserts a letter on its own (a SINGLES key) or it can still lead
 * somewhere via a digraph (a DIGRAPH_STARTERS key, "c" included even though
 * a lone "c" has no standalone reading of its own — it's mid-"ch" until the
 * next key says otherwise). Anything not in this set (c/e/i/o/u/x among the
 * 26 letters) produces no visible result and is intentionally not accepted:
 * the on-screen keyboard greys those keys out rather than making them look
 * pressable and silently doing nothing.
 */
export const VALID_PHONETIC_LETTERS: ReadonlySet<string> = new Set([...Object.keys(SINGLES), ...DIGRAPH_STARTERS]);

export function hasPhoneticValue(letter: string): boolean {
  return VALID_PHONETIC_LETTERS.has(letter.toLowerCase());
}
