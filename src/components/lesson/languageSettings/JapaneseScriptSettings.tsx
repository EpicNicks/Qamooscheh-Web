import { ScriptModeToggle } from "./ScriptModeToggle";
import type { LanguageSettingsProps } from "./LanguageSettingsProps";
import styles from "./JapaneseScriptSettings.module.css";

/**
 * Japanese gets native/romanized display plus one setting Persian has no
 * equivalent of: furigana over kanji. Local-only (hooks/useShowFurigana.ts)
 * — see that file for why it isn't a synced user_prefs column. Actually
 * annotating kanji with readings needs per-word furigana data that doesn't
 * exist in the content schema yet (same gap as recorded pronunciation audio
 * — see domain/tts.ts); this wires up the preference so it's ready the
 * moment that data does.
 */
export function JapaneseScriptSettings({ scriptMode, onChangeScriptMode, showFurigana, onChangeShowFurigana }: LanguageSettingsProps) {
  return (
    <div className={styles.wrap}>
      <ScriptModeToggle language="ja" value={scriptMode} onChange={onChangeScriptMode} />
      <label className={styles.furiganaRow}>
        <input type="checkbox" checked={showFurigana} onChange={(e) => onChangeShowFurigana(e.target.checked)} />
        Furigana over kanji (ふりがな)
      </label>
    </div>
  );
}
