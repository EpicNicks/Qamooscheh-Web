// Hover hints the other way round (issue #13): an English word in a prompt
// shows the Persian for it. Matched only against the lexemes THIS exercise is
// tagged with — its `tags` are exactly the words it drills — so "you" or "is"
// can't pick up one of the dozens of lexemes whose gloss mentions them
// course-wide. For "My mother is tired" tagged مادر, خسته, ـم and است,
// "mother" -> مادر, "tired" -> خسته, "my" -> ـم, "is" -> است.
import { segmentWords } from "./annotation";
import { tidyGloss } from "./attachedEndings";
import type { WordHint } from "./romanization";

/** What an English word's hover shows: the lexeme as it's written, its romanization, and its infinitive when it is a verb (the "Verb forms" entry). */
export interface NativeHint {
  /** The exercise tag it was matched from ("مادر<n>"). */
  tag: string;
  native: string;
  romanization: string | null;
  verbLemma?: string;
}

interface Candidate {
  /** The gloss alternative, lowercased, as words ("thank you" -> ["thank", "you"]). */
  words: string[];
  /** For a progressive reading (progressiveForms), its last word must be written with -ing: "is open" is a state, not "is opening". */
  progressive?: boolean;
  hint: NativeHint;
}

/** Longest English phrase tried as one match ("thank you very much"). */
const MAX_PHRASE_WORDS = 4;

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’]/g, "'")
    .split(/\s+/)
    .map((word) => word.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, ""))
    .filter((word) => word !== "");
}

/**
 * A gloss's alternative phrasings, each as words. Alternatives are split on
 * ";", "," and a spaced " / " ("I / me"), and a shorter one borrows the last
 * one's trailing words ("he / she came" -> "he came", "she came"); a slash
 * inside a word ("he/she wants") gives every combination. Parenthesized
 * words drop out ("(that) you go" -> "you go").
 */
function glossPhrases(gloss: string): string[][] {
  const pieces = gloss
    .split(/\s*[;,]\s*|\s+\/\s+/)
    .map((piece) => piece.replace(/\([^)]*\)/g, " ").trim().split(/\s+/).filter((w) => w !== ""))
    .filter((piece) => piece.length > 0);
  const last = pieces[pieces.length - 1] ?? [];
  const phrases: string[][] = [];
  for (const piece of pieces) {
    const full = piece.length < last.length ? [...piece, ...last.slice(piece.length)] : piece;
    let combos: string[][] = [[]];
    for (const word of full) combos = combos.flatMap((combo) => word.split("/").filter((w) => w).map((w) => [...combo, w]));
    phrases.push(...combos.map((combo) => words(combo.join(" "))));
  }
  return phrases;
}

/**
 * Extra English a prompt uses for a single-word gloss. یک "one" is usually the
 * article "a" / "an"; a pronoun after an ezafe is a possessive (برادرِ من, "my
 * brother"); and a few glosses have an everyday English twin (در "in" / "at",
 * خوب "good" / "well", خانه "home" / "house"). Safe to be generous here: only
 * the exercise's own lexemes are ever matched.
 */
const PROMPT_EQUIVALENTS: Record<string, string[]> = {
  one: ["a", "an"],
  i: ["my", "me"],
  me: ["my"],
  we: ["our", "us"],
  you: ["your"],
  he: ["his", "him"],
  she: ["her"],
  they: ["their", "them"],
  in: ["at", "inside"],
  good: ["well", "fine"],
  home: ["house"],
};

/** The "be" a subject pronoun takes, for a verb gloss's progressive reading. */
const BE: Record<string, string> = { i: "am", you: "are", we: "are", they: "are", he: "is", she: "is", it: "is" };

/** A third-person verb back to its base form ("buys" -> buy, "watches" -> watch, "carries" -> carry, "has" -> have). */
function baseVerb(verb: string): string {
  if (verb === "has") return "have";
  if (verb.endsWith("ies")) return verb.slice(0, -3) + "y";
  if (/(s|x|z|ch|sh|o)es$/.test(verb)) return verb.slice(0, -2);
  if (verb.endsWith("s") && !verb.endsWith("ss")) return verb.slice(0, -1);
  return verb;
}

/**
 * Persian's present tense is English's simple and progressive present both:
 * می‌خرم, glossed "I buy", is just as much "I am buying" (issue #34). So a
 * subject-and-verb gloss also reads as subject + be + verb, and as be + verb
 * alone for "I'm buying" (whose "I'm" stands for "am" — see wordForms), and
 * an infinitive gloss ("to build") reads as any be + verb ("are building"). The
 * verb is left in its base form; wordForms takes a prompt's "buying" back to it.
 */
function progressiveForms(phrase: string[], pos: string): string[][] {
  if (!pos.startsWith("<v>") || phrase.length !== 2) return [];
  // An infinitive gloss ("to build") has no subject to agree with: any "be" will do.
  if (phrase[0] === "to") return ["am", "is", "are"].map((be) => [be, phrase[1]]);
  if (!(phrase[0] in BE)) return [];
  const [subject, verb] = phrase;
  const be = BE[subject];
  const base = be === "is" ? baseVerb(verb) : verb;
  return [
    [subject, be, base],
    [be, base],
  ];
}

/**
 * Every English phrasing of this exercise's lexemes. A gloss is trimmed of
 * its authoring notes (attachedEndings.ts's tidyGloss) and split into its
 * alternatives (glossPhrases), a verb's "to" is optional ("to have" also
 * matches "have"), and "I buy" also matches "I am buying" (progressiveForms). A tag's own sense is used when its surface has several
 * (ـم is both "my" and "am"). Suffix-only alternatives ("-er") are skipped —
 * no English word is spelled that way.
 */
