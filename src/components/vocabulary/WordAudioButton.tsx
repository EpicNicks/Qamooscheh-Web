import { useBootstrap } from "../../hooks/useBootstrap";
import { usePhraseAudio } from "../../hooks/usePhraseAudio";
import { useRecordings } from "../../hooks/useRecordings";
import { useVoiceAvailability } from "../../hooks/useVoiceAvailability";
import { getLanguageInfo } from "../../domain/language";
import { PlayAudioButton } from "../lesson/PlayAudioButton";
import type { AudioMap } from "../../types/content";

interface WordAudioButtonProps {
  /** The word as written — what text-to-speech reads when it has no recording. */
  surface: string;
  /** The lexeme's own recordings (LexemeIndexEntry.audio). */
  audio: AudioMap | null | undefined;
}

/**
 * Says one vocabulary word: its recording when there is one, text-to-speech
 * otherwise. Renders nothing when neither can play, rather than a button that
 * does nothing.
 */
export function WordAudioButton({ surface, audio }: WordAudioButtonProps) {
  const courseCode = useBootstrap().data?.course?.code ?? null;
  const speechLang = getLanguageInfo(courseCode)?.speechLang ?? null;
  const audioUrl = useRecordings().phraseUrl(audio);
  const voiceAvailable = useVoiceAvailability(speechLang);
  const playback = usePhraseAudio({ text: surface, speechLang, audioUrl });

  if (!audioUrl && !voiceAvailable) return null;
  return <PlayAudioButton status={playback.status} onClick={playback.play} />;
}
