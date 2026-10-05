import { ScriptModeToggle } from "./ScriptModeToggle";
import { NativeTextAlignToggle } from "./NativeTextAlignToggle";
import { SettingsGroup } from "./SettingsGroup";
import type { LanguageSettingsProps } from "./LanguageSettingsProps";
import checkboxStyles from "./CheckboxRow.module.css";

/** Persian's settings: native/romanized display, block alignment for native-script text, the reading aids ordinary Persian doesn't write, and (like Japanese) hover-to-reveal hints. */
export function PersianScriptSettings({
  scriptMode,
  onChangeScriptMode,
  showRomanizationHints,
  onChangeShowRomanizationHints,
  showTranslationHints,
  onChangeShowTranslationHints,
  showNativeHints,
  onChangeShowNativeHints,
  nativeTextAlign,
  onChangeNativeTextAlign,
  showVowelMarks,
  onChangeShowVowelMarks,
  showSentenceRomanization,
  onChangeShowSentenceRomanization,
}: LanguageSettingsProps) {
  return (
    <>
      <SettingsGroup title="Text">
        <ScriptModeToggle language="fa" value={scriptMode} onChange={onChangeScriptMode} />
        <NativeTextAlignToggle value={nativeTextAlign} onChange={onChangeNativeTextAlign} />
      </SettingsGroup>
      <SettingsGroup title="Reading aids">
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
      </SettingsGroup>
      <SettingsGroup title="Hover hints">
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
          <input type="checkbox" checked={showNativeHints} onChange={(e) => onChangeShowNativeHints(e.target.checked)} />
          Hover an English word for the Persian
        </label>
      </SettingsGroup>
    </>
  );
}
