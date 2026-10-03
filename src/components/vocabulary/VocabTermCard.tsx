import { parseLexemeTag } from "../../domain/lexemeTag";
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
}

/** One rounded box in the vocabulary review list: the word, its gloss/romanization, a play button, and a star toggle. */
export function VocabTermCard({ tag, entry, courseCode, starred, onToggleStar }: VocabTermCardProps) {
  const { surface } = parseLexemeTag(tag);

  return (
    <div className={styles.card}>
      <div className={styles.text}>
        <DirectionalText courseCode={courseCode} className={styles.surface}>
          {surface}
        </DirectionalText>
        <span className={styles.gloss}>{entry.gloss}</span>
        {entry.romanization && <span className={styles.romanization}>{entry.romanization}</span>}
      </div>
      <div className={styles.actions}>
        <WordAudioButton surface={surface} audio={entry.audio} />
        <StarButton starred={starred} onToggle={onToggleStar} />
      </div>
    </div>
  );
}
