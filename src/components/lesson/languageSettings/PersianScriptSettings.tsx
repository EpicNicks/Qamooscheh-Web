import { ScriptModeToggle } from "./ScriptModeToggle";
import { NativeTextAlignToggle } from "./NativeTextAlignToggle";
import type { LanguageSettingsProps } from "./LanguageSettingsProps";
import styles from "./ScriptSettingsLayout.module.css";
import checkboxStyles from "./CheckboxRow.module.css";

/** Persian's settings: native/romanized display, block alignment for native-script text, (like Japanese) hover-to-reveal word romanization, and the reading aids ordinary Persian doesn't write. */
export function PersianScriptSettings({
  scriptMode,
  onChangeScriptMode,
  showRomanizationHints,
  onChangeShowRomanizationHints,
  showTranslationHints,
  onChangeShowTranslationHints,
  nativeTextAlign,
  onChangeNativeTextAlign,
  showVowelMarks,
  onChangeShowVowelMarks,
  showSentenceRomanization,
  onChangeShowSentenceRomanization,
}: LanguageSettingsProps) {
  return (
    <div className={styles.wrap}>
      <ScriptModeToggle language="fa" value={scriptMode} onChange={onChangeScriptMode} />
      <NativeTextAlignToggle value={nativeTextAlign} onChange={onChangeNativeTextAlign} />
      <label className={checkboxStyles.row}>
        <input
          type="checkbox"
          checked={showRomanizationHints}
          onChange={(e) => onChangeShowRomanizationHints(e.target.checked)}
        />
        Hover a word for its romanization
      </label>
      <label className={checkboxStyles.row}>
        <input
          type="checkbox"
          checked={showTranslationHints}
          onChange={(e) => onChangeShowTranslationHints(e.target.checked)}
        />
        Hover a word for its translation
      </label>
      <label className={checkboxStyles.row}>
        <input type="checkbox" checked={showVowelMarks} onChange={(e) => onChangeShowVowelMarks(e.target.checked)} />
        Show vowel marks and the ezafe (کِتابِ مَن)
      </label>
      <label className={checkboxStyles.row}>
        <input
          type="checkbox"
          checked={showSentenceRomanization}
          onChange={(e) => onChangeShowSentenceRomanization(e.target.checked)}
        />
        Show each sentence romanized above it
      </label>
    </div>
  );
}
