// Saved-word flashcards (issue #23). Two kinds: self-rated (flip the card,
// say whether you knew it) and translation (type the word's meaning). Neither
// touches review scheduling; see types/api.ts's v1/flashcards header for the
// XP they earn.
//
// A translation card is graded on the device, against the lexeme's English
// gloss — and glosses are written for reading, not as answer keys: "he / she
// cooks", "to eat / to drink", "uncle (father's brother)", "after / later /
// next (بعد از = after)". So the gloss is first turned into the answers it
// implies, and a typed answer only has to match one of them loosely.
import { parseLexemeTag } from "./lexemeTag";
import type { LexemeIndex, LexemeIndexEntry } from "../types/content";

/** Lowercased, punctuation and extra spaces gone, articles and a leading infinitive "to" dropped — "To the Bazaar!" and "bazaar" compare equal. */
export function normalizeMeaning(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word && word !== "a" && word !== "an" && word !== "the")
    .join(" ")
    .replace(/^to /, "");
}

/**
 * Every answer a gloss accepts, normalized. Parenthesized asides and quotes
 * are dropped; alternatives split on "/", ";" and ","; and a slash between
 * two single words is also expanded in place, so "he / she cooks" accepts
 * "he cooks" and "she cooks" as well as the whole phrase.
 */
export function glossAnswers(gloss: string): string[] {
  const cleaned = gloss.replace(/\([^)]*\)/g, " ").replace(/["“”]/g, " ").replace(/^\s*'|'\s*$/g, " ");
  const answers = new Set<string>();
  const add = (text: string) => {
    const normalized = normalizeMeaning(text);
    if (normalized) answers.add(normalized);
  };

  add(cleaned);
  for (const part of cleaned.split(/[/;,]/)) add(part);

  // "he / she cooks" -> "he cooks", "she cooks"
  const wordSlash = /(\S+)\s*\/\s*(\S+)/;
  const match = cleaned.match(wordSlash);
  if (match && match.index !== undefined) {
    const before = cleaned.slice(0, match.index);
    const after = cleaned.slice(match.index + match[0].length);
    add(before + match[1] + after);
    add(before + match[2] + after);
  }

  return [...answers];
}

/** Whether two strings are at most one edit apart — an insertion, deletion, substitution, or two neighbouring letters swapped (the commonest typo). */
export function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a.length === b.length) {
    const diffs = [...a].flatMap((ch, k) => (ch === b[k] ? [] : [k]));
    if (diffs.length === 2 && diffs[1] === diffs[0] + 1 && a[diffs[0]] === b[diffs[1]] && a[diffs[1]] === b[diffs[0]]) return true;
  }
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** Whether a typed meaning answers a translation card. One typo is forgiven in an answer of five letters or more. */
export function gradeTranslation(typed: string, gloss: string): boolean {
  const answer = normalizeMeaning(typed);
  if (!answer) return false;
  return glossAnswers(gloss).some((accepted) =>
    accepted === answer ? true : accepted.length >= 5 && withinOneEdit(accepted, answer),
  );
}

export interface FlashcardWord {
  tag: string;
  /** The word as written, attributes stripped. */
  surface: string;
  entry: LexemeIndexEntry;
}

/**
 * The saved words this course can show as cards: saved tags (in the order
 * given — most recently saved first) that are in the course's lexeme index.
 * An attached ending (ـم, "my") is a lexeme but not a word you'd drill on its
 * own, so it's left out.
 */
export function flashcardWords(savedTags: readonly string[], lexemeIndex: LexemeIndex | null | undefined): FlashcardWord[] {
  if (!lexemeIndex) return [];
  const words: FlashcardWord[] = [];
  for (const tag of savedTags) {
    const entry = lexemeIndex[tag];
    if (!entry) continue;
    const { surface } = parseLexemeTag(tag);
    if (!surface || surface.startsWith("ـ")) continue;
    words.push({ tag, surface, entry });
  }
  return words;
}

/** XP a correct card earns, mirroring the server's SavedWords:FlashcardXp — for the recap's estimate only; the server's award is what counts. */
export const FLASHCARD_XP = 5;
