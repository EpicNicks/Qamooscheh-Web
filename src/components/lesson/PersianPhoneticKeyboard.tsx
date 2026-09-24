import { VirtualKey } from "./keyboard/VirtualKey";
import { usePhysicalKeyState } from "./keyboard/usePhysicalKeyState";
import { useKeyboardWideLayout } from "../../hooks/useMediaQuery";
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
  const wide = useKeyboardWideLayout();

  // Compact phone shape: exactly three rows, matching the three QWERTY
  // rows — Space and '/ZWNJ/Backspace ride along on rows two and three (one
  // and three fewer letters than row one) rather than getting a fourth row
  // of their own, so the whole keyboard stays compact end-to-end on a phone
  // screen. On a wide/landscape viewport those ride-along keys move to
  // their own 4th row below instead, like a real keyboard's bottom row.
  return (
    <div className={keyboardStyles.keyboard}>
      {QWERTY_ROWS.map((row, rowIndex) => (
        <div
          className={[keyboardStyles.row, rowIndex === 1 && keyboardStyles.rowHome, rowIndex === 2 && keyboardStyles.rowBottom]
            .filter(Boolean)
            .join(" ")}
          key={rowIndex}
        >
          {rowIndex === 2 && !wide && (
            <VirtualKey label="'" className={styles.latinKey} disabled={disabled} onActivate={() => onPressLetter("'")} />
          )}
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
          {rowIndex === 1 && !wide && <VirtualKey label="space" wide disabled={disabled} onActivate={onSpace} />}
          {rowIndex === 2 && !wide && (
            <>
              <VirtualKey
                label="⌢"
                className={styles.zwnj}
                title="Half-space (ZWNJ) — Shift+Space; tap again to remove"
                disabled={disabled}
                onActivate={onZwnj}
              />
              <VirtualKey label="⌫" disabled={disabled} onActivate={onBackspace} />
            </>
          )}
        </div>
      ))}
      {wide && (
        <div className={`${keyboardStyles.row} ${keyboardStyles.utilityRow}`}>
          <VirtualKey label="'" className={styles.latinKey} disabled={disabled} onActivate={() => onPressLetter("'")} />
          <div className={keyboardStyles.utilityCenter}>
            <VirtualKey
              label="⌢"
              className={styles.zwnj}
              title="Half-space (ZWNJ) — Shift+Space; tap again to remove"
              disabled={disabled}
              onActivate={onZwnj}
            />
            <VirtualKey label="space" wide disabled={disabled} onActivate={onSpace} />
          </div>
          <VirtualKey label="⌫" disabled={disabled} onActivate={onBackspace} />
        </div>
      )}
    </div>
  );
}
