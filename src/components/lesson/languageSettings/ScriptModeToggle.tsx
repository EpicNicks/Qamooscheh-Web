import { DirectionalText } from "../../common/DirectionalText";
import { SegmentedToggle } from "../../common/SegmentedToggle";
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
 * Settings' plain <select> also offers (user_prefs.scriptMode). Built on the
 * shared SegmentedToggle (sliding pill, springy easing) rather than its own
 * copy of that mechanic — this is just custom label content: each option
 * shows the language's own name rendered the way THAT option would render
 * it (e.g. "فارسی" vs "Farsi"), with a small "Native"/"Latin" subtitle
 * naming the script itself. "both" (Settings-only) isn't offered here;
 * picking either option here writes straight to "native" or "romanized" —
 * a `value` of "both" (set from the full Settings page) falls back to
 * showing "native" selected, same as before this used SegmentedToggle.
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
      <SegmentedToggle
        value={value === "romanized" ? "romanized" : "native"}
        onChange={onChange}
        options={[
          {
            value: "native",
            label: (
              <>
                <DirectionalText courseCode={language} className={styles.example}>
                  {info.nativeName}
                </DirectionalText>
                <span className={styles.subtitle}>Native</span>
              </>
            ),
          },
          {
            value: "romanized",
            label: (
              <>
                <span className={styles.example}>{info.romanizedName}</span>
                <span className={styles.subtitle}>Latin</span>
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
