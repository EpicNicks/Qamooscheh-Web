import { romanizeSentence } from "../../domain/annotation";
import type { TextDisplaySettings, WordHint } from "../../domain/romanization";
import styles from "./Exercise.module.css";

/**
 * A native-script sentence's whole romanization, shown above it when the
 * learner has asked for it (localAppPrefs.ts's showSentenceRomanization): the
 * authored one when the exercise has it (ExerciseArtifact.promptRomanization/
 * answerRomanization, ezafe included), otherwise one assembled word by word
 * from the hint map (domain/annotation.ts's romanizeSentence). Nothing in
 * "romanized" display, where the sentence itself is already Latin, or for a
 * sentence with nothing native to romanize.
 */
export function SentenceRomanization({
  text,
  authored,
  hintMap,
  settings,
}: {
  text: string;
  authored?: string | null;
  hintMap: ReadonlyMap<string, WordHint>;
  settings: TextDisplaySettings;
}) {
  if (!settings.sentenceRomanization || settings.display === "romanized") return null;
  const romanization = authored || romanizeSentence(text, hintMap);
  if (!romanization) return null;
  return (
    <p className={styles.sentenceRomanization} dir="ltr">
      {romanization}
    </p>
  );
}
