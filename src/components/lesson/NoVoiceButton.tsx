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
 *
 * The link is a plain `<a target="_blank">`, not a router `Link` — this can
 * be hovered mid-lesson, and a normal in-app navigation would leave the
 * lesson (and lose whatever's been answered so far) just to read an FAQ
 * entry. Opening a new tab keeps the lesson exactly where it was.
 */
export function NoVoiceButton({ languageName }: NoVoiceButtonProps) {
  return (
    <span className={styles.wrap}>
      <PlayAudioButton status="idle" onClick={() => {}} disabled />
      <span className={styles.toast} role="tooltip">
        <span className={styles.toastContent}>
          No {languageName} voice installed on your system.{" "}
          <a href="/help#tts-voice" target="_blank" rel="noopener noreferrer" className={styles.link}>
            Click here to learn more.
          </a>
        </span>
      </span>
    </span>
  );
}
