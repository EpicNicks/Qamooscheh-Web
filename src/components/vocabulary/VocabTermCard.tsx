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
  /** A verb form's base verb (domain/baseVerb.ts), offered to save alongside the form. */
  baseVerb?: { tag: string; starred: boolean; onToggle: () => void } | null;
}

/** One rounded box in the vocabulary review list: the word, its gloss/romanization, a play button, and a star toggle. A saved verb is outlined in its own colour, since practising it brings in every form. */
export function VocabTermCard({ tag, entry, courseCode, starred, onToggleStar, baseVerb }: VocabTermCardProps) {
  const { surface } = parseLexemeTag(tag);
  const verb = isBaseVerb(entry);
  const baseSurface = baseVerb ? parseLexemeTag(baseVerb.tag).surface : null;

  return (
    <div className={[styles.card, verb && starred && styles.savedVerb].filter(Boolean).join(" ")}>
      <div className={styles.text}>
        <DirectionalText courseCode={courseCode} className={styles.surface}>
          {surface}
        </DirectionalText>
        <span className={styles.gloss}>{entry.gloss}</span>
        {entry.romanization && <span className={styles.romanization}>{entry.romanization}</span>}
        {verb && starred && <span className={styles.verbNote}>Saved verb · practises every form</span>}
        {baseVerb && baseSurface && (
          <span className={[styles.baseVerb, baseVerb.starred && styles.baseVerbSaved].filter(Boolean).join(" ")}>
            <span className={styles.verbLabel}>Verb</span>
            <DirectionalText courseCode={courseCode}>{baseSurface}</DirectionalText>
            <StarButton
              starred={baseVerb.starred}
              verb
              label={baseVerb.starred ? `Remove the verb ${baseSurface} from saved words` : `Save the verb ${baseSurface} with all its forms`}
              onToggle={baseVerb.onToggle}
            />
          </span>
        )}
      </div>
      <div className={styles.actions}>
        <WordAudioButton surface={surface} audio={entry.audio} />
        <StarButton starred={starred} verb={verb} onToggle={onToggleStar} />
      </div>
    </div>
  );
}
