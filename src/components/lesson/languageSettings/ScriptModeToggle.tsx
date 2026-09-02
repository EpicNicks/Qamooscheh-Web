import { DirectionalText } from "../../common/DirectionalText";
import { getLanguageInfo, type Language } from "../../../domain/language";
import type { ScriptMode } from "../../../domain/enums";
import styles from "./ScriptModeToggle.module.css";

interface ScriptModeToggleProps {
  language: Language;
  value: ScriptMode;
  onChange: (mode: ScriptMode) => void;
}

/**
 * A visual, self-demonstrating version of the native/romanized choice
 * Settings' plain <select> also offers (user_prefs.scriptMode) — each
 * option shows the language's own name rendered the way THAT option would
 * render it, so the choice reads at a glance rather than depending on the
 * words "native"/"romanized" meaning anything to someone who hasn't learned
 * the script yet. "both" (Settings-only) isn't offered here; picking either
 * option here writes straight to "native" or "romanized".
 *
 * `language` doubles as its own courseCode for getLanguageInfo/
 * DirectionalText — code and language coincide for fa/ja today (see
 * domain/language.ts's own header caveat).
 */
export function ScriptModeToggle({ language, value, onChange }: ScriptModeToggleProps) {
  const info = getLanguageInfo(language)!;

  return (
    <div className={styles.wrap}>
      <DirectionalText courseCode={language} className={styles.heading}>
        {info.nativeName}
      </DirectionalText>
      <div className={styles.toggle} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={value === "native"}
          className={value === "native" ? `${styles.option} ${styles.active}` : styles.option}
          onClick={() => onChange("native")}
        >
          <DirectionalText courseCode={language} className={styles.example}>
            {info.nativeName}
          </DirectionalText>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={value === "romanized"}
          className={value === "romanized" ? `${styles.option} ${styles.active}` : styles.option}
          onClick={() => onChange("romanized")}
        >
          <span className={styles.example}>{info.romanizedName}</span>
        </button>
      </div>
    </div>
  );
}
