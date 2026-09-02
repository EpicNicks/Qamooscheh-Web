import styles from "./PlayAudioButton.module.css";

interface PlayAudioButtonProps {
  status: "idle" | "playing";
  onClick: () => void;
  disabled?: boolean;
}

/**
 * A speaker icon while idle, an animated "now playing" bar while speaking.
 * Tapping always restarts from the beginning rather than toggling pause —
 * the caller's play() (usePhraseAudio) already cancels whatever's still
 * going before starting fresh, so this button never has to track "is this
 * the same phrase or a different one".
 */
export function PlayAudioButton({ status, onClick, disabled }: PlayAudioButtonProps) {
  return (
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
}
