import { getLanguageInfo } from "../../domain/language";
import { usePhraseAudio } from "../../hooks/usePhraseAudio";
import { useVoiceAvailability } from "../../hooks/useVoiceAvailability";
import { PlayAudioButton } from "./PlayAudioButton";
import { NoVoiceButton } from "./NoVoiceButton";
import styles from "./Exercise.module.css";

interface ExercisePromptProps {
  text: string;
  courseCode?: string | null;
  /** user_prefs.autoplay_audio — plays this prompt once, the moment it's shown, when true. */
  autoplayAudio?: boolean;
}

/**
 * An exercise's prompt text plus its read-aloud control — shared by every
 * exercise-type component (WordBank/TypeIn/Speak) so autoplay-on-load and
 * the replay button behave identically no matter which one is rendering.
 * See hooks/usePhraseAudio.ts for the play/cancel/replay logic and
 * domain/tts.ts for the Web Speech API fallback every course currently uses
 * (no exercise ships a recorded audio file yet). When there's neither a real
 * file nor a matching system voice, the button renders disabled with an
 * explanatory tooltip (NoVoiceButton) instead of silently doing nothing or
 * reading the phrase in the wrong voice/language.
 */
export function ExercisePrompt({ text, courseCode, autoplayAudio }: ExercisePromptProps) {
  const languageInfo = getLanguageInfo(courseCode);
  const speechLang = languageInfo?.speechLang ?? null;
  const voiceAvailable = useVoiceAvailability(speechLang);
  const audio = usePhraseAudio({ text, speechLang, autoplay: autoplayAudio && voiceAvailable });

  return (
    <div className={styles.promptRow}>
      <p className={styles.prompt}>{text}</p>
      {speechLang &&
        (voiceAvailable ? (
          <PlayAudioButton status={audio.status} onClick={audio.play} />
        ) : (
          <NoVoiceButton languageName={languageInfo!.displayName} />
        ))}
    </div>
  );
}
