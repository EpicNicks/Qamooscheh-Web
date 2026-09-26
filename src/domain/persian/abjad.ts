// The Persian alphabet (abjad) as reference data for the glossary's
// "Persian Letters (Abjad)" page (components/glossary/AbjadGlossary.tsx).
//
// ABJAD_LETTERS is the single source: all 32 letters in alphabet order, each
// tagged with the sound it makes. Everything else — the same-sound groups
// (the 3 s's, 4 z's, 2 h's, ...), each positional form, the flashcard deck —
// is derived from it, so a letter can't end up in a group, or a deck, that
// disagrees with its own entry.
//
// Most of the duplicated sounds exist because Persian adopted the Arabic
// script wholesale, keeping letters for Arabic sounds (th, emphatics,
// pharyngeals) that Persian speakers merged into sounds Persian already had.
// Those letters live on mostly in Arabic loanwords; the letter's `note` says
// so where that applies. Romanization follows glossaryContent.ts's own
// convention (macron long vowels, "gh"/"kh"/"sh"/"zh"/"ch" digraphs).

export type LetterForm = "isolated" | "initial" | "medial" | "final";

export const LETTER_FORMS: ReadonlyArray<LetterForm> = ["isolated", "initial", "medial", "final"];

export type SoundId =
  | "a" | "b" | "p" | "t" | "s" | "j" | "ch" | "h" | "kh" | "d" | "z" | "r" | "zh" | "sh"
  | "glottal" | "gh" | "f" | "k" | "g" | "l" | "m" | "n" | "v" | "y";

export interface AbjadSound {
  /** How the sound is romanized throughout the app — what a learner types or reads in a romanization hint. */
  label: string;
  /** A plain-English anchor for the sound ("as in sun"). */
  hint: string;
}

export const ABJAD_SOUNDS: Record<SoundId, AbjadSound> = {
  a: { label: "ā / a / e / o", hint: "vowel carrier" },
  b: { label: "b", hint: "as in boy" },
  p: { label: "p", hint: "as in pen" },
  t: { label: "t", hint: "as in top" },
  s: { label: "s", hint: "as in sun" },
  j: { label: "j", hint: "as in jam" },
  ch: { label: "ch", hint: "as in chair" },
  h: { label: "h", hint: "as in hat" },
  kh: { label: "kh", hint: "ch in Scottish loch" },
  d: { label: "d", hint: "as in dog" },
  z: { label: "z", hint: "as in zoo" },
  r: { label: "r", hint: "a light tap" },
  zh: { label: "zh", hint: "s in measure" },
  sh: { label: "sh", hint: "as in shoe" },
  glottal: { label: "'", hint: "glottal stop, or silent" },
  gh: { label: "gh", hint: "throaty, like French r" },
  f: { label: "f", hint: "as in fun" },
  k: { label: "k", hint: "as in kite" },
  g: { label: "g", hint: "as in go" },
  l: { label: "l", hint: "as in lamp" },
  m: { label: "m", hint: "as in moon" },
  n: { label: "n", hint: "as in net" },
  v: { label: "v / u / o", hint: "consonant or vowel" },
  y: { label: "y / i", hint: "consonant or vowel" },
};

export interface AbjadExample {
  word: string;
  romanization: string;
  meaning: string;
}

export interface AbjadLetter {
  letter: string;
  sound: SoundId;
  nameNative: string;
  nameRomanized: string;
  /**
   * False for the seven letters that never join the letter AFTER them
   * (ا د ذ ر ز ژ و) — they still join the one before, so their initial form
   * is just the isolated one and their medial form is just the final one.
   * The card back calls this out on its own, so `note` never repeats it.
   */
  joinsNext: boolean;
  example: AbjadExample;
  /** The "Learn more" side's extra context, when the letter has a story beyond its sound. */
  note?: string;
}

