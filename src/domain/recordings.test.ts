import { describe, expect, it } from "vitest";
import { pickRecording, wordRecording } from "./recordings";
import type { LexemeIndex, LexemeIndexEntry } from "../types/content";

const NO_PREFERENCE = { preferredVoice: null, defaultVoice: "setareh" };

describe("pickRecording", () => {
  const audio = { setareh: ["s0.mp3", "s1.mp3"], hooman: ["h0.mp3"] };

  it("plays the preferred voice's first take", () => {
    expect(pickRecording(audio, { preferredVoice: "hooman", defaultVoice: "setareh" })).toBe("h0.mp3");
  });

  it("falls back to the default voice when the preferred one has no take", () => {
    expect(pickRecording(audio, { preferredVoice: "ali", defaultVoice: "setareh" })).toBe("s0.mp3");
  });

  it("falls back to any voice with a take when neither the preferred nor the default has one", () => {
    expect(pickRecording({ hooman: ["h0.mp3"] }, NO_PREFERENCE)).toBe("h0.mp3");
  });

  it("keeps a line with a speaker to that speaker's voices, preferring the learner's choice among them", () => {
    expect(pickRecording(audio, { ...NO_PREFERENCE, speakerVoices: ["hooman"] })).toBe("h0.mp3");
    expect(pickRecording(audio, { preferredVoice: "setareh", defaultVoice: "setareh", speakerVoices: ["hooman", "setareh"] })).toBe("s0.mp3");
  });

  it("plays another voice when none of the speaker's voices recorded the line", () => {
    expect(pickRecording(audio, { ...NO_PREFERENCE, speakerVoices: ["ali"] })).toBe("s0.mp3");
  });

  it("is null when nothing is recorded", () => {
    expect(pickRecording(null, NO_PREFERENCE)).toBeNull();
    expect(pickRecording({ setareh: [] }, NO_PREFERENCE)).toBeNull();
  });

  describe("shuffled", () => {
    const lines = Array.from({ length: 40 }, (_, i) => ({ setareh: [`s${i}.mp3`], hooman: [`h${i}.mp3`] }));

    it("keeps a line's voice for the same seed", () => {
      const choice = { preferredVoice: "setareh", defaultVoice: "setareh", shuffleSeed: 7 };
      for (const line of lines) expect(pickRecording(line, choice)).toBe(pickRecording(line, choice));
    });

    it("spreads lines across the voices that recorded them, ignoring the preferred one", () => {
      const picked = lines.map((line) => pickRecording(line, { preferredVoice: "setareh", defaultVoice: "setareh", shuffleSeed: 7 }));
      expect(picked.some((path) => path?.startsWith("h"))).toBe(true);
      expect(picked.some((path) => path?.startsWith("s"))).toBe(true);
    });

    it("only draws voices with a take", () => {
      for (let seed = 0; seed < 20; seed++) {
        expect(pickRecording({ setareh: [], hooman: ["h0.mp3"] }, { ...NO_PREFERENCE, shuffleSeed: seed })).toBe("h0.mp3");
      }
    });

    it("keeps a speaker's line to that speaker's voices", () => {
      const cast = { setareh: ["s0.mp3"], hooman: ["h0.mp3"], ali: ["a0.mp3"] };
      for (let seed = 0; seed < 20; seed++) {
        expect(pickRecording(cast, { ...NO_PREFERENCE, speakerVoices: ["hooman"], shuffleSeed: seed })).toBe("h0.mp3");
      }
    });
  });
});

describe("wordRecording", () => {
  const entry = (audio: Record<string, string[]> | null, forms?: string[]): LexemeIndexEntry => ({
    gloss: "x",
    register: null,
    romanization: null,
    romanizationIsAuthored: false,
    forms,
    audio,
  });
  const index: LexemeIndex = {
    "کتاب<n>": entry({ setareh: ["book.mp3"] }),
    "شیر<n><milk>": entry({ setareh: ["milk.mp3"] }),
    "شیر<n><lion>": entry({ setareh: ["lion.mp3"] }),
    "ـم<poss>": entry({ setareh: ["am.mp3"] }, ["‌ام"]),
    "نان<n>": entry(null),
  };

  it("finds a tile's word by its spelling", () => {
    expect(wordRecording("کتاب", [], index, NO_PREFERENCE)).toBe("book.mp3");
  });

  it("ignores reading aids on the tile", () => {
    expect(wordRecording("کِتاب", [], index, NO_PREFERENCE)).toBe("book.mp3");
  });

  it("prefers the sense the exercise is tagged with for a homograph", () => {
    expect(wordRecording("شیر", ["شیر<n><lion>"], index, NO_PREFERENCE)).toBe("lion.mp3");
  });

  it("matches another written form of a lexeme", () => {
    expect(wordRecording("‌ام", [], index, NO_PREFERENCE)).toBe("am.mp3");
  });

  it("is null for an unrecorded word or a word with endings attached", () => {
    expect(wordRecording("نان", [], index, NO_PREFERENCE)).toBeNull();
    expect(wordRecording("کتابم", [], index, NO_PREFERENCE)).toBeNull();
  });
});
