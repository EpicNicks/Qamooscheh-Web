import { parseLexemeTag } from "../../domain/lexemeTag";
import { isBaseVerb } from "../../domain/baseVerb";
import { DirectionalText } from "../common/DirectionalText";
import { StarButton } from "./StarButton";
import { WordAudioButton } from "./WordAudioButton";
import type { LexemeIndexEntry } from "../../types/content";
import styles from "./VocabTermCard.module.css";

interface VocabTermCardProps {
  tag: string;
  entry: LexemeIndexEntry;
  courseCode: string | null | undefined;
  starred: boolean;
  onToggleStar: () => void;
  /** A verb form's base verb (domain/baseVerb.ts), offered to save alongside the form. `onOpen` opens its forms; absent when verbs.json has none. */
  baseVerb?: { tag: string; gloss: string | null; starred: boolean; onToggle: () => void; onOpen?: (anchor: HTMLElement) => void } | null;
  /** An infinitive's forms view: when given, the card's text is a button that opens it. */
  onOpenVerbForms?: ((anchor: HTMLElement) => void) | null;
}

/**
 * One rounded box in the vocabulary review list: the word, its gloss/romanization, a play button, and a star toggle. A saved verb is outlined in its own colour, since practising it brings in every form.
 *
 * An infinitive with forms in verbs.json opens them from its text. A verb form's base-verb chip saves the verb only from its star; the rest of the chip opens the verb's forms.
 */
export function VocabTermCard({ tag, entry, courseCode, starred, onToggleStar, baseVerb, onOpenVerbForms }: VocabTermCardProps) {
  const { surface } = parseLexemeTag(tag);
  const verb = isBaseVerb(entry);
  const baseSurface = baseVerb ? parseLexemeTag(baseVerb.tag).surface : null;

  const text = (
    <>
      <DirectionalText courseCode={courseCode} className={styles.surface}>
        {surface}
      </DirectionalText>
      <span className={styles.gloss}>{entry.gloss}</span>
      {entry.romanization && <span className={styles.romanization}>{entry.romanization}</span>}
      {verb && starred && <span className={styles.verbNote}>Saved verb · practises every form</span>}
      {onOpenVerbForms && <span className={styles.formsHint}>Verb forms ›</span>}
    </>
  );

  const chipText = baseSurface && (
    <>
      <span className={styles.verbLabel}>Verb</span>
      <DirectionalText courseCode={courseCode}>{baseSurface}</DirectionalText>
      {baseVerb?.gloss && <span className={styles.baseVerbGloss}>{baseVerb.gloss}</span>}
    </>
  );

  return (
    <div className={[styles.card, verb && starred && styles.savedVerb].filter(Boolean).join(" ")}>
      {onOpenVerbForms ? (
        <button
          type="button"
          className={[styles.text, styles.textButton].join(" ")}
          aria-label={`${surface}, ${entry.gloss}: show verb forms`}
          onClick={(event) => onOpenVerbForms(event.currentTarget)}
        >
          {text}
        </button>
      ) : (
        <div className={styles.text}>
          {text}
          {baseVerb && baseSurface && (
            <span className={[styles.baseVerb, baseVerb.starred && styles.baseVerbSaved].filter(Boolean).join(" ")}>
              {baseVerb.onOpen ? (
                <button
                  type="button"
                  className={styles.baseVerbOpen}
                  aria-label={`Verb ${baseSurface}${baseVerb.gloss ? `, ${baseVerb.gloss}` : ""}: show verb forms`}
                  onClick={(event) => baseVerb.onOpen?.(event.currentTarget)}
                >
                  {chipText}
                </button>
              ) : (
                <span className={styles.baseVerbOpen}>{chipText}</span>
              )}
              <span className={styles.baseVerbStar}>
                <StarButton
                  starred={baseVerb.starred}
                  verb
                  label={baseVerb.starred ? `Remove the verb ${baseSurface} from saved words` : `Save the verb ${baseSurface} with all its forms`}
                  onToggle={baseVerb.onToggle}
                />
              </span>
            </span>
          )}
        </div>
      )}
      <div className={styles.actions}>
        <WordAudioButton surface={surface} audio={entry.audio} />
        <StarButton starred={starred} verb={verb} onToggle={onToggleStar} />
      </div>
    </div>
  );
}
