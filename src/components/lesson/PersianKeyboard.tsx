import { VirtualKey } from "./keyboard/VirtualKey";
import { usePhysicalKeyState } from "./keyboard/usePhysicalKeyState";
import { ISIRI_ROWS } from "../../domain/persian/isiriLayout";
import styles from "./PersianKeyboard.module.css";

const ZWNJ = "‌";

/**
 * The standard ISIRI (Iranian national standard) keyboard layout: Persian
 * letters positioned over the same physical QWERTY key positions a real
 * ISIRI-mapped keyboard uses (verified row-for-row against the ISIRI
 * mapping table — Q..P, A../' and Z../, matching e.g. Q→ض, A→ش, Z→ظ
 * exactly — see domain/persian/isiriLayout.ts). `physicalCode` is set on
 * every key so pressing the *Latin* key in that same physical position
 * lights up the Persian letter it maps to — that correspondence is the
 * entire point of the ISIRI standard (switching the OS input method remaps
 * physical Q to ض, etc.), so this is how a learner builds real muscle
 * memory for it, not a fabricated mapping. TypeInExercise's native `<input>`
 * uses the same table to convert typed Latin letters the same way — Shift+
 * Space for ZWNJ is also handled centrally there (matching real ISIRI
 * hardware), not here, so it isn't triggered twice while typing.
 */
interface PersianKeyboardProps {
  onInsert: (text: string) => void;
  onBackspace: () => void;
  /** user_prefs.keyboard_mode: 'isolated' inserts a ZWNJ after every letter so it renders disconnected from whatever's typed next — a beginner aid for reading the cursive joined script one shape at a time. 'contextual' types normally, letting Persian script join as it naturally does. */
  keyboardMode: "contextual" | "isolated";
  disabled?: boolean;
}

export function PersianKeyboard({ onInsert, onBackspace, keyboardMode, disabled }: PersianKeyboardProps) {
  const physicalDown = usePhysicalKeyState();

  function pressLetter(letter: string) {
    onInsert(keyboardMode === "isolated" ? letter + ZWNJ : letter);
  }

  return (
    // Deliberately no dir="rtl" here: this is a keyboard LAYOUT diagram, not
    // a run of RTL text — a flex container's item order follows `dir`, which
    // would visually mirror the row (rightmost key first) and break the 1:1
    // correspondence with a physical QWERTY keyboard's left-to-right key
    // positions. Each key's own Persian glyph renders correctly regardless.
    <div className={styles.keyboard}>
      {ISIRI_ROWS.map((row, rowIndex) => (
        <div className={styles.row} key={rowIndex}>
          {row.map(([codePoint, physicalCode]) => {
            const letter = String.fromCodePoint(codePoint);
            return (
              <VirtualKey
                key={physicalCode}
                label={letter}
                className={styles.persianKey}
                physicalDown={physicalDown.has(physicalCode)}
                disabled={disabled}
                onActivate={() => pressLetter(letter)}
              />
            );
          })}
        </div>
      ))}
      <div className={styles.row}>
        <VirtualKey
          label="⌢"
          className={`${styles.persianKey} ${styles.zwnj}`}
          title="Half-space (ZWNJ) — Shift+Space"
          disabled={disabled}
          onActivate={() => onInsert(ZWNJ)}
        />
        <VirtualKey label="space" wide disabled={disabled} onActivate={() => onInsert(" ")} />
        <VirtualKey label="⌫" disabled={disabled} onActivate={onBackspace} />
      </div>
    </div>
  );
}
