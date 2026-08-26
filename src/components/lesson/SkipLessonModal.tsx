import { useEffect, useRef, useState } from "react";
import { Button } from "../common/Button";
import styles from "./SkipLessonModal.module.css";

/**
 * The first modal in this codebase, so it sets the pattern: a plain overlay
 * div styled with CSS Modules like everything else here, no dialog library.
 *
 * It does carry the accessibility floor a modal needs and can't fake —
 * role/aria wiring, initial focus, Escape to dismiss, and a focus trap so Tab
 * can't wander into the lesson still rendered behind it.
 */
export function SkipLessonModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  /** `dontAskAgain` is the checkbox state at the moment Skip was pressed — the caller decides what to persist. */
  onConfirm: (dontAskAgain: boolean) => void;
}) {
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Opens focused on the first control, which is the non-destructive one —
  // a confirmation shouldn't put "Skip" under a reflexive Enter.
  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>("button, input")?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button, input");
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="skip-lesson-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="skip-lesson-title" className={styles.title}>
          Skip this lesson?
        </h2>
        <p className={styles.body}>
          Your answers so far won't be saved, and nothing you've done here will count toward your progress.
        </p>

        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={dontAskAgain}
            onChange={(event) => setDontAskAgain(event.target.checked)}
          />
          Don't ask me again
        </label>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel}>
            Keep going
          </Button>
          <Button variant="danger" onClick={() => onConfirm(dontAskAgain)}>
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}
