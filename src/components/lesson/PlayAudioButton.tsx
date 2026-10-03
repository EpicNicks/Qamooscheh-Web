import { TurtleIcon } from "../common/icons";
import styles from "./PlayAudioButton.module.css";

interface PlayAudioButtonProps {
  status: "idle" | "playing";
  onClick: () => void;
  /** Plays it slowed (usePhraseAudio's playSlow, issue #36) — omit to show no slow button. */
  onSlowClick?: () => void;
  disabled?: boolean;
}

/**
 * A speaker icon while idle, an animated "now playing" bar while speaking.
 * Tapping always restarts from the beginning rather than toggling pause —
 * the caller's play() (usePhraseAudio) already cancels whatever's still
 * going before starting fresh, so this button never has to track "is this
 * the same phrase or a different one".
 */
export function PlayAudioButton({ status, onClick, onSlowClick, disabled }: PlayAudioButtonProps) {
  const button = (
    <button
      type="button"
      className={styles.button}
      onClick={onClick}
      disabled={disabled}
      aria-label={status === "playing" ? "Replay audio" : "Play audio"}
    >
      {status === "playing" ? (
        <span className={styles.playing} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      ) : (
        <span className={styles.playIcon} aria-hidden="true" />
      )}
    </button>
  );
  if (!onSlowClick) return button;
  return (
    <span className={styles.pair}>
      {button}
      <button type="button" className={`${styles.button} ${styles.slow}`} onClick={onSlowClick} disabled={disabled} aria-label="Play slowly" title="Play slowly">
        <TurtleIcon size="20px" />
      </button>
    </span>
  );
}
