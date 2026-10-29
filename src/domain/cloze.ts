// Fill-in-the-blank flashcards (issue #87, phase 1). A cloze card is a
// sentence from a lesson the learner has met, with one saved word taken out:
// the English meaning stands in the gap and the learner types the word. The
// sentence comes from an existing exercise (no new content), the blank is
// found with the same segmentation that powers the hover hints, and the answer
// is graded on the device — XP and scheduling are the server's
// (API_SPEC.md §2.8a, kind "cloze").
import { segmentAnnotatedText } from "./annotation";
import { isLatinText } from "./englishHints";
import { glossAnswers, normalizeMeaning, withinOneEdit } from "./flashcards";
import { foldCodepoints, normalizeStrict, stripReadingAids } from "./persian/normalize";
import { registerLabel, type WordHint } from "./romanization";
import type { ExerciseArtifact, LexemeIndex, LexemeIndexEntry } from "../types/content";
import type { StarredPracticeWord } from "../types/api";

/** XP a card pays by the attempt it was answered on, mirroring the server's ClozeRules.Xp (first try 5, then 3, then 1, nothing later or for a give-up) — a display estimate; the server's award, cooldown included, is what counts. */
export function clozeXp(attempt: number, correct: boolean): number {
  if (!correct) return 0;
  if (attempt <= 1) return 5;
  if (attempt === 2) return 3;
  if (attempt === 3) return 1;
  return 0;
}

/** The most attempts the server takes for one card. */
export const MAX_CLOZE_ATTEMPTS = 50;

/** A typo is only forgiven in a word this long — in a shorter one a single letter is a different word. */
const TYPO_MIN_LENGTH = 4;

export type ClozeGrade = "exact" | "typo" | "wrong";

function comparable(text: string): string {
  return foldCodepoints(normalizeStrict(text)).toLowerCase();
}

/**
 * Grades a typed word against the blank's accepted spellings. Reading aids
 * (vowel marks, ezafe) and Arabic-vs-Persian letter variants don't count as
 * differences. Regular mode forgives one wrong, missing, extra or swapped
 * letter in a word of four letters or more ("typo"); hardcore mode forgives
 * nothing.
 */
export function gradeCloze(typed: string, accepted: readonly string[], hardcore: boolean): ClozeGrade {
  const answer = comparable(typed);
  if (!answer) return "wrong";
  const keys = accepted.map(comparable).filter(Boolean);
  if (keys.includes(answer)) return "exact";
  if (hardcore) return "wrong";
  return keys.some((key) => key.length >= TYPO_MIN_LENGTH && withinOneEdit(key, answer)) ? "typo" : "wrong";
}

export interface ClozeCard {
  /** The saved word the card drills — what the round is submitted under. */
  tag: string;
  /** The sentence before the blank, as written. */
  before: string;
  /** The sentence after the blank, as written. */
  after: string;
  /** The word as written in the sentence (with its reading aids) — shown in the gap once answered. */
  blankText: string;
  /** The spellings accepted for the blank. */
  accepted: string[];
  /** What stands in the gap: the English for the word. */
  gapLabel: string;
  /** The English side of the sentence pair. */
  english: string;
  /** The exercise's tags other than the blank's, which say how the words around the gap split. */
  contextTags: string[];
}

/** The Persian (target-language) and English sides of an exercise, or null for a kind a blank can't be cut from. */
function sentenceSides(exercise: ExerciseArtifact): { sentence: string; english: string } | null {
  if (exercise.type !== "type_in" && exercise.type !== "word_bank") return null;
  if (exercise.answer.length === 0) return null;
  const answerText = exercise.type === "word_bank" ? exercise.answer.join(" ") : exercise.answer[0];
  return isLatinText(exercise.prompt) ? { sentence: answerText, english: exercise.prompt } : { sentence: exercise.prompt, english: answerText };
}

/** The English that stands in the gap: a meaning of the word that appears in the English sentence when one does, else the gloss without its asides, plus its register when the word is informal. */
export function gapLabel(entry: LexemeIndexEntry, english: string): string {
  const padded = ` ${normalizeMeaning(english)} `;
  const inSentence = glossAnswers(entry.gloss).find((meaning) => padded.includes(` ${meaning} `));
  const label = inSentence ?? (entry.gloss.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim() || entry.gloss);
  const register = registerLabel(entry.register);
  return register ? `${label} [${register}]` : label;
}

/**
 * The cloze card an exercise gives for `tag`, or null when it can't give an
 * unambiguous one: the word must be written exactly once in the sentence, and
 * not run together with another of the exercise's words under one hover.
 * `hintMap` is the course-wide (ungated) map.
 */
export function buildClozeCard(
  exercise: ExerciseArtifact,
  tag: string,
  hintMap: ReadonlyMap<string, WordHint>,
  lexemeIndex: LexemeIndex,
): ClozeCard | null {
  const entry = lexemeIndex[tag];
  const sides = sentenceSides(exercise);
  if (!entry || !sides) return null;

  const segments = segmentAnnotatedText(sides.sentence, hintMap, exercise.tags);
  const hits = segments.flatMap((segment, index) => (segment.isWord && segment.hint?.senses?.some((sense) => sense.tag === tag) ? [index] : []));
  if (hits.length !== 1) return null;
  const at = hits[0];
  const own = new Set(exercise.tags);
  if ((segments[at].hint?.senses ?? []).filter((sense) => own.has(sense.tag)).length > 1) return null;

  const blankText = segments[at].text;
  const join = (list: typeof segments) => list.map((segment) => segment.text).join("");
  return {
    tag,
    before: join(segments.slice(0, at)),
    after: join(segments.slice(at + 1)),
    blankText,
    accepted: [...new Set([stripReadingAids(blankText), ...(entry.forms ?? [])])],
    gapLabel: gapLabel(entry, sides.english),
    english: sides.english,
    contextTags: exercise.tags.filter((t) => t !== tag),
  };
}

