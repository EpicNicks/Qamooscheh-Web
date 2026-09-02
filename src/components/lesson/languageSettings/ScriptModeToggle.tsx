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
 * Settings' plain <select> also offers (user_prefs.scriptMode). Each option
 * shows the language's own name rendered the way THAT option would render
 * it (e.g. "فارسی" vs "Farsi"), with a small "Native"/"Latin" subtitle
 * naming the script itself — the example reads at a glance even before the
 * label does. "both" (Settings-only) isn't offered here; picking either
 * option here writes straight to "native" or "romanized".
 *
 * The sliding pill behind the selected option is a plain CSS transform
 * transition, not a JS-measured position: .toggleInner has no padding of
 * its own, so "50% wide, translateX(100%) for the second option" lands
 * exactly on the boundary regardless of the outer padding around it.
 *
 * `language` doubles as its own courseCode for getLanguageInfo/
 * DirectionalText — code and language coincide for fa/ja today (see
 * domain/language.ts's own header caveat).
 */
export function ScriptModeToggle({ language, value, onChange }: ScriptModeToggleProps) {
  const info = getLanguageInfo(language)!;

  return (
    <div className={styles.wrap}>
      <p className={styles.heading}>Text Mode</p>
      <div className={styles.toggleOuter}>
        <div className={styles.toggleInner} role="tablist">
          <div className={value === "romanized" ? `${styles.pill} ${styles.pillRomanized}` : styles.pill} aria-hidden="true" />
          <button type="button" role="tab" aria-selected={value === "native"} className={styles.option} onClick={() => onChange("native")}>
            <DirectionalText courseCode={language} className={styles.example}>
              {info.nativeName}
            </DirectionalText>
            <span className={styles.subtitle}>Native</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={value === "romanized"}
            className={styles.option}
            onClick={() => onChange("romanized")}
          >
            <span className={styles.example}>{info.romanizedName}</span>
            <span className={styles.subtitle}>Latin</span>
          </button>
        </div>
      </div>
    </div>
  );
}