export const ABJAD_LETTERS: ReadonlyArray<AbjadLetter> = [
  {
    letter: "ا",
    sound: "a",
    nameNative: "الف",
    nameRomanized: "alef",
    joinsNext: false,
    example: { word: "اسب", romanization: "asb", meaning: "horse" },
    note: "Starting a word, it carries a short vowel (a, e or o); elsewhere it's a long ā. With a madde on top, آ spells ā at the start of a word, as in آب (āb, water).",
  },
  {
    letter: "ب",
    sound: "b",
    nameNative: "بِ",
    nameRomanized: "be",
    joinsNext: true,
    example: { word: "بابا", romanization: "bābā", meaning: "dad" },
  },
  {
    letter: "پ",
    sound: "p",
    nameNative: "پِ",
    nameRomanized: "pe",
    joinsNext: true,
    example: { word: "پدر", romanization: "pedar", meaning: "father" },
    note: "One of four letters Persian added to the Arabic script: Arabic has no p, so Persian gave ب two more dots.",
  },
  {
    letter: "ت",
    sound: "t",
    nameNative: "تِ",
    nameRomanized: "te",
    joinsNext: true,
    example: { word: "توت", romanization: "tut", meaning: "mulberry" },
    note: "The everyday t, used in native Persian words. Its twin ط shows up mostly in Arabic loanwords.",
  },
  {
    letter: "ث",
    sound: "s",
    nameNative: "ثِ",
    nameRomanized: "se",
    joinsNext: true,
    example: { word: "ثانیه", romanization: "sāniye", meaning: "second (time)" },
    note: "In Arabic this is \"th\" as in think. Persian has no th sound, so it's said as a plain s, and it appears almost only in Arabic loanwords.",
  },
  {
    letter: "ج",
    sound: "j",
    nameNative: "جیم",
    nameRomanized: "jim",
    joinsNext: true,
    example: { word: "جوجه", romanization: "juje", meaning: "chick" },
  },
  {
    letter: "چ",
    sound: "ch",
    nameNative: "چِ",
    nameRomanized: "che",
    joinsNext: true,
    example: { word: "چای", romanization: "chāy", meaning: "tea" },
    note: "A Persian addition to the Arabic script: Arabic has no ch, so Persian gave ج three dots.",
  },
  {
    letter: "ح",
    sound: "h",
    nameNative: "حِ",
    nameRomanized: "he (jimi)",
    joinsNext: true,
    example: { word: "حال", romanization: "hāl", meaning: "state, mood" },
    note: "Arabic's breathy, throaty h. Persian says it as a plain h, the same as ه. Called \"he-ye jimi\" (the ج-shaped h) to tell the two apart.",
  },
  {
    letter: "خ",
    sound: "kh",
    nameNative: "خِ",
    nameRomanized: "khe",
    joinsNext: true,
    example: { word: "خانه", romanization: "khāne", meaning: "house" },
  },
  {
    letter: "د",
    sound: "d",
    nameNative: "دال",
    nameRomanized: "dāl",
    joinsNext: false,
    example: { word: "در", romanization: "dar", meaning: "door" },
  },
  {
    letter: "ذ",
    sound: "z",
    nameNative: "ذال",
    nameRomanized: "zāl",
    joinsNext: false,
    example: { word: "ذرت", romanization: "zorrat", meaning: "corn" },
    note: "In Arabic this is \"th\" as in this. Persian says it as z. Mostly in Arabic loanwords, though a few native words keep it, like گذشتن (gozashtan, to pass).",
  },
  {
    letter: "ر",
    sound: "r",
    nameNative: "رِ",
    nameRomanized: "re",
    joinsNext: false,
    example: { word: "روز", romanization: "ruz", meaning: "day" },
  },
  {
    letter: "ز",
    sound: "z",
    nameNative: "زِ",
    nameRomanized: "ze",
    joinsNext: false,
    example: { word: "زن", romanization: "zan", meaning: "woman" },
    note: "The everyday z, and by far the most common of the four. When unsure how a native Persian word spells z, it's this one.",
  },
  {
    letter: "ژ",
    sound: "zh",
    nameNative: "ژِ",
    nameRomanized: "zhe",
    joinsNext: false,
    example: { word: "ژاپن", romanization: "zhāpon", meaning: "Japan" },
    note: "A Persian addition to the Arabic script: Arabic has no zh, so Persian gave ز three dots.",
  },
  {
    letter: "س",
    sound: "s",
    nameNative: "سین",
    nameRomanized: "sin",
    joinsNext: true,
    example: { word: "سیب", romanization: "sib", meaning: "apple" },
    note: "The everyday s, used in native Persian words. ث and ص make the same sound but come from Arabic.",
  },
  {
    letter: "ش",
    sound: "sh",
    nameNative: "شین",
    nameRomanized: "shin",
    joinsNext: true,
    example: { word: "شب", romanization: "shab", meaning: "night" },
  },
  {
    letter: "ص",
    sound: "s",
    nameNative: "صاد",
    nameRomanized: "sād",
    joinsNext: true,
    example: { word: "صبح", romanization: "sobh", meaning: "morning" },
    note: "Arabic's \"heavy\" s, said with the tongue pulled back. Persian flattens it to a plain s; it appears almost only in Arabic loanwords.",
  },
  {
    letter: "ض",
    sound: "z",
    nameNative: "ضاد",
    nameRomanized: "zād",
    joinsNext: true,
    example: { word: "ضعیف", romanization: "za'if", meaning: "weak" },
    note: "Arabic's heavy d, a sound so distinctive Arabic is nicknamed \"the language of ḍād\". Persian says it as z, only in Arabic loanwords.",
  },
  {
    letter: "ط",
    sound: "t",
    nameNative: "طا",
    nameRomanized: "tā",
    joinsNext: true,
    example: { word: "طلا", romanization: "talā", meaning: "gold" },
    note: "Arabic's heavy t. Persian says it the same as ت; it appears mostly in Arabic loanwords.",
  },
  {
    letter: "ظ",
    sound: "z",
    nameNative: "ظا",
    nameRomanized: "zā",
    joinsNext: true,
    example: { word: "ظهر", romanization: "zohr", meaning: "noon" },
    note: "Arabic's heavy \"th\" as in this. Persian says it as z, only in Arabic loanwords.",
  },
  {
    letter: "ع",
    sound: "glottal",
    nameNative: "عین",
    nameRomanized: "eyn",
    joinsNext: true,
    example: { word: "عسل", romanization: "asal", meaning: "honey" },
    note: "A deep throat sound in Arabic. In Persian it's a light catch in the voice, or silent with the vowel next to it stretched a little. Romanization marks it with ' or leaves it out.",
  },
  {
    letter: "غ",
    sound: "gh",
    nameNative: "غین",
    nameRomanized: "gheyn",
    joinsNext: true,
    example: { word: "غذا", romanization: "ghazā", meaning: "food" },
    note: "In Arabic, غ (a gargled g) and ق (a k made deep in the throat) are different sounds. Iranian Persian merged them into one, so the spelling just has to be learned.",
  },
  {
    letter: "ف",
    sound: "f",
    nameNative: "فِ",
    nameRomanized: "fe",
    joinsNext: true,
    example: { word: "فیل", romanization: "fil", meaning: "elephant" },
  },
  {
    letter: "ق",
    sound: "gh",
    nameNative: "قاف",
    nameRomanized: "ghāf",
    joinsNext: true,
    example: { word: "قند", romanization: "ghand", meaning: "sugar cube" },
    note: "Arabic's q, made deep in the throat. Iranian Persian says it the same as غ, though some dialects (like Afghan Dari) still keep them apart.",
  },
  {
    letter: "ک",
    sound: "k",
    nameNative: "کاف",
    nameRomanized: "kāf",
    joinsNext: true,
    example: { word: "کتاب", romanization: "ketāb", meaning: "book" },
  },
  {
    letter: "گ",
    sound: "g",
    nameNative: "گاف",
    nameRomanized: "gāf",
    joinsNext: true,
    example: { word: "گل", romanization: "gol", meaning: "flower" },
    note: "A Persian addition to the Arabic script: Arabic has no g, so Persian gave ک a second stroke.",
  },
  {
    letter: "ل",
    sound: "l",
    nameNative: "لام",
    nameRomanized: "lām",
    joinsNext: true,
    example: { word: "لب", romanization: "lab", meaning: "lip" },
  },
  {
    letter: "م",
    sound: "m",
    nameNative: "میم",
    nameRomanized: "mim",
    joinsNext: true,
    example: { word: "ماه", romanization: "māh", meaning: "moon, month" },
  },
  {
    letter: "ن",
    sound: "n",
    nameNative: "نون",
    nameRomanized: "nun",
    joinsNext: true,
    example: { word: "نان", romanization: "nān", meaning: "bread" },
  },
  {
    letter: "و",
    sound: "v",
    nameNative: "واو",
    nameRomanized: "vāv",
    joinsNext: false,
    example: { word: "ورزش", romanization: "varzesh", meaning: "sport" },
    note: "Three jobs: the consonant v, the long vowel u (دوست, dust, friend), or o (تو, to, you). After خ it's sometimes silent: خواهر is khāhar (sister).",
  },
  {
    letter: "ه",
    sound: "h",
    nameNative: "هِ",
    nameRomanized: "he (do-cheshm)",
    joinsNext: true,
    example: { word: "هفت", romanization: "haft", meaning: "seven" },
    note: "The everyday h. At the end of a word it often isn't an h at all but the vowel e, as in خانه (khāne). Called \"he-ye do-cheshm\" (two-eyed h) for its medial shape ـهـ.",
  },
  {
    letter: "ی",
    sound: "y",
    nameNative: "یِ",
    nameRomanized: "ye",
    joinsNext: true,
    example: { word: "یک", romanization: "yek", meaning: "one" },
    note: "The consonant y or the long vowel i (سیب, sib). Unlike Arabic's ي, Persian ی drops its two dots when it ends a word.",
  },
];

