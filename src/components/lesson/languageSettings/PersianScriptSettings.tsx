import { ScriptModeToggle } from "./ScriptModeToggle";
import type { LanguageSettingsProps } from "./LanguageSettingsProps";
import styles from "./ScriptSettingsLayout.module.css";
import checkboxStyles from "./CheckboxRow.module.css";

/** Persian's settings: native/romanized display, plus (like Japanese) hover-to-reveal word romanization. */
export function PersianScriptSettings({
  scriptMode,
  onChangeScriptMode,
  showRomanizationHints,
  onChangeShowRomanizationHints,
}: LanguageSettingsProps) {
  return (
    <div className={styles.wrap}>
      <ScriptModeToggle language="fa" value={scriptMode} onChange={onChangeScriptMode} />
      <label className={checkboxStyles.row}>
        <input
          type="checkbox"
          checked={showRomanizationHints}
          onChange={(e) => onChangeShowRomanizationHints(e.target.checked)}
        />
        Hover a word for its romanization
      </label>
    </div>
  );
}
