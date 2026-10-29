import { useState } from "react";
import styles from "./StarButton.module.css";

interface StarButtonProps {
  starred: boolean;
  onToggle: () => void;
  /** A verb's base form: saving it practises every form of the verb, so it is coloured apart from other saved words (domain/baseVerb.ts). */
  verb?: boolean;
  /** Overrides the accessible name, for a star whose word isn't the one beside it. */
  label?: string;
}

/**
 * Grey outline star -> gold fill, with a bounce played only on the
 * starring tap (unstarring just fades back — nothing to celebrate there).
 * `justStarred` is a transient class cleared via onAnimationEnd rather
 * than a timer, the same pattern VirtualKey's press-release bounce uses,
 * so it can never desync from the actual CSS animation duration.
 */
export function StarButton({ starred, onToggle, verb = false, label }: StarButtonProps) {
  const [justStarred, setJustStarred] = useState(false);

  function handleClick() {
    if (!starred) setJustStarred(true);
    onToggle();
  }

  const classes = [styles.star, starred && styles.starred, verb && styles.verb, justStarred && styles.pop].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      className={classes}
      aria-pressed={starred}
      aria-label={label ?? (verb ? (starred ? "Remove this verb from saved words" : "Save this verb with all its forms") : starred ? "Remove from saved words" : "Save this word")}
      onClick={handleClick}
      onAnimationEnd={() => setJustStarred(false)}
    >
      ★
    </button>
  );
}
