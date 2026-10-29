import { parseLexemeTag } from "../../domain/lexemeTag";
import { isBaseVerb } from "../../domain/baseVerb";
import { DirectionalText } from "../common/DirectionalText";
import type { LexemeIndex } from "../../types/content";
import styles from "./PractisingWord.module.css";

interface PractisingWordProps {
  /** The tag the exercise practises (the practice response's `form`). */
  form: string;
  /** The saved word it was picked for: `form` itself, or a saved verb whose form `form` is. */
  savedTag: string;
  lexemeIndex: LexemeIndex | null | undefined;
  courseCode: string | null | undefined;
}

/**
 * Which saved word a saved-words practice exercise is for, above it. A saved
 * verb brings in sentences with any of its forms, so it names the form in
 * play and the verb it belongs to, in the saved-verb colour.
 */
export function PractisingWord({ form, savedTag, lexemeIndex, courseCode }: PractisingWordProps) {
  const verb = isBaseVerb(lexemeIndex?.[savedTag]);
  const gloss = lexemeIndex?.[form]?.gloss;
  const { surface } = parseLexemeTag(form);
  if (!surface) return null;

  return (
    <p className={[styles.word, verb && styles.verb].filter(Boolean).join(" ")}>
      <span className={styles.label}>Practising</span>
      <DirectionalText courseCode={courseCode} className={styles.surface}>
        {surface}
      </DirectionalText>
      {gloss && <span className={styles.gloss}>{gloss}</span>}
      {verb && form !== savedTag && (
        <span className={styles.gloss}>
          a form of{" "}
          <DirectionalText courseCode={courseCode} className={styles.surface}>
            {parseLexemeTag(savedTag).surface}
          </DirectionalText>
        </span>
      )}
    </p>
  );
}
