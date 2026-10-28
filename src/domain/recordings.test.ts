import { describe, expect, it } from "vitest";
import { exerciseVoice, isPlayable, lineVoice, pickRecording, wordRecording } from "./recordings";
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
});

describe("exerciseVoice", () => {
  const cast = ["ali", "hooman", "setareh"];
  const question = (i: number, audio: Record<string, string[]> = { setareh: [`s${i}.mp3`], hooman: [`h${i}.mp3`] }) => ({
    prompt: `prompt ${i}`,
    answer: [`answer ${i}`],
    promptAudio: audio,
    answerAudio: audio,
  });

  it("keeps a question's voice for the same seed", () => {
    for (let i = 0; i < 20; i++) expect(exerciseVoice(question(i), cast, null, 7)).toBe(exerciseVoice(question(i), cast, null, 7));
  });

  it("varies the voice from question to question", () => {
    const voices = new Set(Array.from({ length: 40 }, (_, i) => exerciseVoice(question(i), cast, null, 7)));
    expect(voices).toEqual(new Set(["hooman", "setareh"]));
  });

  it("prefers a voice that recorded both the prompt and the answer, then either", () => {
    const split = { prompt: "p", answer: ["a"], promptAudio: { setareh: ["s.mp3"], hooman: ["h.mp3"] }, answerAudio: { hooman: ["h2.mp3"] } };
    const promptOnly = { prompt: "p", answer: ["a"], promptAudio: { setareh: ["s.mp3"], hooman: [] }, answerAudio: null };
    for (let seed = 0; seed < 20; seed++) {
      expect(exerciseVoice(split, cast, null, seed)).toBe("hooman");
      expect(exerciseVoice(promptOnly, cast, null, seed)).toBe("setareh");
    }
  });

  it("draws from the whole cast when nothing in the question is recorded", () => {
    const unrecorded = Array.from({ length: 40 }, (_, i) => exerciseVoice({ prompt: `p${i}`, answer: ["a"] }, cast, null, 3));
    expect(new Set(unrecorded)).toEqual(new Set(cast));
  });

  it("keeps a speaker's question to that speaker's voices", () => {
    for (let i = 0; i < 20; i++) {
      expect(exerciseVoice(question(i, { setareh: ["s.mp3"], hooman: ["h.mp3"], ali: ["a.mp3"] }), cast, ["ali"], i)).toBe("ali");
    }
  });
});

describe("lineVoice", () => {
  it("draws among the voices that recorded the line, the speaker's first", () => {
    for (let seed = 0; seed < 20; seed++) {
      expect(lineVoice({ setareh: [], hooman: ["h0.mp3"] }, null, seed)).toBe("hooman");
      expect(lineVoice({ setareh: ["s0.mp3"], hooman: ["h0.mp3"] }, ["setareh"], seed)).toBe("setareh");
    }
    expect(lineVoice(null, null, 1)).toBeNull();
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

describe("isPlayable", () => {
  it("passes every type but a listening exercise", () => {
    expect(isPlayable({ type: "type_in", promptAudio: null })).toBe(true);
  });

  it("needs a listening exercise to have a take", () => {
    expect(isPlayable({ type: "listen_type", promptAudio: { a: ["x.mp3"] } })).toBe(true);
    expect(isPlayable({ type: "listen_type", promptAudio: { a: [] } })).toBe(false);
    expect(isPlayable({ type: "listen_type", promptAudio: null })).toBe(false);
    expect(isPlayable({ type: "listen_type" })).toBe(false);
  });
});
