import { useContext, useRef, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { loadLocalAppPrefs, saveLocalAppPrefs } from "../../lib/localAppPrefs";
import { HintWarningModal } from "./HintWarningModal";
import { getLanguageInfo, getSpeechLang } from "../../domain/language";
import { displayDirection } from "../../domain/annotation";
import { usePhraseAudio } from "../../hooks/usePhraseAudio";
import { useRecordings } from "../../hooks/useRecordings";
import { useVoiceAvailability } from "../../hooks/useVoiceAvailability";
import { useNativeTextAlign } from "../../hooks/useNativeTextAlign";
import { PlayAudioButton } from "./PlayAudioButton";
import { NoVoiceButton } from "./NoVoiceButton";
import { AnnotatedText, EnglishAnnotatedText } from "./AnnotatedText";
import { isLatinText } from "../../domain/englishHints";
import { SentenceRomanization } from "./SentenceRomanization";
import { NewWordsScope } from "../../hooks/newWordsScope";
import { hasNewTag } from "../../domain/newWords";
import { EMPTY_HINT_MAP, PLAIN_TEXT, type TextDisplaySettings, type WordHint } from "../../domain/romanization";
import type { AudioMap } from "../../types/content";
import styles from "./Exercise.module.css";

interface ExercisePromptProps {
  text: string;
  /** The exercise's lexeme tags — what an English prompt's words are matched against (domain/englishHints.ts). */
  tags?: readonly string[];
  /** Called when an English word's hover is revealed: the exercise then counts as hinted. */
  onHintReveal?: () => void;
  /** Set once the exercise is answered (its review is showing): hovering is free then — no warning, and nothing left to halve (issue #133). */
  answered?: boolean;
  /** The prompt's authored whole-sentence romanization (ExerciseArtifact.promptRomanization), for SentenceRomanization. */
  romanization?: string | null;
  courseCode?: string | null;
  /** user_prefs.autoplay_audio — plays this prompt once, the moment it's shown, when true. */
  autoplayAudio?: boolean;
  /** Native word -> hover hint (domain/romanization.ts), pre-gated by the caller — non-empty only when this prompt is itself in the target language (a reading/story exercise) and at least one hint toggle is on, or its display isn't plain "native". Words with no entry render plain, so an empty map is the same as omitting this. */
  hintMap?: ReadonlyMap<string, WordHint>;
  /** How the base text renders, and which of a word's hints are enabled — see domain/romanization.ts's TextDisplaySettings. */
  textSettings?: TextDisplaySettings;
  /** The prompt's recordings (ExerciseArtifact.promptAudio). Played instead of text-to-speech when there's one in a usable voice. */
  audio?: AudioMap | null;
  /** ExerciseArtifact.speaker — keeps a story line to its character's voices. */
  speaker?: string | null;
}

/**
 * An exercise's prompt text plus its read-aloud control — shared by every
 * exercise-type component (WordBank/TypeIn/Speak) so autoplay-on-load and
 * the replay button behave identically no matter which one is rendering.
 * See hooks/usePhraseAudio.ts for the play/cancel/replay logic: the prompt's
 * recording when it has one (hooks/useRecordings.ts), the Web Speech API
 * otherwise. When there's neither a recording nor a matching system voice,
 * the button renders disabled with an explanatory tooltip (NoVoiceButton)
 * instead of silently doing nothing or reading the phrase in the wrong
 * voice/language.
 */
export function ExercisePrompt({
  text,
  tags,
  onHintReveal,
  answered = false,
  romanization,
  courseCode,
  autoplayAudio,
  hintMap = EMPTY_HINT_MAP,
  textSettings = PLAIN_TEXT,
  audio: recordings,
  speaker,
}: ExercisePromptProps) {
  const languageInfo = getLanguageInfo(courseCode);
  // Picked from the actual text, not just the course — a translation
  // exercise's prompt isn't always in the course's own language (e.g.
  // "Translate to Japanese: dog" prompts in English), so this can resolve to
  // "en-US" even under a Japanese/Persian course.
  const speechLang = getSpeechLang(courseCode, text);
  const audioUrl = useRecordings().phraseUrl(recordings, speaker);
  // A recording plays whatever the device's system voices are.
  const voiceAvailable = useVoiceAvailability(speechLang) || audioUrl != null;
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
  const audio = usePhraseAudio({ text, speechLang, audioUrl, autoplay: autoplayAudio && voiceAvailable && isForeignLanguageText });
  const { align } = useNativeTextAlign();
  const direction = displayDirection(text, textSettings.display);
  // The first hint reveal on an exercise warns that it halves the answer's XP
  // (unless the learner turned the warning off); agreeing reveals this
  // exercise's hints freely from then on.
  const { userId } = useAuth();
  // A Parsle's new words keep their English hover with the learner's off (domain/newWords.ts).
  const newWords = useContext(NewWordsScope);
  const [hintAgreed, setHintAgreed] = useState(false);
  const [warning, setWarning] = useState(false);
  const pendingReveal = useRef<(() => void) | null>(null);
  const warnBeforeHint = !answered && !hintAgreed && !(userId && loadLocalAppPrefs(userId).suppressHintWarning);
  const gateHint = (proceed: () => void) => {
    if (warning) return;
    pendingReveal.current = proceed;
    setWarning(true);
  };

  return (
    <>
      <SentenceRomanization text={text} authored={romanization} hintMap={hintMap} settings={textSettings} tags={tags} />
      <div className={styles.promptRow}>
        {/* The alignment setting only applies to RTL blocks — see
            localAppPrefs.ts's NativeTextAlign — an LTR prompt keeps its
            natural browser default either way. */}
        <p className={styles.prompt} dir={direction} style={direction === "rtl" ? { textAlign: align } : undefined}>
          {tags && isLatinText(text) && (textSettings.nativeEnabled || hasNewTag(tags, newWords)) ? (
          <EnglishAnnotatedText text={text} tags={tags} hintMap={hintMap} settings={textSettings} onReveal={answered ? undefined : onHintReveal} gate={warnBeforeHint ? gateHint : undefined} newWords={newWords} />
        ) : (
          <AnnotatedText text={text} hintMap={hintMap} settings={textSettings} tags={tags} newWords={newWords} />
        )}
        </p>
        {warning && (
          <HintWarningModal
            onCancel={() => {
              pendingReveal.current = null;
              setWarning(false);
            }}
            onConfirm={(dontAskAgain) => {
              if (dontAskAgain && userId) saveLocalAppPrefs(userId, { suppressHintWarning: true });
              setHintAgreed(true);
              setWarning(false);
              pendingReveal.current?.();
              pendingReveal.current = null;
            }}
          />
        )}
        {speechLang &&
          (voiceAvailable ? (
            <PlayAudioButton status={audio.status} onClick={audio.play} onSlowClick={audio.playSlow} />
          ) : (
            <NoVoiceButton languageName={speechLang === languageInfo!.speechLang ? languageInfo!.displayName : "English"} />
          ))}
      </div>
    </>
  );
}
