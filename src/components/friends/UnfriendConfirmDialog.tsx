import { useEffect, useRef } from "react";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { Button } from "../common/Button";
import styles from "./UnfriendConfirmDialog.module.css";

/**
 * Confirm step before ending a friendship. Focus starts on Cancel (the safe
 * choice) and returns to whatever opened the dialog when it closes.
 */
export function UnfriendConfirmDialog({
  name,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  name: string;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, { enabled: true, onEscape: onCancel });

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => opener?.focus();
  }, []);

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="unfriend-title"
        aria-describedby="unfriend-body"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="unfriend-title" className={styles.title}>
          Unfriend {name}?
        </h2>
        <p id="unfriend-body" className={styles.body}>
          You will both be removed from each other&apos;s friends lists. You can add each other again later.
        </p>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={pending}>
            {pending ? "Removing…" : "Unfriend"}
          </Button>
        </div>
      </div>
    </div>
  );
}
