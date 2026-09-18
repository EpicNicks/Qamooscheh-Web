import { SegmentedToggle } from "../../common/SegmentedToggle";
import { ZWNJ } from "../../../domain/persian/normalize";
import type { KeyboardMode } from "../../../domain/enums";
import styles from "./ScriptModeToggle.module.css";

/** A word demonstrating how contextual/isolated actually differ — see PersianKeyboard.tsx's own doc on keyboardMode: it changes whether ZWNJ is inserted after each typed letter, not which keyboard LAYOUT is used. */
const SAMPLE_WORD = "سلام";
const SAMPLE_JOINED = SAMPLE_WORD;
const SAMPLE_SEPARATED = [...SAMPLE_WORD].join(ZWNJ);

interface KeyboardModeToggleProps {
  value: KeyboardMode;
  onChange: (mode: KeyboardMode) => void;
}

/**
 * A visual, self-demonstrating replacement for the "Contextual
 * letterforms"/"Isolated letterforms" labels, which don't mean anything to a
 * learner who hasn't already read PersianKeyboard.tsx. Shows the same word
 * rendered the way each mode actually types it: joined cursive vs. broken
 * into disconnected shapes by a ZWNJ after every letter.
 */
export function KeyboardModeToggle({ value, onChange }: KeyboardModeToggleProps) {
  return (
    <div className={styles.wrap}>
      <p className={styles.heading}>Keyboard</p>
      <SegmentedToggle
        value={value}
        onChange={onChange}
        options={[
          {
            value: "contextual",
            label: (
              <>
                <span className={styles.example} dir="rtl">
                  {SAMPLE_JOINED}
                </span>
                <span className={styles.subtitle}>Joined letters</span>
              </>
            ),
          },
          {
            value: "isolated",
            label: (
              <>
                <span className={styles.example} dir="rtl">
                  {SAMPLE_SEPARATED}
                </span>
                <span className={styles.subtitle}>Separated letters</span>
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
