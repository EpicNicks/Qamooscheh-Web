// Drives one "read this phrase aloud" control — the play/replay button plus
// the autoplay-on-load behavior, shared by every exercise-type component via
// components/lesson/ExercisePrompt.tsx. Plays the recording when the caller
// has one (hooks/useRecordings.ts) and text-to-speech otherwise — see
// domain/playback.ts.
import { useEffect, useRef, useState } from "react";
import { play as startPlayback, slowPlayback } from "../domain/playback";

export type PhraseAudioStatus = "idle" | "playing";

export interface PhraseAudio {
  status: PhraseAudioStatus;
  /** Cancels whatever's still playing (if anything) and starts this phrase again from the beginning. */
  play: () => void;
  /** The same, slowed down (issue #36). */
  playSlow: () => void;
}

export function usePhraseAudio(params: {
  text: string;
  /** BCP-47 tag (domain/language.ts's speechLang) — null when the course's language isn't known, in which case play() is a no-op. */
  speechLang: string | null;
  /** The recording's URL, when there is one. Undefined/null, or a file that fails to load, falls back to TTS. */
  audioUrl?: string | null;
  /** The dedicated slow recording of the same voice, when there is one: playSlow plays it at normal speed instead of slowing the normal take down. */
  slowAudioUrl?: string | null;
  /** Fires play() once, the first time text/audioUrl/speechLang are all available — mirrors user_prefs.autoplay_audio. */
  autoplay?: boolean;
}): PhraseAudio {
  const { text, speechLang, audioUrl, slowAudioUrl, autoplay } = params;
  const [status, setStatus] = useState<PhraseAudioStatus>("idle");

  const stopRef = useRef<() => void>(() => {});
  // Bumped on every play() — guards against a cancelled/replaced playback's
  // onEnd firing after a NEWER playback has already started, which would
  // otherwise mark this render's playback idle out from under it.
  const generationRef = useRef(0);

  function play(rate = 1, url: string | null | undefined = audioUrl) {
    if (!speechLang && !url) return;
    stopRef.current();
    const generation = ++generationRef.current;
    setStatus("playing");

    function finish() {
      if (generation === generationRef.current) setStatus("idle");
    }

    stopRef.current = startPlayback({ url: url ?? null, text, speechLang, rate }, finish).stop;
  }

  // Stop on unmount — a phrase shouldn't keep talking after its exercise has
  // already been left.
  useEffect(() => () => stopRef.current(), []);

  useEffect(() => {
    if (autoplay && (speechLang || audioUrl) && text) play();
    // Deliberately keyed on the phrase itself, not on `play` (a new function
    // identity every render) or `autoplay` (a static per-page preference,
    // not something that should replay a phrase already in progress if it
    // somehow changed mid-exercise).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, audioUrl, speechLang]);

  return {
    status,
    play: () => play(),
    playSlow: () => {
      const slow = slowPlayback(audioUrl, slowAudioUrl);
      play(slow.rate, slow.url);
    },
  };
}
