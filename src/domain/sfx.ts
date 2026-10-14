// Short feedback sounds (issue #32): a right or wrong answer, a lesson passed
// or not, the day's goal reached. Synthesized with the Web Audio API from a
// few notes each rather than shipped as recordings: nothing to license, load
// or cache, and they're tuned to sit under a voice rather than over it.
// A channel of their own: unlike domain/playback.ts, a sound never stops
// whatever is being read aloud, and reading aloud never stops a sound.
// The one exception to synthesis is a story's end, which plays the same
// recording the Android app's finished-lesson sound does.

import storyCompleteUrl from "../assets/sfx/story-complete.wav";

type SynthEffect = "correct" | "wrong" | "lessonPassed" | "lessonFailed" | "goalReached";
type SampleEffect = "storyComplete";
export type SoundEffect = SynthEffect | SampleEffect;

interface Note {
  /** Hz. */
  freq: number;
  /** Seconds after the sound starts. */
  at: number;
  /** Seconds the note sounds, fade-out included. */
  length: number;
}

const notes = (freqs: number[], step: number, length: number, lastLength = length): Note[] =>
  freqs.map((freq, i) => ({ freq, at: i * step, length: i === freqs.length - 1 ? lastLength : length }));

// Rising for good news, falling for bad; the wrong-answer sound is low and
// soft so that hearing it over and over doesn't sting.
export const SOUNDS: Record<SynthEffect, { wave: OscillatorType; volume: number; notes: Note[] }> = {
  correct: { wave: "sine", volume: 0.18, notes: notes([659.25, 987.77], 0.08, 0.12, 0.22) }, // E5 B5
  wrong: { wave: "triangle", volume: 0.16, notes: notes([233.08, 174.61], 0.11, 0.14, 0.24) }, // Bb3 F3
  lessonPassed: { wave: "sine", volume: 0.18, notes: notes([523.25, 659.25, 783.99, 1046.5], 0.11, 0.16, 0.5) }, // C5 E5 G5 C6
  lessonFailed: { wave: "triangle", volume: 0.15, notes: notes([392.0, 329.63, 261.63], 0.16, 0.2, 0.45) }, // G4 E4 C4
  goalReached: { wave: "sine", volume: 0.16, notes: notes([783.99, 1046.5, 1318.51], 0.09, 0.14, 0.4) }, // G5 C6 E6
};

/** Recorded sounds: `length` is the recording's, in seconds, so it's known before it loads. */
export const SAMPLES: Record<SampleEffect, { url: string; volume: number; length: number }> = {
  storyComplete: { url: storyCompleteUrl, volume: 0.6, length: 0.7 },
};

const isSample = (effect: SoundEffect): effect is SampleEffect => effect in SAMPLES;

/** Seconds from a sound's start to its last note's end — how long anything meant to follow it waits (hooks/useAnswerAudio.ts). */
export function soundLength(effect: SoundEffect): number {
  if (isSample(effect)) return SAMPLES[effect].length;
  return Math.max(...SOUNDS[effect].notes.map((note) => note.at + note.length));
}

let context: AudioContext | null = null;

/** How long a sound may wait for audio to be allowed before it's dropped — any later and it would play out of context. */
const MAX_START_DELAY_MS = 300;

/**
 * Plays `effect` once — now, or not at all. Silently does nothing where Web
 * Audio isn't available, or where the browser won't play sound yet (nothing
 * has been tapped or typed on the page since it loaded).
 */
export function playSound(effect: SoundEffect): void {
  whenRunning((ctx) => schedule(ctx, effect));
}

/** Runs `start` with a running audio context, or drops it: see playSound. */
function whenRunning(start: (ctx: AudioContext) => void): void {
  const AudioContextClass = typeof window === "undefined" ? undefined : window.AudioContext;
  if (!AudioContextClass) return;
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try {
    context ??= new AudioContextClass();
    const ctx = context;
    if (ctx.state === "running") return start(ctx);
    // Suspended (made before a gesture) or interrupted (Safari): resuming is
    // allowed after one, and every sound here follows one. A resume that
    // takes too long means it wasn't, and the sound would come out of
    // nowhere later — drop it.
    const asked = performance.now();
    ctx
      .resume()
      .then(() => {
        if (ctx.state === "running" && performance.now() - asked < MAX_START_DELAY_MS) start(ctx);
      })
      .catch(() => {});
  } catch {
    // Feedback sounds are a nicety: never let one break the lesson.
  }
}

