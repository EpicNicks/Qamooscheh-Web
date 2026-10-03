// Short feedback sounds (issue #32): a right or wrong answer, a lesson passed
// or not, the day's goal reached. Synthesized with the Web Audio API from a
// few notes each rather than shipped as recordings: nothing to license, load
// or cache, and they're tuned to sit under a voice rather than over it.
// A channel of their own: unlike domain/playback.ts, a sound never stops
// whatever is being read aloud, and reading aloud never stops a sound.

export type SoundEffect = "correct" | "wrong" | "lessonPassed" | "lessonFailed" | "goalReached";

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
export const SOUNDS: Record<SoundEffect, { wave: OscillatorType; volume: number; notes: Note[] }> = {
  correct: { wave: "sine", volume: 0.18, notes: notes([659.25, 987.77], 0.08, 0.12, 0.22) }, // E5 B5
  wrong: { wave: "triangle", volume: 0.16, notes: notes([233.08, 174.61], 0.11, 0.14, 0.24) }, // Bb3 F3
  lessonPassed: { wave: "sine", volume: 0.18, notes: notes([523.25, 659.25, 783.99, 1046.5], 0.11, 0.16, 0.5) }, // C5 E5 G5 C6
  lessonFailed: { wave: "triangle", volume: 0.15, notes: notes([392.0, 329.63, 261.63], 0.16, 0.2, 0.45) }, // G4 E4 C4
  goalReached: { wave: "sine", volume: 0.16, notes: notes([783.99, 1046.5, 1318.51], 0.09, 0.14, 0.4) }, // G5 C6 E6
};

/** Seconds from a sound's start to its last note's end — how long anything meant to follow it waits (hooks/useAnswerAudio.ts). */
export function soundLength(effect: SoundEffect): number {
  return Math.max(...SOUNDS[effect].notes.map((note) => note.at + note.length));
}

let context: AudioContext | null = null;

/** Plays `effect` once. Silently does nothing where Web Audio isn't available. */
export function playSound(effect: SoundEffect): void {
  const AudioContextClass = typeof window === "undefined" ? undefined : window.AudioContext;
  if (!AudioContextClass) return;
  try {
    context ??= new AudioContextClass();
    // A context made before any user gesture starts suspended; every sound
    // here follows one (an answer, a finished lesson), which lets it resume.
    if (context.state === "suspended") void context.resume();
    const { wave, volume, notes } = SOUNDS[effect];
    const start = context.currentTime + 0.01;
    for (const note of notes) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = wave;
      oscillator.frequency.value = note.freq;
      // A quick attack and an exponential fade: no click at either end.
      gain.gain.setValueAtTime(0.0001, start + note.at);
      gain.gain.exponentialRampToValueAtTime(volume, start + note.at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + note.at + note.length);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start + note.at);
      oscillator.stop(start + note.at + note.length + 0.02);
    }
  } catch {
    // Feedback sounds are a nicety: never let one break the lesson.
  }
}
