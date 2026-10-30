// The words a Parsle introduces (SkillArtifact.newLexemes): highlighted in its
// prompts, and hoverable for free even with hover hints turned off, since the
// learner has never seen them before (issue #133). Only while a Parsle itself
// is played — on the path, a practice replay of it, or a Deep Dive — never in
// a checkpoint, Repack, saved-word practice, story or flashcard.
import type { WordHint } from "./romanization";

/** How an attached ending is keyed in the hint map: after a tatweel (domain/attachedEndings.ts). */
const ATTACH = "ـ";

export interface NewWords {
  /** The new lexeme tags, as authored ("سر<n>"); each conjugated form is its own tag. */
  tags: ReadonlySet<string>;
  /**
   * Course-wide hints for the new words, whatever the learner's hint toggles
   * say, plus every attached ending's, so a new stem written with one (سرم
   * when سر is new) still splits out of a map gated empty.
   */
  hintMap: ReadonlyMap<string, WordHint>;
}

export const NO_NEW_WORDS: NewWords = { tags: new Set(), hintMap: new Map() };

const built = new WeakMap<ReadonlyMap<string, WordHint>, WeakMap<readonly string[], NewWords>>();

/** The new words of an exercise's Parsle. Cached per artifact list, so a re-render hands out the same object. */
export function buildNewWords(newLexemes: readonly string[] | null | undefined, courseHintMap: ReadonlyMap<string, WordHint>): NewWords {
  if (!newLexemes || newLexemes.length === 0) return NO_NEW_WORDS;
  let forMap = built.get(courseHintMap);
  if (!forMap) built.set(courseHintMap, (forMap = new WeakMap()));
  const cached = forMap.get(newLexemes);
  if (cached) return cached;

  const hintMap = new Map<string, WordHint>();
  for (const tag of newLexemes) {
    const surface = tag.split("<", 1)[0];
    const hint = surface ? courseHintMap.get(surface) : undefined;
    if (hint) hintMap.set(surface, hint);
  }
  for (const [key, hint] of courseHintMap) {
    if (key.startsWith(ATTACH)) hintMap.set(key, hint);
  }
  const newWords: NewWords = { tags: new Set(newLexemes), hintMap };
  forMap.set(newLexemes, newWords);
  return newWords;
}

/**
 * Whether a native prompt word is new: its own tag, or its stem's when it's
 * written with endings attached, is one of the new ones. A new ending alone
 * doesn't count (مادرم when only ـم is new). Of a homograph's tags, only the
 * exercise's own are read when it has any.
 */
export function isNewNativeWord(hint: WordHint | null, newWords: NewWords, tags?: readonly string[]): boolean {
  if (!hint || newWords.tags.size === 0) return false;
  const wordTags = hint.stemTags ?? hint.senses?.map((sense) => sense.tag) ?? [];
  return wordTags.some((tag) => newWords.tags.has(tag) && (!tags || tags.length === 0 || tags.includes(tag)));
}

/** Whether any of an exercise's tags is new: its English prompt then has a free hover even with hints off. */
export function hasNewTag(tags: readonly string[], newWords: NewWords): boolean {
  return newWords.tags.size > 0 && tags.some((tag) => newWords.tags.has(tag));
}

const merged = new WeakMap<ReadonlyMap<string, WordHint>, WeakMap<NewWords, ReadonlyMap<string, WordHint>>>();

/**
 * `hintMap` (gated by the learner's toggles, so possibly empty) with the new
 * words' hints added where it has none, so those words still split out and
 * show a tooltip. Returns `hintMap` itself when there is nothing to add, and
 * the same merged map each time otherwise (attachedEndings.ts caches per map).
 */
export function withNewWordHints(hintMap: ReadonlyMap<string, WordHint>, newWords: NewWords): ReadonlyMap<string, WordHint> {
  if (newWords === NO_NEW_WORDS) return hintMap;
  let forMap = merged.get(hintMap);
  if (!forMap) merged.set(hintMap, (forMap = new WeakMap()));
  let result = forMap.get(newWords);
  if (!result) {
    const missing = [...newWords.hintMap].filter(([surface]) => !hintMap.has(surface));
    result = missing.length === 0 ? hintMap : new Map([...hintMap, ...missing]);
    forMap.set(newWords, result);
  }
  return result;
}