/** One saved word and the exercises (already loaded) that use it. */
export interface ClozeSource {
  tag: string;
  exercises: ExerciseArtifact[];
  /** The tag each exercise blanks out, when it isn't `tag`: for a saved verb, the form of it that exercise uses. */
  forms?: readonly string[];
}

/**
 * One card per source word, from the first of its exercises that gives a
 * blank — or, with `pick`, a random one of those that do. A word with no
 * usable sentence is left out: a cloze round is all cloze cards.
 */
export function buildClozeDeck(
  sources: readonly ClozeSource[],
  hintMap: ReadonlyMap<string, WordHint>,
  lexemeIndex: LexemeIndex,
  pick: (count: number) => number = () => 0,
): ClozeCard[] {
  const deck: ClozeCard[] = [];
  for (const source of sources) {
    const cards = source.exercises.flatMap((exercise, i) => {
      const card = buildClozeCard(exercise, source.forms?.[i] ?? source.tag, hintMap, lexemeIndex);
      return card ? [card] : [];
    });
    if (cards.length > 0) deck.push(cards[pick(cards.length)]);
  }
  return deck;
}

/**
 * The sources for a Repack's cloze round (issue #105): one per word, in the
 * order `tags` give, each with the exercises that use it. A word no exercise
 * uses is left out here; a word with exercises but no usable blank is left
 * out by buildClozeDeck.
 */
export function clozeSourcesForTags(tags: readonly string[], exercises: readonly ExerciseArtifact[]): ClozeSource[] {
  const seen = new Set<string>();
  const sources: ClozeSource[] = [];
  for (const tag of tags) {
    if (seen.has(tag)) continue;
    seen.add(tag);
    const using = exercises.filter((exercise) => exercise.tags.includes(tag));
    if (using.length > 0) sources.push({ tag, exercises: [...using] });
  }
  return sources;
}

/**
 * The sources for a saved-words cloze round, from GET
 * /v1/vocab/starred/practice's words: one per word, each exercise blanking
 * the form it practises, so a saved verb is cut from whichever of its forms
 * the sentence uses. `exerciseAt` looks up a loaded exercise; one not loaded
 * is left out.
 */
export function practiceClozeSources(
  words: readonly StarredPracticeWord[],
  exerciseAt: (ref: { unitKey: string; skillKey: string; ordinal: number }) => ExerciseArtifact | undefined,
): ClozeSource[] {
  return words.map((word) => {
    const exercises: ExerciseArtifact[] = [];
    const forms: string[] = [];
    for (const ref of word.exercises) {
      const exercise = exerciseAt(ref);
      if (!exercise) continue;
      exercises.push(exercise);
      forms.push(ref.form);
    }
    return { tag: word.tag, exercises, forms };
  });
}

/** Cards in one Repack cloze round, at most (the size of a Repack's exercises). */
export const CLOZE_ROUND_WORDS = 20;

export interface ClozeResult {
  tag: string;
  /** False when the learner gave up on the card. */
  correct: boolean;
  /** The attempt the card ended on. */
  attempt: number;
  elapsedMs: number;
}

export interface ClozeSummary {
  firstTry: number;
  secondTry: number;
  thirdTry: number;
  /** Right on a fourth attempt or later, which pays nothing. */
  later: number;
  gaveUp: number;
  /** The most the round could pay: what the table says, before the server's per-word daily cooldown. */
  maxXp: number;
}

export function summarizeCloze(results: readonly ClozeResult[]): ClozeSummary {
  const summary: ClozeSummary = { firstTry: 0, secondTry: 0, thirdTry: 0, later: 0, gaveUp: 0, maxXp: 0 };
  for (const { correct, attempt } of results) {
    summary.maxXp += clozeXp(attempt, correct);
    if (!correct) summary.gaveUp++;
    else if (attempt <= 1) summary.firstTry++;
    else if (attempt === 2) summary.secondTry++;
    else if (attempt === 3) summary.thirdTry++;
    else summary.later++;
  }
  return summary;
}

/** What the card says an attempt is worth, before it is answered. */
export function attemptWorth(attempt: number): string {
  const xp = clozeXp(attempt, true);
  if (attempt <= 1) return `Worth up to ${xp} XP.`;
  return xp > 0 ? `Not quite. Now worth up to ${xp} XP.` : "Not quite. This one no longer pays XP.";
}

/** The result screen's lines: how the cards went by attempt, and the XP the server returned (null while it is saved, undefined when saving failed). */
export function clozeResultLines(summary: ClozeSummary, correct: number, serverXp: number | null | undefined): { breakdown: string; xp: string } {
  const parts = [
    `${summary.firstTry} on the first try (5 XP each)`,
    `${summary.secondTry} on the second (3 XP)`,
    `${summary.thirdTry} on the third (1 XP)`,
  ];
  if (summary.later > 0) parts.push(`${summary.later} later (no XP)`);
  if (summary.gaveUp > 0) parts.push(`${summary.gaveUp} skipped`);
  let xp: string;
  if (serverXp === null) xp = "Saving your XP…";
  else if (serverXp === undefined) xp = "Couldn't save this round's XP.";
  else if (serverXp > 0) xp = `+${serverXp} XP${serverXp < summary.maxXp ? ". Words you've practised a lot today pay less." : ""}`;
  else xp = correct > 0 ? "No XP this round: those words have paid out for today already, or aren't learned words yet." : "No XP this round.";
  return { breakdown: `${parts.join(", ")}.`, xp };
}