export function englishCandidates(tags: readonly string[], hintMap: ReadonlyMap<string, WordHint>): Candidate[] {
  const own: Candidate[] = [];
  const borrowed: Candidate[] = [];
  for (const tag of tags) {
    const surface = tag.split("<", 1)[0];
    const hint = hintMap.get(surface);
    if (!surface || !hint) continue;
    const pos = tag.slice(surface.length);
    // The tag's own sense carries its own verbLemma. WordHint.verbLemma is
    // first-wins across every lexeme written this way, so it is only the
    // fallback for a tag no sense matches.
    const sense = hint.senses?.find((s) => s.pos === pos) ?? {
      translation: hint.translation,
      romanization: hint.romanization,
      verbLemma: hint.verbLemma,
    };
    const native: NativeHint = { tag, native: surface, romanization: sense.romanization, verbLemma: sense.verbLemma };
    for (const phrase of glossPhrases(tidyGloss(sense.translation))) {
      if (phrase.length === 0 || phrase[0].startsWith("-")) continue;
      const forms = phrase[0] === "to" && phrase.length > 1 ? [phrase, phrase.slice(1)] : [phrase];
      own.push(...forms.map((words) => ({ words, hint: native })));
      own.push(...progressiveForms(phrase, pos).map((words) => ({ words, hint: native, progressive: true })));
      if (phrase.length === 1) borrowed.push(...(PROMPT_EQUIVALENTS[phrase[0]] ?? []).map((w) => ({ words: [w], hint: native })));
    }
  }
  // A lexeme whose own gloss says the word beats one that only borrows it:
  // in "for my mother", "my" is ـم ("my"), not من ("I", which also reads "my").
  const candidates: Candidate[] = [];
  const seen = new Set<string>();
  for (const candidate of [...own, ...borrowed]) {
    const key = candidate.words.join(" ");
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(candidate);
  }
  return candidates;
}

/**
 * A prompt word and the base forms it could be ("books" -> book, "watches" ->
 * watch, "cities" -> city, "buying" -> buy, "making" -> make, "running" ->
 * run, "lying" -> lie), and either half of a contraction ("I'm" -> I or am,
 * "it's" -> it or is, "we're" -> we or are).
 */
const CONTRACTIONS: Record<string, string> = { m: "am", s: "is", re: "are", ve: "have", ll: "will", d: "would" };

function wordForms(word: string): string[] {
  const forms = [word];
  const contraction = /^([a-z]+)'([a-z]+)$/.exec(word);
  if (contraction && contraction[2] in CONTRACTIONS) forms.push(contraction[1], CONTRACTIONS[contraction[2]]);
  if (word.endsWith("ies")) forms.push(word.slice(0, -3) + "y");
  if (word.endsWith("es")) forms.push(word.slice(0, -2));
  if (word.endsWith("s") && !word.endsWith("ss")) forms.push(word.slice(0, -1));
  if (word.endsWith("ing") && word.length > 4) {
    const stem = word.slice(0, -3);
    forms.push(stem, stem + "e");
    if (/([^aeiouy])\1$/.test(stem)) forms.push(stem.slice(0, -1));
    if (word.endsWith("ying")) forms.push(word.slice(0, -4) + "ie");
  }
  return forms;
}

export interface EnglishSegment {
  text: string;
  isWord: boolean;
  hint: NativeHint | null;
}

/**
 * `text` split for rendering, the same way domain/annotation.ts's
 * segmentAnnotatedText splits native text: greedy longest phrase match (up to
 * MAX_PHRASE_WORDS words), everything between words passed through as-is, and
 * a word with no match left plain.
 */
export function segmentEnglish(text: string, candidates: readonly Candidate[]): EnglishSegment[] {
  const pieces = segmentWords(text);
  const segments: EnglishSegment[] = [];
  for (let i = 0; i < pieces.length; ) {
    if (!pieces[i].isWord) {
      segments.push({ text: pieces[i].text, isWord: false, hint: null });
      i++;
      continue;
    }
    // The word pieces from i on, and where each one ends.
    const run: { forms: string[]; end: number }[] = [];
    for (let j = i; j < pieces.length && run.length < MAX_PHRASE_WORDS; j++) {
      if (!pieces[j].isWord) {
        if (/[^\s'’-]/.test(pieces[j].text)) break; // a phrase never spans punctuation
        continue;
      }
      const [word] = words(pieces[j].text);
      if (!word) break;
      run.push({ forms: wordForms(word), end: j + 1 });
    }
    let match: { end: number; hint: NativeHint } | null = null;
    for (let length = run.length; length > 0 && !match; length--) {
      const fits = candidates.filter(
        (c) =>
          c.words.length === length &&
          c.words.every((word, k) => run[k].forms.includes(word)) &&
          (!c.progressive || run[length - 1].forms[0].endsWith("ing")),
      );
      // A word as written beats a form derived from it: "evening" is the
      // evening's lexeme before it's "even" + -ing.
      const hit = fits.find((c) => c.words.every((word, k) => run[k].forms[0] === word)) ?? fits[0];
      if (hit) match = { end: run[length - 1].end, hint: hit.hint };
    }
    const end = match?.end ?? i + 1;
    segments.push({ text: pieces.slice(i, end).map((p) => p.text).join(""), isWord: true, hint: match?.hint ?? null });
    i = end;
  }
  return segments;
}

/** Whether `text` is written in Latin letters only — an English (or romanized) prompt, not a native one. */
export function isLatinText(text: string): boolean {
  return /\p{L}/u.test(text) && !/[^\p{Script=Latin}\P{L}]/u.test(text);
}
