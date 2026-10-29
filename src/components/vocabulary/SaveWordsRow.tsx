import { useBootstrap } from "../../hooks/useBootstrap";
import { useLexemeIndex } from "../../hooks/useCourseContent";
import { useStarredLexemes } from "../../hooks/useStarredLexemes";
import { flashcardWords } from "../../domain/flashcards";
import { baseVerbOf, baseVerbTags, isBaseVerb } from "../../domain/baseVerb";
import { DirectionalText } from "../common/DirectionalText";
import { StarButton } from "./StarButton";
import styles from "./SaveWordsRow.module.css";

/**
 * The words an answered exercise used, each with a ★ to save it for
 * flashcards and the saved-words remix — saving a word where you met it,
 * rather than only from the vocabulary list. Attached endings are left out,
 * like everywhere flashcards are built from (domain/flashcards.ts). A verb
 * form also offers its verb (domain/baseVerb.ts), once per verb, which saves
 * every form of it for practice.
 */
export function SaveWordsRow({ tags }: { tags: readonly string[] }) {
  const course = useBootstrap().data?.course ?? null;
  const lexemeIndex = useLexemeIndex(course);
  const saved = useStarredLexemes(course?.code);

  const words = flashcardWords([...new Set(tags)], lexemeIndex.data);
  if (words.length === 0) return null;
  const byLemma = baseVerbTags(lexemeIndex.data);
  const offered = new Set(words.map((word) => word.tag));

  return (
    <div className={styles.row}>
      <span className={styles.label}>Save words:</span>
      {words.flatMap((word) => {
        const verb = isBaseVerb(word.entry);
        const chips = [
          <span key={word.tag} className={[styles.chip, verb && saved.isStarred(word.tag) && styles.savedVerb].filter(Boolean).join(" ")}>
            <DirectionalText courseCode={course?.code} className={styles.surface}>
              {word.surface}
            </DirectionalText>
            <span className={styles.gloss}>{word.entry.gloss}</span>
            <StarButton starred={saved.isStarred(word.tag)} verb={verb} onToggle={() => saved.toggle(word.tag)} />
          </span>,
        ];
        const baseTag = baseVerbOf(word.entry, byLemma);
        const [base] = baseTag && !offered.has(baseTag) ? flashcardWords([baseTag], lexemeIndex.data) : [];
        if (base) {
          offered.add(base.tag);
          const starred = saved.isStarred(base.tag);
          chips.push(
            <span key={base.tag} className={[styles.chip, styles.verbChip, starred && styles.savedVerb].filter(Boolean).join(" ")}>
              <span className={styles.verbLabel}>verb</span>
              <DirectionalText courseCode={course?.code} className={styles.surface}>
                {base.surface}
              </DirectionalText>
              <span className={styles.gloss}>{base.entry.gloss}</span>
              <StarButton
                starred={starred}
                verb
                label={starred ? `Remove the verb ${base.surface} from saved words` : `Save the verb ${base.surface} with all its forms`}
                onToggle={() => saved.toggle(base.tag)}
              />
            </span>,
          );
        }
        return chips;
      })}
      {saved.limitMessage && <span className={styles.limit}>{saved.limitMessage}</span>}
    </div>
  );
}
