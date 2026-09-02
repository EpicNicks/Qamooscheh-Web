import { VirtualKey } from "./keyboard/VirtualKey";
import { usePhysicalKeyState } from "./keyboard/usePhysicalKeyState";
import { QWERTY_ROWS, physicalCodeForLetter } from "./keyboard/latinRows";
import { hasPhoneticValue } from "../../domain/persian/phoneticMap";
import keyboardStyles from "./keyboard/Keyboard.module.css";
import styles from "./PhoneticKeyboard.module.css";

interface PersianPhoneticKeyboardProps {
  /**
   * Wraps the SAME engine instance TypeInExercise's native `<input>` feeds —
   * owned by the parent so tapping a letter here and then typing the next
   * one on a physical keyboard (or vice versa) still resolves as one
   * continuous word instead of two independent, desynced buffers. The
   * ambiguous-candidate picker floats over the answer input itself (see
   * TypeInExercise), not here, since it corrects text that's already in
   * that input regardless of which entry point produced it.
   */
  onPressLetter: (letter: string) => void;
  onZwnj: () => void;
  onSpace: () => void;
  onBackspace: () => void;
  disabled?: boolean;
}

/**
 * A Latin QWERTY grid — tapping (or physically typing) a letter feeds
 * domain/persian/phoneticEngine.ts one character at a time via the shared
 * engine. An ambiguous sound (s, z, t, h, gh/q) inserts its default letter
 * immediately and floats a correction picker over the input. "c" — the one
 * letter with no Persian phonetic mapping on its own (see phoneticMap.ts's
 * VALID_PHONETIC_LETTERS; it only ever leads somewhere via "ch") — is greyed
 * out and inert rather than removed, so the grid still teaches where every
 * physical key sits.
 */
export function PersianPhoneticKeyboard({ onPressLetter, onZwnj, onSpace, onBackspace, disabled }: PersianPhoneticKeyboardProps) {
  const physicalDown = usePhysicalKeyState();

  return (
    <div className={keyboardStyles.keyboard}>
      {QWERTY_ROWS.map((row, rowIndex) => (
        <div className={keyboardStyles.row} key={rowIndex}>
          {row.map((letter) => {
            const valid = hasPhoneticValue(letter);
            return (
              <VirtualKey
                key={letter}
                label={letter}
                className={styles.latinKey}
                physicalDown={valid && physicalDown.has(physicalCodeForLetter(letter))}
                disabled={disabled || !valid}
                onActivate={() => onPressLetter(letter)}
              />
            );
          })}
        </div>
      ))}
      <div className={keyboardStyles.row}>
        <VirtualKey label="'" className={styles.latinKey} disabled={disabled} onActivate={() => onPressLetter("'")} />
        <VirtualKey label="⌢" className={styles.zwnj} title="Half-space (ZWNJ) — Shift+Space" disabled={disabled} onActivate={onZwnj} />
        <VirtualKey label="space" wide disabled={disabled} onActivate={onSpace} />
        <VirtualKey label="⌫" disabled={disabled} onActivate={onBackspace} />
      </div>
    </div>
  );
}
