import { ScriptModeToggle } from "./ScriptModeToggle";
import type { LanguageSettingsProps } from "./LanguageSettingsProps";
import styles from "./ScriptSettingsLayout.module.css";
import checkboxStyles from "./CheckboxRow.module.css";

/**
 * Japanese gets native/romanized display plus two settings Persian has no
 * equivalent of: furigana over kanji, and (like Persian) hover-to-reveal
 * word romanization. Both are local-only (hooks/useShowFurigana.ts,
 * hooks/useShowRomanizationHints.ts) — see those files for why they aren't
 * synced user_prefs columns. Furigana's own reading data doesn't exist in
 * the content schema yet (same gap as recorded pronunciation audio — see
 * domain/tts.ts); this wires up the preference so it's ready the moment
 * that data does. Word romanization has no such gap — domain/romanization.ts
 * derives it from lexemes.json, which already ships.
 */
export function JapaneseScriptSettings({
  scriptMode,
  onChangeScriptMode,
  showFurigana,
  onChangeShowFurigana,
  showRomanizationHints,
  onChangeShowRomanizationHints,
  showTranslationHints,
  onChangeShowTranslationHints,
}: LanguageSettingsProps) {
  return (
    <div className={styles.wrap}>
      <ScriptModeToggle language="ja" value={scriptMode} onChange={onChangeScriptMode} />
      <label className={checkboxStyles.row}>
        <input type="checkbox" checked={showFurigana} onChange={(e) => onChangeShowFurigana(e.target.checked)} />
        Furigana over kanji (ふりがな)
      </label>
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
    </div>
  );
}
