import { parseLexemeTag } from "../../domain/lexemeTag";
import { DirectionalText } from "../common/DirectionalText";
import type { ScriptMode } from "../../domain/enums";
import type { LexemeIndex, LexemeIndexEntry } from "../../types/content";
import styles from "./VocabularyPanel.module.css";

interface VocabularyEntry {
  tag: string;
  surface: string;
  entry: LexemeIndexEntry;
}

interface VocabularyPanelProps {
  tags: string[];
  lexemeIndex: LexemeIndex | undefined;
  courseCode: string | null | undefined;
  scriptMode: ScriptMode;
}

/**
 * The "hover a word to see its meaning" feature Qamooscheh.Content's README
 * names as the lexeme index's whole purpose — shown as a lookup row below
 * the exercise rather than true inline hover, since an exercise's tags
 * aren't mapped to individual tile/prompt substrings in the content schema
 * (see ExerciseArtifact — tags are exercise-level, not per-tile).
 */
export function VocabularyPanel({ tags, lexemeIndex, courseCode, scriptMode }: VocabularyPanelProps) {
  if (!lexemeIndex || tags.length === 0) return null;

  const entries = tags
    .map((tag) => ({ tag, surface: parseLexemeTag(tag).surface, entry: lexemeIndex[tag] }))
    .filter((e): e is VocabularyEntry => e.entry != null);

  if (entries.length === 0) return null;

  const showRomanization = scriptMode !== "native";

  return (
    <div className={styles.panel}>
      <p className={styles.label}>Vocabulary</p>
      <ul className={styles.list}>
        {entries.map(({ tag, surface, entry }) => (
          <li key={tag} className={styles.item}>
            <DirectionalText courseCode={courseCode} className={styles.surface}>
              {surface}
            </DirectionalText>
            <span className={styles.gloss}>{entry.gloss}</span>
            {showRomanization && entry.romanization && (
              <span className={styles.romanization}>{entry.romanization}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
