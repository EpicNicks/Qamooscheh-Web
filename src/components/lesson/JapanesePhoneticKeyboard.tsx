import { VirtualKey } from "./keyboard/VirtualKey";
import { usePhysicalKeyState } from "./keyboard/usePhysicalKeyState";
import { QWERTY_ROWS, physicalCodeForLetter } from "./keyboard/latinRows";
import keyboardStyles from "./keyboard/Keyboard.module.css";
import styles from "./PhoneticKeyboard.module.css";

interface JapanesePhoneticKeyboardProps {
  /**
   * Wraps the SAME romajiToKana engine instance TypeInExercise's native
   * `<input>` feeds — owned by the parent so tapping a letter here and then
   * typing the next one physically (or vice versa) still resolves as one
   * continuous word instead of two independent, desynced buffers.
   */
  onPressLetter: (letter: string) => void;
  onSpace: () => void;
  onBackspace: () => void;
  disabled?: boolean;
}

/**
 * A Latin QWERTY grid — the default Japanese input mode. Key light-up
 * always targets the Latin key that was actually pressed, never a
 * synthesized kana key — this is a romaji keyboard, not a kana one (see
 * JapaneseKanaKeyboard for that).
 */
export function JapanesePhoneticKeyboard({ onPressLetter, onSpace, onBackspace, disabled }: JapanesePhoneticKeyboardProps) {
  const physicalDown = usePhysicalKeyState();

  return (
    <div className={keyboardStyles.keyboard}>
      {QWERTY_ROWS.map((row, rowIndex) => (
        <div className={keyboardStyles.row} key={rowIndex}>
          {row.map((letter) => (
            <VirtualKey
              key={letter}
              label={letter}
              className={styles.latinKey}
              physicalDown={physicalDown.has(physicalCodeForLetter(letter))}
              disabled={disabled}
              onActivate={() => onPressLetter(letter)}
            />
          ))}
        </div>
      ))}
      <div className={keyboardStyles.row}>
        <VirtualKey label="space" wide disabled={disabled} onActivate={onSpace} />
        <VirtualKey label="⌫" disabled={disabled} onActivate={onBackspace} />
      </div>
    </div>
  );
}
