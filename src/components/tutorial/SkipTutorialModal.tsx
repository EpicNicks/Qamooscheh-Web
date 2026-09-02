import { useEffect } from "react";
import { Button } from "../common/Button";
import styles from "./SkipTutorialModal.module.css";

/**
 * Confirms before abandoning the interactive walkthrough lesson itself —
 * distinct from TutorialOverlay's own "Skip tutorial" link, which never
 * confirms (it only silences the guided callouts, costing nothing). This
 * one exits the mock lesson outright, the same weight as CloseLessonButton
 * does for a real one, so it gets the same confirm-before-leaving treatment.
 */
export function SkipTutorialModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="skip-tutorial-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="skip-tutorial-title" className={styles.title}>
          Skip the tutorial?
        </h2>
        <p className={styles.body}>You can go straight to your first real lesson instead. You can replay this tutorial later from Settings.</p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel} autoFocus>
            Keep going
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}
