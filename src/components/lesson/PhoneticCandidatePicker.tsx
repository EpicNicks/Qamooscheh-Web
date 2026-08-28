import type { CSSProperties } from "react";
import styles from "./PhoneticCandidatePicker.module.css";

interface PhoneticCandidatePickerProps {
  candidates: readonly string[];
  activeIndex: number;
  onSelect: (index: number) => void;
  /** Absolute-position it above the letter it's correcting — see TypeInExercise's measurement of the last-inserted character. Omitted, it just renders inline. */
  style?: CSSProperties;
}

/**
 * The IME-style "which letter did you mean" conversion bar for an ambiguous
 * Persian phonetic sound (e.g. "s" → س/ص/ث) — the default candidate is
 * already in the answer text by the time this shows (domain/persian/
 * phoneticEngine.ts's eager-insert-then-correct design), so picking a
 * different one here replaces it rather than inserting fresh. Arrow-key
 * navigation and Escape-commits-the-highlighted-one are wired by the caller
 * via hooks/usePersianPhoneticInput.ts's `handlePickerNavigation`; this
 * component is presentational (click a candidate to pick it directly too).
 */
export function PhoneticCandidatePicker({ candidates, activeIndex, onSelect, style }: PhoneticCandidatePickerProps) {
  return (
    <div className={styles.picker} role="listbox" aria-label="Choose a letter" dir="rtl" style={style}>
      {candidates.map((candidate, index) => (
        <button
          key={candidate}
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          className={index === activeIndex ? `${styles.candidate} ${styles.active}` : styles.candidate}
          // Same reasoning as VirtualKey: never let picking a candidate move
          // focus off the answer input.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(index)}
        >
          {candidate}
        </button>
      ))}
    </div>
  );
}
