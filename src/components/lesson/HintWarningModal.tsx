import { useEffect, useRef, useState } from "react";
import { Button } from "../common/Button";
import styles from "./SkipLessonModal.module.css";

/** Asked before an English prompt's hint is revealed, since a hinted answer pays half the XP. Same shape as SkipLessonModal. */
export function HintWarningModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  /** `dontAskAgain` is the checkbox state when Show hint was pressed — the caller decides what to persist. */
  onConfirm: (dontAskAgain: boolean) => void;
}) {
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Opens on the first button (Cancel), ahead of the checkbox, for the same reason as SkipLessonModal.
  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
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
        aria-labelledby="hint-warning-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="hint-warning-title" className={styles.title}>
          Use a hint?
        </h2>
        <p className={styles.body}>Using a hint halves this answer's XP.</p>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel}>
            No hint
          </Button>
          <Button onClick={() => onConfirm(dontAskAgain)}>Show hint</Button>
        </div>

        <label className={styles.checkbox}>
          <input type="checkbox" checked={dontAskAgain} onChange={(event) => setDontAskAgain(event.target.checked)} />
          Don't ask again
        </label>
      </div>
    </div>
  );
}
