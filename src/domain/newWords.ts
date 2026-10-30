// The words a Parsle introduces (SkillArtifact.newLexemes): highlighted, and
// hoverable for free even with hover hints turned off, since the learner has
// never seen them before (issue #133).
import { stripReadingAids } from "./persian/normalize";
import type { WordHint } from "./romanization";

export interface NewWords {
  /** The new lexeme tags, as authored ("مادر<n>"). An English prompt word matches by tag. */
  tags: ReadonlySet<string>;
  /** Their written forms, without reading aids. A native word matches by surface. */
  surfaces: ReadonlySet<string>;
  /** Course-wide hints for just these surfaces, whatever the learner's hint toggles say. */
  hintMap: ReadonlyMap<string, WordHint>;
}

export const NO_NEW_WORDS: NewWords = { tags: new Set(), surfaces: new Set(), hintMap: new Map() };

/** The new words of an exercise's Parsle, with their hints taken from the ungated course map. */
export function buildNewWords(newLexemes: readonly string[] | null | undefined, courseHintMap: ReadonlyMap<string, WordHint>): NewWords {
  if (!newLexemes || newLexemes.length === 0) return NO_NEW_WORDS;
  const surfaces = new Set<string>();
  const hintMap = new Map<string, WordHint>();
  for (const tag of newLexemes) {
    const surface = stripReadingAids(tag.split("<", 1)[0]);
    if (!surface) continue;
    surfaces.add(surface);
    const hint = courseHintMap.get(surface);
    if (hint) hintMap.set(surface, hint);
  }
  return { tags: new Set(newLexemes), surfaces, hintMap };
}

/** Whether a native word (or phrase) as written is one of the new words. */
export function isNewNativeWord(word: string, newWords: NewWords): boolean {
  return newWords.surfaces.size > 0 && newWords.surfaces.has(stripReadingAids(word));
}

/** Whether any of an exercise's tags is new: its English prompt then has a free hover even with hints off. */
export function hasNewTag(tags: readonly string[], newWords: NewWords): boolean {
  return newWords.tags.size > 0 && tags.some((tag) => newWords.tags.has(tag));
}

/**
 * `hintMap` (gated by the learner's toggles, so possibly empty) with the new
 * words' hints added where it has none, so those words still split out and
 * show a tooltip. Returns `hintMap` itself when there is nothing to add.
 */
export function withNewWordHints(hintMap: ReadonlyMap<string, WordHint>, newWords: NewWords): ReadonlyMap<string, WordHint> {
  const missing = [...newWords.hintMap].filter(([surface]) => !hintMap.has(surface));
  if (missing.length === 0) return hintMap;
  return new Map([...hintMap, ...missing]);
}
