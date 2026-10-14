import { getLanguageInfo } from "../../domain/language";
import { useLocalAppPref } from "../../hooks/useLocalAppPref";
import { KeyboardModeToggle } from "../../components/lesson/languageSettings/KeyboardModeToggle";
import { VoicePicker } from "../../components/settings/VoicePicker";
import type { SettingsSectionProps } from "./SettingsSectionProps";
import styles from "./SettingsPage.module.css";

/** Keyboard behavior and audio — how the app takes input from / plays sound to the learner. */
export function InputSection({ form, editForm, courseCode }: SettingsSectionProps) {
  const language = getLanguageInfo(courseCode)?.language;
  const [speakTiles, setSpeakTiles] = useLocalAppPref("speakWordBankTiles", true);
  const [speakAnswers, setSpeakAnswers] = useLocalAppPref("speakAnswers", true);
  const [speakHovered, setSpeakHovered] = useLocalAppPref("speakHoveredWords", true);
  const [speakHoveredEnglish, setSpeakHoveredEnglish] = useLocalAppPref("speakHoveredEnglish", false);
  const [soundEffects, setSoundEffects] = useLocalAppPref("soundEffects", true);

  return (
    <div className={styles.section}>
      <h2>Input</h2>

      {/* Only Persian's virtual keyboard has a joined/separated distinction (PersianKeyboard.tsx); Japanese's kana/romaji input has nothing this setting changes. */}
      {language === "fa" ? (
        <KeyboardModeToggle value={form.keyboardMode} onChange={(keyboardMode) => editForm({ keyboardMode })} />
      ) : (
        <label className={styles.field}>
          Keyboard
          <select value={form.keyboardMode} onChange={(e) => editForm({ keyboardMode: e.target.value as typeof form.keyboardMode })}>
            <option value="contextual">Joined letters</option>
            <option value="isolated">Separated letters</option>
          </select>
        </label>
      )}

      <label className={`${styles.field} ${styles.checkboxRow}`}>
        <input type="checkbox" checked={form.autoplayAudio} onChange={(e) => editForm({ autoplayAudio: e.target.checked })} />
        Autoplay audio
      </label>

      <label className={`${styles.field} ${styles.checkboxRow}`}>
        <input type="checkbox" checked={speakTiles} onChange={(e) => setSpeakTiles(e.target.checked)} />
        Read words aloud when I pick them from the word bank
      </label>

      <label className={`${styles.field} ${styles.checkboxRow}`}>
        <input type="checkbox" checked={speakAnswers} onChange={(e) => setSpeakAnswers(e.target.checked)} />
        Read the answer aloud after I answer
      </label>

      <label className={`${styles.field} ${styles.checkboxRow}`}>
        <input type="checkbox" checked={speakHovered} onChange={(e) => setSpeakHovered(e.target.checked)} />
        Read a word aloud when I point at or tap it in a sentence
      </label>

      <label className={`${styles.field} ${styles.checkboxRow}`}>
        <input type="checkbox" checked={speakHoveredEnglish} onChange={(e) => setSpeakHoveredEnglish(e.target.checked)} />
        Read English words aloud that way too
      </label>

      <label className={`${styles.field} ${styles.checkboxRow}`}>
        <input type="checkbox" checked={soundEffects} onChange={(e) => setSoundEffects(e.target.checked)} />
        Sound effects for right and wrong answers and finished Parsles
      </label>

      <VoicePicker
        value={form.preferredVoice ?? null}
        onChange={(preferredVoice) => editForm({ preferredVoice })}
        classNames={{ field: styles.field, note: styles.fieldNote, checkbox: `${styles.field} ${styles.checkboxRow}` }}
      />
    </div>
  );
}