/** The recap's fill cue: a soft sine sweeping up while the ring fills. */
export const FILL_SOUND = { fromHz: 330, toHz: 880, volume: 0.09 } as const;

/** The fill cue's pitch (Hz) at fill progress 0..1: an even climb in pitch, so it rises as steadily as it sounds. */
export function fillSoundFreq(progress: number): number {
  const t = Math.min(1, Math.max(0, progress));
  return FILL_SOUND.fromHz * (FILL_SOUND.toHz / FILL_SOUND.fromHz) ** t;
}

/**
 * Plays the fill cue for `seconds`, fading out as it ends so the landing
 * sound follows cleanly. Returns a function that cuts it short (unmount).
 */
export function playFillSound(seconds: number): () => void {
  let stop = () => {};
  let cancelled = false;
  whenRunning((ctx) => {
    if (cancelled) return;
    const start = ctx.currentTime + 0.01;
    const end = start + seconds;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(fillSoundFreq(0), start);
    oscillator.frequency.exponentialRampToValueAtTime(fillSoundFreq(1), end);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(FILL_SOUND.volume, start + 0.05);
    gain.gain.setValueAtTime(FILL_SOUND.volume, end - 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
    stop = () => {
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        oscillator.stop();
      } catch {
        // Already stopped.
      }
    };
  });
  return () => {
    cancelled = true;
    stop();
  };
}

/** A recording's bytes, fetched once; decoded per play, which for a sound this short is quick. */
const sampleBytes = new Map<SampleEffect, Promise<ArrayBuffer>>();

function fetchSample(effect: SampleEffect): Promise<ArrayBuffer> {
  let bytes = sampleBytes.get(effect);
  if (!bytes) {
    bytes = fetch(SAMPLES[effect].url).then((response) => {
      if (!response.ok) throw new Error(`${response.status}`);
      return response.arrayBuffer();
    });
    // A failed fetch may be retried by the next play.
    bytes.catch(() => sampleBytes.delete(effect));
    sampleBytes.set(effect, bytes);
  }
  return bytes;
}

/**
 * Starts fetching a recorded sound ahead of when it's played, so that it
 * comes out on cue rather than being dropped as late. No audio context is
 * needed for this, so it's fine before any gesture.
 */
export function preloadSound(effect: SoundEffect): void {
  if (!isSample(effect) || typeof fetch === "undefined") return;
  fetchSample(effect).catch(() => {});
}

function schedule(ctx: AudioContext, effect: SoundEffect): void {
  if (isSample(effect)) return scheduleSample(ctx, effect);
  const { wave, volume, notes } = SOUNDS[effect];
  const start = ctx.currentTime + 0.01;
  for (const note of notes) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = wave;
    oscillator.frequency.value = note.freq;
    // A quick attack and an exponential fade: no click at either end.
    gain.gain.setValueAtTime(0.0001, start + note.at);
    gain.gain.exponentialRampToValueAtTime(volume, start + note.at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + note.at + note.length);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start + note.at);
    oscillator.stop(start + note.at + note.length + 0.02);
  }
}

function scheduleSample(ctx: AudioContext, effect: SampleEffect): void {
  const asked = performance.now();
  fetchSample(effect)
    // decodeAudioData detaches the buffer it's given: hand it a copy.
    .then((bytes) => ctx.decodeAudioData(bytes.slice(0)))
    .then((buffer) => {
      if (performance.now() - asked >= MAX_START_DELAY_MS) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      gain.gain.value = SAMPLES[effect].volume;
      source.connect(gain).connect(ctx.destination);
      source.start();
    })
    .catch(() => {});
}
