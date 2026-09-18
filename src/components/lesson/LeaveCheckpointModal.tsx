import { useEffect, useRef } from "react";
import { Button } from "../common/Button";
// Shares SkipLessonModal's dialog chrome (overlay/dialog/title/body/actions)
// rather than restating it — the two confirmations look identical, minus the
// "don't ask me again" checkbox: a checkpoint is a one-attempt, rarely-hit
// flow, not something worth a persistent bypass preference for.
import styles from "./SkipLessonModal.module.css";

/**
 * "Are you sure?" for CloseLessonButton inside CheckpointPage. Unlike an
 * ordinary lesson, a checkpoint never saves anything before the single final
 * submit() call (useCheckpoint's own doc comment), so this isn't guarding a
 * server-side write in progress — it's just making sure a stray tap on the ×
 * doesn't throw away answers already filled in for nothing.
 */
export function LeaveCheckpointModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button");
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
        aria-labelledby="leave-checkpoint-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="leave-checkpoint-title" className={styles.title}>
          Exit this assessment?
        </h2>
        <p className={styles.body}>Your answers so far will be lost, and none of this attempt will be saved.</p>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel}>
            Keep going
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Exit
          </Button>
        </div>
      </div>
    </div>
  );
}
