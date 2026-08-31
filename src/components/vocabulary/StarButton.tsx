import { useState } from "react";
import styles from "./StarButton.module.css";

interface StarButtonProps {
  starred: boolean;
  onToggle: () => void;
}

/**
 * Grey outline star -> gold fill, with a bounce played only on the
 * starring tap (unstarring just fades back — nothing to celebrate there).
 * `justStarred` is a transient class cleared via onAnimationEnd rather
 * than a timer, the same pattern VirtualKey's press-release bounce uses,
 * so it can never desync from the actual CSS animation duration.
 */
export function StarButton({ starred, onToggle }: StarButtonProps) {
  const [justStarred, setJustStarred] = useState(false);

  function handleClick() {
    if (!starred) setJustStarred(true);
    onToggle();
  }

  const classes = [styles.star, starred && styles.starred, justStarred && styles.pop].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      className={classes}
      aria-pressed={starred}
      aria-label={starred ? "Unstar this word" : "Star this word for review"}
      onClick={handleClick}
      onAnimationEnd={() => setJustStarred(false)}
    >
      ★
    </button>
  );
}
