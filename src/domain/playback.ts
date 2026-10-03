// One "read this aloud" call for everything that can be played: a recording
// when there is one (domain/recordings.ts picks it), text-to-speech when there
// isn't, or when the recording fails to load — a course version published
// before its recordings were, or a CDN that hasn't got the file yet, still
// reads aloud rather than going quiet.
import { speak } from "./tts";

export interface PlaybackRequest {
  /** Absolute URL of the recording, or null to go straight to text-to-speech. */
  url: string | null;
  /** What text-to-speech reads when there's no playable recording. */
  text: string;
  /** BCP-47 tag for text-to-speech (domain/language.ts). Null means no fallback: without a recording, nothing plays. */
  speechLang: string | null;
  /** Playback speed, 1 by default — SLOW_RATE for the slowed replay (issue #36). A recording keeps its pitch; text-to-speech reads slower. */
  rate?: number;
}

/** The slowed replay's speed: slow enough to hear each word, not so slow a recording smears. */
export const SLOW_RATE = 0.7;

/** Whatever is playing now. One voice at a time, app-wide: picking a word-bank tile while the prompt is still being read cuts the prompt off, the same as speak() cancelling its own queue. */
let active: { stop: () => void } | null = null;

/**
 * Starts playback, stopping whatever was already playing, and returns a
 * `stop`. `onEnd` fires exactly once — when playback finishes, is stopped, or
 * nothing could play — so a caller never has to tell those apart to know it's
 * over.
 */
export function play(request: PlaybackRequest, onEnd: () => void = () => {}): { stop: () => void } {
  active?.stop();
  const handle = start(request, onEnd);
  active = handle;
  return {
    stop: () => {
      handle.stop();
      if (active === handle) active = null;
    },
  };
}

function start({ url, text, speechLang, rate = 1 }: PlaybackRequest, onEnd: () => void): { stop: () => void } {
  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    onEnd();
  };

  // Stopping is once-only and ends this playback straight away: a stale
  // handle stopped again later (an unmounting prompt, long after a tile cut
  // it off) must not reach speak()'s stop, which cancels whatever the speech
  // engine is saying now — someone else's word.
  let stopped = false;
  let speech: { stop: () => void } | null = null;
  let audio: HTMLAudioElement | null = null;
  const fallback = () => {
    if (stopped || speech) return;
    if (speechLang) speech = speak(text, speechLang, finish, rate);
    else finish();
  };

  if (url) {
    audio = new Audio(url);
    // Pitch is preserved by default: slowed, a voice still sounds like itself.
    audio.playbackRate = rate;
    audio.onended = finish;
    audio.onerror = fallback;
    // Autoplay blocked, or the source failed before onerror fired: read it instead.
    audio.play().catch(fallback);
  } else {
    fallback();
  }

  return {
    stop: () => {
      // Already over on its own: nothing of ours is still playing.
      if (stopped || ended) {
        stopped = true;
        return;
      }
      stopped = true;
      audio?.pause();
      speech?.stop();
      finish();
    },
  };
}
