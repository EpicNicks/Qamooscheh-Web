import styles from "./CloseLessonButton.module.css";

interface CloseLessonButtonProps {
  /** True while the lost-progress warning is on screen — swaps the × for a sad face, Duolingo-style, since this is the moment that's supposed to give the learner pause. */
  isConfirming: boolean;
  onClick: () => void;
}

/**
 * Exits the lesson entirely — a plain, red × rather than a labeled button,
 * so it doesn't compete with (or get confused for) "Skip", which now names
 * a different thing: testing out of a lesson before starting it, offered
 * from the path's lesson-start modal. This button has never called the
 * server — see useSkipConfirmation — it just leaves without saving.
 */
export function CloseLessonButton({ isConfirming, onClick }: CloseLessonButtonProps) {
  return (
    <button type="button" className={styles.close} aria-label="Close lesson" onClick={onClick}>
      {isConfirming ? ":(" : "✕"}
    </button>
  );
}
