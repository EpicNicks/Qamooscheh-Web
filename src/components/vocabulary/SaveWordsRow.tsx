import { useBootstrap } from "../../hooks/useBootstrap";
import { useLexemeIndex } from "../../hooks/useCourseContent";
import { useStarredLexemes } from "../../hooks/useStarredLexemes";
import { flashcardWords } from "../../domain/flashcards";
import { DirectionalText } from "../common/DirectionalText";
import { StarButton } from "./StarButton";
import styles from "./SaveWordsRow.module.css";

/**
 * The words an answered exercise used, each with a ★ to save it for
 * flashcards and the saved-words remix — saving a word where you met it,
 * rather than only from the vocabulary list. Attached endings are left out,
 * like everywhere flashcards are built from (domain/flashcards.ts).
 */
export function SaveWordsRow({ tags }: { tags: readonly string[] }) {
  const course = useBootstrap().data?.course ?? null;
  const lexemeIndex = useLexemeIndex(course);
  const saved = useStarredLexemes(course?.code);

  const words = flashcardWords([...new Set(tags)], lexemeIndex.data);
  if (words.length === 0) return null;

  return (
    <div className={styles.row}>
      <span className={styles.label}>Save words:</span>
      {words.map((word) => (
        <span key={word.tag} className={styles.chip}>
          <DirectionalText courseCode={course?.code} className={styles.surface}>
            {word.surface}
          </DirectionalText>
          <span className={styles.gloss}>{word.entry.gloss}</span>
          <StarButton starred={saved.isStarred(word.tag)} onToggle={() => saved.toggle(word.tag)} />
        </span>
      ))}
      {saved.limitMessage && <span className={styles.limit}>{saved.limitMessage}</span>}
    </div>
  );
}
