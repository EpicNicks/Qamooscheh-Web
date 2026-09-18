import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/common/Button";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import styles from "./RemoveCustomFontModal.module.css";

/** Confirms removing a hand-entered "pro mode" custom font (FontPicker) — same shape as SkipLessonModal, this codebase's own template for a plain confirm dialog. */
export function RemoveCustomFontModal({
  fontName,
  onCancel,
  onConfirm,
}: {
  fontName: string;
  onCancel: () => void;
  /** `dontAskAgain` is the checkbox state at the moment Remove was pressed — the caller decides what to persist. */
  onConfirm: (dontAskAgain: boolean) => void;
}) {
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
  }, []);

  useFocusTrap(dialogRef, { enabled: true, onEscape: onCancel });

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-font-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="remove-font-title" className={styles.title}>
          Remove "{fontName}"?
        </h2>
        <p className={styles.body}>It'll drop off your font list. You can always type it in again later.</p>

        <label className={styles.checkbox}>
          <input type="checkbox" checked={dontAskAgain} onChange={(event) => setDontAskAgain(event.target.checked)} />
          Don't ask me again
        </label>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel}>
            Keep it
          </Button>
          <Button variant="danger" onClick={() => onConfirm(dontAskAgain)}>
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}
