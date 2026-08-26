import styles from "./PersianKeyboard.module.css";

const ZWNJ = "‌";

/**
 * Standard Persian alphabet, built from named codepoints rather than pasted
 * glyphs — same rationale as domain/persian/normalize.ts's header comment,
 * and cross-checked against that file's own (independently backend-verified)
 * ا/ک/ه/ی so this list is self-consistent with the normalizer's fold map.
 */
const PERSIAN_LETTERS = [
  [0x0627, "alef"],
  [0x0628, "beh"],
  [0x067e, "peh"],
  [0x062a, "teh"],
  [0x062b, "theh"],
  [0x062c, "jeem"],
  [0x0686, "tcheh"],
  [0x062d, "hah"],
  [0x062e, "khah"],
  [0x062f, "dal"],
  [0x0630, "thal"],
  [0x0631, "reh"],
  [0x0632, "zain"],
  [0x0698, "jeh"],
  [0x0633, "seen"],
  [0x0634, "sheen"],
  [0x0635, "sad"],
  [0x0636, "dad"],
  [0x0637, "tah"],
  [0x0638, "zah"],
  [0x0639, "ain"],
  [0x063a, "ghain"],
  [0x0641, "feh"],
  [0x0642, "qaf"],
  [0x06a9, "keheh"],
  [0x06af, "gaf"],
  [0x0644, "lam"],
  [0x0645, "meem"],
  [0x0646, "noon"],
  [0x0648, "waw"],
  [0x0647, "heh"],
  [0x06cc, "yeh"],
] as const satisfies readonly (readonly [number, string])[];

interface PersianKeyboardProps {
  onInsert: (text: string) => void;
  onBackspace: () => void;
  /** user_prefs.keyboard_mode: 'isolated' inserts a ZWNJ after every letter so it renders disconnected from whatever's typed next — a beginner aid for reading the cursive joined script one shape at a time. 'contextual' types normally, letting Persian script join as it naturally does. */
  keyboardMode: "contextual" | "isolated";
}

/**
 * A tap-to-type Persian keyboard. Deliberately simple: every key appends to
 * the END of the current text rather than inserting at the caret — good
 * enough for the short single-word/phrase answers this app's exercises take,
 * and avoids managing text-input selection ranges for a first pass.
 */
export function PersianKeyboard({ onInsert, onBackspace, keyboardMode }: PersianKeyboardProps) {
  function pressLetter(letter: string) {
    onInsert(keyboardMode === "isolated" ? letter + ZWNJ : letter);
  }

  return (
    <div className={styles.keyboard} dir="rtl">
      <div className={styles.row}>
        {PERSIAN_LETTERS.map(([codePoint, name]) => {
          const letter = String.fromCodePoint(codePoint);
          return (
            <button key={name} type="button" className={styles.key} onClick={() => pressLetter(letter)}>
              {letter}
            </button>
          );
        })}
      </div>
      <div className={styles.row}>
        <button
          type="button"
          className={`${styles.key} ${styles.zwnj}`}
          onClick={() => onInsert(ZWNJ)}
          title="Half-space (ZWNJ)"
        >
          ⌢
        </button>
        <button type="button" className={`${styles.key} ${styles.wide}`} onClick={() => onInsert(" ")}>
          space
        </button>
        <button type="button" className={styles.key} onClick={onBackspace}>
          ⌫
        </button>
      </div>
    </div>
  );
}
