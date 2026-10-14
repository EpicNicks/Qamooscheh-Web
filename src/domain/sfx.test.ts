import { describe, expect, it } from "vitest";
import { FILL_SOUND, fillSoundFreq, SAMPLES, SOUNDS, soundLength } from "./sfx";

describe("feedback sounds", () => {
  it("keeps the answer sounds short enough to sit before the read-back", () => {
    expect(soundLength("correct")).toBeLessThan(0.4);
    expect(soundLength("wrong")).toBeLessThan(0.4);
  });

  it("rises for good news and falls for bad", () => {
    const rises = (effect: keyof typeof SOUNDS) => {
      const freqs = SOUNDS[effect].notes.map((note) => note.freq);
      return freqs.every((freq, i) => i === 0 || freq > freqs[i - 1]);
    };
    const falls = (effect: keyof typeof SOUNDS) => {
      const freqs = SOUNDS[effect].notes.map((note) => note.freq);
      return freqs.every((freq, i) => i === 0 || freq < freqs[i - 1]);
    };
    expect(rises("correct") && rises("lessonPassed") && rises("goalReached")).toBe(true);
    expect(falls("wrong") && falls("lessonFailed")).toBe(true);
  });

  it("measures a sound to its last note's end", () => {
    expect(soundLength("lessonPassed")).toBeCloseTo(0.33 + 0.5);
  });

  it("measures a recording by its known length", () => {
    expect(soundLength("storyComplete")).toBe(SAMPLES.storyComplete.length);
  });

  it("sweeps the fill cue steadily up from its low to its high pitch", () => {
    expect(fillSoundFreq(0)).toBeCloseTo(FILL_SOUND.fromHz);
    expect(fillSoundFreq(1)).toBeCloseTo(FILL_SOUND.toHz);
    expect(fillSoundFreq(0.5)).toBeCloseTo(Math.sqrt(FILL_SOUND.fromHz * FILL_SOUND.toHz));
    expect(fillSoundFreq(-1)).toBeCloseTo(FILL_SOUND.fromHz);
    expect(fillSoundFreq(2)).toBeCloseTo(FILL_SOUND.toHz);
  });
});
