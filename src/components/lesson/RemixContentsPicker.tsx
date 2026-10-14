import { REMIX_CONTENTS_LABELS, type RemixContents } from "../../domain/remixContents";
import { Button } from "../common/Button";
import styles from "./RemixContentsPicker.module.css";

interface RemixContentsPickerProps {
  options: readonly RemixContents[];
  value: RemixContents;
  onChange: (next: RemixContents) => void;
  onStart: () => void;
  /** Set when the last Start found nothing of the chosen kind — the picker stays up so another choice can be made. */
  emptyMessage: string | null;
  backLabel: string;
  onBack: () => void;
}

/** The step before a remix starts (issue #45): which kinds of exercise, and whether flashcards, it holds. See domain/remixContents.ts. */
export function RemixContentsPicker({ options, value, onChange, onStart, emptyMessage, backLabel, onBack }: RemixContentsPickerProps) {
  return (
    <div className={styles.picker}>
      <h1>What should this Repack hold?</h1>
      <div className={styles.options} role="radiogroup" aria-label="Repack contents">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={value === option}
            className={value === option ? `${styles.option} ${styles.optionActive}` : styles.option}
            onClick={() => onChange(option)}
          >
            {REMIX_CONTENTS_LABELS[option]}
          </button>
        ))}
      </div>
      {emptyMessage && (
        <p className={styles.empty} role="status">
          {emptyMessage}
        </p>
      )}
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onBack}>
          {backLabel}
        </Button>
        <Button onClick={onStart}>Start</Button>
      </div>
    </div>
  );
}
