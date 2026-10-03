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

const NO_TAGS: readonly string[] = [];

/** How long the pointer rests on a word before it's read. */
const DWELL_MS = 250;

export interface WordSpeech {
  /** The pointer or focus arrived on `word` (shown by `owner`, any object that stands for that one rendering of it): read it once it has rested there. Leaving is cancelHoverSpeech. */
  start: (word: string, owner: object) => void;
}

// One pending word app-wide: arriving on a word replaces whichever was
// waiting, wherever on the page it was. (One playing word app-wide is
// domain/playback.ts's own rule.) Its owner says whose it is, so a word
// unmounting doesn't cancel another word's wait.
let pending: { timer: ReturnType<typeof setTimeout>; owner: object } | null = null;

function clearPending() {
  if (pending) clearTimeout(pending.timer);
  pending = null;
}

/** `owner`'s word was left, or went away, before it was read: don't read it — if it's the one waiting. A word already being read finishes. */
export function cancelHoverSpeech(owner: object): void {
  if (pending?.owner === owner) clearPending();
}

/** The read-on-hover control for a sentence tagged with `tags` (how a word finds its recording), or null when neither kind of word is to be read. */
export function useHoverSpeech(tags: readonly string[] = NO_TAGS): WordSpeech | null {
  const courseCode = useBootstrap().data?.course?.code ?? null;
  const [speakNative] = useLocalAppPref("speakHoveredWords", true);
  const [speakEnglish] = useLocalAppPref("speakHoveredEnglish", false);
  const recordings = useRecordings();

  return useMemo(() => {
    const courseLang = getLanguageInfo(courseCode)?.speechLang ?? null;
    if (!courseLang || (!speakNative && !speakEnglish)) return null;
    return {
      start(word, owner) {
        clearPending();
        const timer = setTimeout(() => {
          pending = null;
          const speechLang = getSpeechLang(courseCode, word);
          if (!speechLang) return;
          const native = speechLang === courseLang;
          if (native ? !speakNative : !speakEnglish) return;
          const url = native ? recordings.wordUrl(word, tags) : null;
          if (!url && !hasVoiceFor(speechLang)) return;
          play({ url, text: word, speechLang });
        }, DWELL_MS);
        pending = { timer, owner };
      },
    };
  }, [courseCode, speakNative, speakEnglish, recordings, tags]);
}