const TATWEEL = "ـ";

/**
 * The letter as it appears in `form`, drawn with a tatweel (ـ) on each side
 * that joins a neighbor — the textbook convention, and the only way to show a
 * contextual form in isolation that doesn't depend on the font honoring a
 * zero-width joiner. A non-joiner has nothing to extend on its left, so its
 * initial/medial shapes collapse to isolated/final.
 */
export function letterInForm({ letter, joinsNext }: Pick<AbjadLetter, "letter" | "joinsNext">, form: LetterForm): string {
  const joinsPrev = form === "medial" || form === "final";
  const extendsNext = joinsNext && (form === "initial" || form === "medial");
  return `${joinsPrev ? TATWEEL : ""}${letter}${extendsNext ? TATWEEL : ""}`;
}

export interface AbjadSoundGroup {
  sound: SoundId;
  letters: AbjadLetter[];
}

/** Letters grouped by sound, groups in the order their first letter appears in the alphabet (so the s group sits where ث does). */
export function abjadSoundGroups(letters: ReadonlyArray<AbjadLetter> = ABJAD_LETTERS): AbjadSoundGroup[] {
  const groups = new Map<SoundId, AbjadLetter[]>();
  for (const letter of letters) {
    const group = groups.get(letter.sound);
    if (group) group.push(letter);
    else groups.set(letter.sound, [letter]);
  }
  return [...groups].map(([sound, groupLetters]) => ({ sound, letters: groupLetters }));
}

export interface AbjadFlashcard {
  id: string;
  /** Front: the letter itself (the deck UI picks which positional form to draw). */
  letter: AbjadLetter;
  /** Back: what it sounds like and what it's called, romanized and native side by side. */
  sound: AbjadSound;
  nameRomanized: string;
  nameNative: string;
}

/** One card per letter, in alphabet order. */
export function abjadFlashcards(letters: ReadonlyArray<AbjadLetter> = ABJAD_LETTERS): AbjadFlashcard[] {
  return letters.map((letter) => ({
    id: letter.letter,
    letter,
    sound: ABJAD_SOUNDS[letter.sound],
    nameRomanized: letter.nameRomanized,
    nameNative: letter.nameNative,
  }));
}
