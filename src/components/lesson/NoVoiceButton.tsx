import { Link } from "react-router-dom";
import { PlayAudioButton } from "./PlayAudioButton";
import styles from "./NoVoiceButton.module.css";

interface NoVoiceButtonProps {
  /** e.g. "Persian" — domain/language.ts's displayName. */
  languageName: string;
}

/**
 * Stands in for PlayAudioButton when the browser has no TTS voice installed
 * for this course's language (hooks/useVoiceAvailability.ts) — a disabled
 * button (greyed out, same shape as the real one) with a small tooltip
 * explaining why, on hover or keyboard focus, linking to the FAQ entry that
 * covers installing one.
 */
export function NoVoiceButton({ languageName }: NoVoiceButtonProps) {
  return (
    <span className={styles.wrap}>
      <PlayAudioButton status="idle" onClick={() => {}} disabled />
      <span className={styles.toast} role="tooltip">
        No {languageName} voice installed on your system.{" "}
        <Link to="/help#tts-voice" className={styles.link}>
          Click here to learn more.
        </Link>
      </span>
    </span>
  );
}
