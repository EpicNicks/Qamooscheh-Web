import { useEffect } from "react";
import { Button } from "../common/Button";
import styles from "./SkipTutorialModal.module.css";

/** Which UI path opened this modal — changes only its title, since the two paths warrant different tones: a deliberate request reads as a question ("Are you sure?"), a nudge after repeatedly clicking outside the highlighted control reads as an offer ("Skip?"). */
export type SkipTutorialModalSource = "skip-link" | "outside-click";

const TITLE: Record<SkipTutorialModalSource, string> = {
  "skip-link": "Are you sure?",
  "outside-click": "Skip?",
};

/**
 * Confirms before abandoning the interactive walkthrough lesson itself —
 * distinct from TutorialOverlay's own "Skip tutorial" link, which never
 * confirms (it only silences the guided callouts, costing nothing). This
 * one exits the mock lesson outright, the same weight as CloseLessonButton
 * does for a real one, so it gets the same confirm-before-leaving treatment.
 *
 * Opened from two places (OnboardingTutorialStep's `source` prop tells them
 * apart): the mock lesson's own top-level "Skip tutorial" link, and
 * TutorialOverlay's repeated-outside-click nudge (clicking away from the
 * highlighted control more than once reads as "I'm stuck", so it offers the
 * same way out rather than just letting the click do nothing).
 */
export function SkipTutorialModal({
  source,
  onCancel,
  onConfirm,
}: {
  source: SkipTutorialModalSource;
  onCancel: () => void;
  onConfirm: () => void;
}) {
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
          {TITLE[source]}
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
