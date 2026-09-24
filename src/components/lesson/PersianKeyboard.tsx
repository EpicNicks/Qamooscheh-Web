import { useState } from "react";
import { VirtualKey } from "./keyboard/VirtualKey";
import { usePhysicalKeyState } from "./keyboard/usePhysicalKeyState";
import { useKeyboardWideLayout } from "../../hooks/useMediaQuery";
import { ISIRI_ROWS, ISIRI_SHIFT } from "../../domain/persian/isiriLayout";
import { ZWNJ } from "../../domain/persian/normalize";
import styles from "./PersianKeyboard.module.css";

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
 *
 * The on-screen Shift key is virtual-only — it has no bearing on physical
 * typing (there's no physical Shift being tracked or converted here, unlike
 * every letter key's physicalDown correspondence). Tapping it swaps a
 * handful of keys to a genuine second Persian letter each — see
 * isiriLayout.ts's ISIRI_SHIFT for which ones and why only those — and, like
 * a real mobile keyboard's Shift, applies to one keystroke before releasing
 * itself, rather than staying latched (the same one-shot pattern
 * JapaneseKanaKeyboard's "small" toggle already uses).
 */
interface PersianKeyboardProps {
  onInsert: (text: string) => void;
  onZwnj: () => void;
  onBackspace: () => void;
  /** user_prefs.keyboard_mode: 'isolated' inserts a ZWNJ after every letter so it renders disconnected from whatever's typed next — a beginner aid for reading the cursive joined script one shape at a time. 'contextual' types normally, letting Persian script join as it naturally does. */
  keyboardMode: "contextual" | "isolated";
  disabled?: boolean;
}

export function PersianKeyboard({ onInsert, onZwnj, onBackspace, keyboardMode, disabled }: PersianKeyboardProps) {
  const physicalDown = usePhysicalKeyState();
  const wide = useKeyboardWideLayout();
  const [shift, setShift] = useState(false);

  const shiftKey = (
    <VirtualKey
      label="⇧"
      className={`${styles.persianKey} ${shift ? styles.shiftActive : ""} ${styles.endKey}`}
      title="Shift (virtual only) — alef madda, hamza letters"
      disabled={disabled}
      onActivate={() => setShift((s) => !s)}
    />
  );

  function pressLetter(baseLetter: string, physicalCode: string) {
    const shiftedPoint = shift ? ISIRI_SHIFT[physicalCode] : undefined;
    const letter = shiftedPoint !== undefined ? String.fromCodePoint(shiftedPoint) : baseLetter;
    onInsert(keyboardMode === "isolated" ? letter + ZWNJ : letter);
    setShift(false);
  }

  function labelFor(baseLetter: string, physicalCode: string): string {
    const shiftedPoint = shift ? ISIRI_SHIFT[physicalCode] : undefined;
    return shiftedPoint !== undefined ? String.fromCodePoint(shiftedPoint) : baseLetter;
  }

  return (
    // Deliberately no dir="rtl" here: this is a keyboard LAYOUT diagram, not
    // a run of RTL text — a flex container's item order follows `dir`, which
    // would visually mirror the row (rightmost key first) and break the 1:1
    // correspondence with a physical QWERTY keyboard's left-to-right key
    // positions. Each key's own Persian glyph renders correctly regardless.
    //
    // Compact phone shape: exactly three rows, matching the three physical
    // ISIRI rows — Shift/Backspace bookend row three, Space rides along at
    // the end of row two, and ZWNJ rides along at the end of row three,
    // rather than any of them getting a fourth row of their own, so the
    // whole keyboard stays compact end-to-end on a phone screen. On a
    // wide/landscape viewport, Space and ZWNJ move to their own 4th row
    // below instead (Shift/Backspace stay bookending row three, just wider).
    <div className={styles.keyboard}>
      {ISIRI_ROWS.map((row, rowIndex) => (
        <div
          className={[styles.row, rowIndex === 1 && styles.rowHome, rowIndex === 2 && styles.rowBottom].filter(Boolean).join(" ")}
          key={rowIndex}
        >
          {rowIndex === 2 && shiftKey}
          {row.map(([codePoint, physicalCode]) => {
            const baseLetter = String.fromCodePoint(codePoint);
            return (
              <VirtualKey
                key={physicalCode}
                label={labelFor(baseLetter, physicalCode)}
                className={styles.persianKey}
                physicalDown={physicalDown.has(physicalCode)}
                disabled={disabled}
                onActivate={() => pressLetter(baseLetter, physicalCode)}
              />
            );
          })}
          {rowIndex === 1 && !wide && <VirtualKey label="space" wide disabled={disabled} onActivate={() => onInsert(" ")} />}
          {rowIndex === 2 && !wide && (
            <VirtualKey
              label="⌢"
              className={`${styles.persianKey} ${styles.zwnj}`}
              title="Half-space (ZWNJ) — Shift+Space; tap again to remove"
              disabled={disabled}
              onActivate={onZwnj}
            />
          )}
          {rowIndex === 2 && <VirtualKey label="⌫" className={styles.endKey} disabled={disabled} onActivate={onBackspace} />}
        </div>
      ))}
      {wide && (
        <div className={`${styles.row} ${styles.utilityRow}`}>
          <VirtualKey
            label="⌢"
            className={`${styles.persianKey} ${styles.zwnj}`}
            title="Half-space (ZWNJ) — Shift+Space; tap again to remove"
            disabled={disabled}
            onActivate={onZwnj}
          />
          <VirtualKey label="space" wide disabled={disabled} onActivate={() => onInsert(" ")} />
        </div>
      )}
    </div>
  );
}
