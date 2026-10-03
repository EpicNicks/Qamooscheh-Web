// Reading a sentence's words aloud as the learner hovers (or focuses, or
// taps) them, issue #35 — the course-language words by default
// (localAppPrefs.speakHoveredWords), English ones only when asked for
// (speakHoveredEnglish). A word's own recording when the course has one
// (hooks/useRecordings.ts), text-to-speech otherwise, like a picked word-bank
// tile. Only after the pointer rests on a word for a moment, so sweeping it
// across a sentence doesn't fire a burst of words.
import { useMemo } from "react";
import { useBootstrap } from "./useBootstrap";
import { useLocalAppPref } from "./useLocalAppPref";
import { useRecordings } from "./useRecordings";
import { getLanguageInfo, getSpeechLang } from "../domain/language";
import { play } from "../domain/playback";
import { hasVoiceFor } from "../domain/tts";

/** How long the pointer rests on a word before it's read. */
const DWELL_MS = 250;

export interface WordSpeech {
  /** The pointer or focus arrived on `word`: read it once it has rested there. */
  start: (word: string) => void;
  /** It left before then: don't. A word already being read finishes. */
  cancel: () => void;
}

// One pending word app-wide: arriving on a word replaces whichever was
// waiting, wherever on the page it was. (One playing word app-wide is
// domain/playback.ts's own rule.)
let pending: ReturnType<typeof setTimeout> | undefined;

/** The read-on-hover control for a sentence tagged with `tags` (how a word finds its recording), or null when neither kind of word is to be read. */
export function useHoverSpeech(tags: readonly string[] = []): WordSpeech | null {
  const courseCode = useBootstrap().data?.course?.code ?? null;
  const [speakNative] = useLocalAppPref("speakHoveredWords", true);
  const [speakEnglish] = useLocalAppPref("speakHoveredEnglish", false);
  const recordings = useRecordings();

  return useMemo(() => {
    const courseLang = getLanguageInfo(courseCode)?.speechLang ?? null;
    if (!courseLang || (!speakNative && !speakEnglish)) return null;
    const cancel = () => clearTimeout(pending);
    return {
      cancel,
      start(word) {
        cancel();
        pending = setTimeout(() => {
          const speechLang = getSpeechLang(courseCode, word);
          if (!speechLang) return;
          const native = speechLang === courseLang;
          if (native ? !speakNative : !speakEnglish) return;
          const url = native ? recordings.wordUrl(word, tags) : null;
          if (!url && !hasVoiceFor(speechLang)) return;
          play({ url, text: word, speechLang });
        }, DWELL_MS);
      },
    };
  }, [courseCode, speakNative, speakEnglish, recordings, tags]);
}
