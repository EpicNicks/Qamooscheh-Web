import { parseLexemeTag } from "./lexemeTag";
import { isBaseVerb } from "./baseVerb";
import type { LexemeIndex, LexemeIndexEntry } from "../types/content";

/**
 * Folds text for vocabulary search: case, Latin accents/macrons and Arabic
 * diacritics (harakat) are ignored, but Japanese dakuten/handakuten are kept
 * (か and が are different words), and the Arabic-keyboard yeh/kaf match their Persian
 * forms, so "cafe" finds "café" and a word typed without vowel marks still
 * finds its vowelled spelling.
 */
export function foldForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/(?![゙゚])\p{M}/gu, "")
    .normalize("NFC")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Whether a word matches [query] in its written form, gloss or romanization; a blank query matches everything. */
export function matchesVocabQuery(tag: string, entry: LexemeIndexEntry, query: string): boolean {
  const needle = foldForSearch(query);
  if (needle === "") return true;
  return [parseLexemeTag(tag).surface, entry.gloss, entry.romanization ?? ""].some((field) => foldForSearch(field).includes(needle));
}

/**
 * The course's verb infinitives that match [query] and aren't already in
 * [taughtTags], in index order: a search also finds verbs the learner hasn't
 * met as taught words, so they can be opened for their forms. A blank query
 * adds nothing.
 */
export function matchingInfinitives(lexemeIndex: LexemeIndex | null | undefined, taughtTags: readonly string[], query: string): string[] {
  if (!lexemeIndex || foldForSearch(query) === "") return [];
  const taught = new Set(taughtTags);
  return Object.entries(lexemeIndex)
    .filter(([tag, entry]) => isBaseVerb(entry) && !taught.has(tag) && matchesVocabQuery(tag, entry, query))
    .map(([tag]) => tag);
}
