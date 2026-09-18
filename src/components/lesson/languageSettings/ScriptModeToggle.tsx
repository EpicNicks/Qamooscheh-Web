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
 * A visual, self-demonstrating version of the native/both/romanized choice
 * (user_prefs.scriptMode) — built on the shared SegmentedToggle (sliding
 * pill, springy easing) rather than its own copy of that mechanic. Each
 * option demonstrates the actual on-screen RENDERING that choice produces
 * (see AnnotatedText.tsx/domain/annotation.ts's resolveScriptDisplay), not
 * just the option's name: "Native" shows the language's own name in its own
 * script, "Both" shows that same name with a real `<ruby>` reading above it
 * (exactly the markup AnnotatedWord renders in "both" display), "Latin"
 * shows the romanized name alone. Ordered as a spectrum — native, both,
 * romanized — rather than native/romanized/native, so the middle option
 * reads as a midpoint rather than an afterthought.
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
        value={value}
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
            value: "both",
            label: (
              <>
                <DirectionalText courseCode={language} className={styles.example}>
                  <ruby>
                    {info.nativeName}
                    <rt className={styles.rt} dir="ltr">
                      {info.romanizedName}
                    </rt>
                  </ruby>
                </DirectionalText>
                <span className={styles.subtitle}>Both</span>
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
      <p className={styles.caption}>Applies to the text on screen right away, and to which exercises you get next.</p>
    </div>
  );
}
