// Which saved-word tag a word in a story line stands for, so the reader can
// highlight it when saved and save it from its tooltip. Attached endings are
// never saved (domain/flashcards.ts), and a verb form's own tag is saved as
// itself — only an infinitive is the whole verb, drawn purple (domain/baseVerb.ts).
import type { WordHint } from "./romanization";
import type { LexemeIndex } from "../types/content";
import { flashcardWords } from "./flashcards";
import { isBaseVerb } from "./baseVerb";

/**
 * The tag `hint` saves under, or null when the word can't be saved (no lexeme,
 * an ending, or a tag the course doesn't index). A word with several senses
 * takes the first the line's own `exerciseTags` pick out; with none given, the
 * first it has.
 */
export function savedTagFor(
  hint: WordHint | null,
  exerciseTags: readonly string[],
  lexemeIndex: LexemeIndex | null | undefined,
): { tag: string; verb: boolean } | null {
  if (!hint) return null;
  const candidates = hint.senses?.map((sense) => sense.tag) ?? hint.stemTags ?? [];
  const own = exerciseTags.length > 0 ? candidates.filter((tag) => exerciseTags.includes(tag)) : candidates;
  for (const tag of own) {
    const [word] = flashcardWords([tag], lexemeIndex);
    if (word) return { tag, verb: isBaseVerb(word.entry) };
  }
  return null;
}
