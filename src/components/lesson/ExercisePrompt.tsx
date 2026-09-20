import { getLanguageInfo, getSpeechLang } from "../../domain/language";
import { displayDirection } from "../../domain/annotation";
import { usePhraseAudio } from "../../hooks/usePhraseAudio";
import { useVoiceAvailability } from "../../hooks/useVoiceAvailability";
import { useNativeTextAlign } from "../../hooks/useNativeTextAlign";
import { PlayAudioButton } from "./PlayAudioButton";
import { NoVoiceButton } from "./NoVoiceButton";
import { AnnotatedText } from "./AnnotatedText";
import { EMPTY_HINT_MAP, PLAIN_TEXT, type TextDisplaySettings, type WordHint } from "../../domain/romanization";
import styles from "./Exercise.module.css";

interface ExercisePromptProps {
  text: string;
  courseCode?: string | null;
  /** user_prefs.autoplay_audio — plays this prompt once, the moment it's shown, when true. */
  autoplayAudio?: boolean;
  /** Native word -> hover hint (domain/romanization.ts), pre-gated by the caller — non-empty only when this prompt is itself in the target language (a reading/story exercise) and at least one hint toggle is on, or its display isn't plain "native". Words with no entry render plain, so an empty map is the same as omitting this. */
  hintMap?: ReadonlyMap<string, WordHint>;
  /** How the base text renders, and which of a word's hints are enabled — see domain/romanization.ts's TextDisplaySettings. */
  textSettings?: TextDisplaySettings;
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
export function ExercisePrompt({
  text,
  courseCode,
  autoplayAudio,
  hintMap = EMPTY_HINT_MAP,
  textSettings = PLAIN_TEXT,
}: ExercisePromptProps) {
  const languageInfo = getLanguageInfo(courseCode);
  // Picked from the actual text, not just the course — a translation
  // exercise's prompt isn't always in the course's own language (e.g.
  // "Translate to Japanese: dog" prompts in English), so this can resolve to
  // "en-US" even under a Japanese/Persian course.
  const speechLang = getSpeechLang(courseCode, text);
  const voiceAvailable = useVoiceAvailability(speechLang);
  // isForeignLanguageText is what autoplay gates on beyond just "there's a
  // voice for it" — this prompt might resolve to "en-US" (see getSpeechLang
  // above) when it's actually an English-side prompt/answer under a foreign
  // course, and autoplaying THAT the instant an exercise loads is noise, not
  // help: the learner already reads English fluently and didn't ask to hear
  // it read back. The manual play button still works regardless — this only
  // narrows the automatic, unrequested case.
  const isForeignLanguageText = !!languageInfo && speechLang === languageInfo.speechLang;
  // usePhraseAudio keeps the original native `text` regardless of display —
  // TTS reads the actual language, not whatever "romanized" substitutes on
  // screen.
  const audio = usePhraseAudio({ text, speechLang, autoplay: autoplayAudio && voiceAvailable && isForeignLanguageText });
  const { align } = useNativeTextAlign();
  const direction = displayDirection(text, textSettings.display);

  return (
    <div className={styles.promptRow}>
      {/* The alignment setting only applies to RTL blocks — see
          localAppPrefs.ts's NativeTextAlign — an LTR prompt keeps its
          natural browser default either way. */}
      <p className={styles.prompt} dir={direction} style={direction === "rtl" ? { textAlign: align } : undefined}>
        <AnnotatedText text={text} hintMap={hintMap} settings={textSettings} />
      </p>
      {speechLang &&
        (voiceAvailable ? (
          <PlayAudioButton status={audio.status} onClick={audio.play} />
        ) : (
          <NoVoiceButton languageName={speechLang === languageInfo!.speechLang ? languageInfo!.displayName : "English"} />
        ))}
    </div>
  );
}
