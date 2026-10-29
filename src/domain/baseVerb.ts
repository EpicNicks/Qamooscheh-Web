// A verb's base form (Qamooscheh-Backend#102): the infinitive lexeme every
// form of a verb points at through its `lemma`. Saving it practises every
// form of the verb (API_SPEC.md §2.8), so it is offered next to each form and
// shown apart from other saved words.
import type { LexemeIndex, LexemeIndexEntry } from "../types/content";

/** Whether this lexeme is a verb's base form — saving it saves the whole verb. */
export function isBaseVerb(entry: LexemeIndexEntry | null | undefined): boolean {
  return entry?.verbForm === "infinitive";
}

/** Each lemma's infinitive tag. The publisher adds one for every verb lemma, so every form with a lemma has one. */
export function baseVerbTags(lexemeIndex: LexemeIndex | null | undefined): Map<string, string> {
  const byLemma = new Map<string, string>();
  if (!lexemeIndex) return byLemma;
  for (const [tag, entry] of Object.entries(lexemeIndex)) {
    if (isBaseVerb(entry) && entry.lemma && !byLemma.has(entry.lemma)) byLemma.set(entry.lemma, tag);
  }
  return byLemma;
}

/** The infinitive to offer beside a verb form, or null for a word with no lemma, an infinitive itself, or a lemma with no infinitive in this index. */
export function baseVerbOf(entry: LexemeIndexEntry | null | undefined, byLemma: ReadonlyMap<string, string>): string | null {
  if (!entry?.lemma || isBaseVerb(entry)) return null;
  return byLemma.get(entry.lemma) ?? null;
}
