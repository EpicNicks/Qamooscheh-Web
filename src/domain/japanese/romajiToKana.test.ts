import { describe, expect, it } from "vitest";
import { feedRomajiChar, finalizeRomaji, initialJapanesePhoneticState } from "./romajiToKana";
import type { JapanesePhoneticState } from "./romajiToKana";

interface Keystroke {
  char: string;
  deleteCount: number;
  insertText: string;
  /** The answer text after this keystroke's edit has been applied. */
  text: string;
  /** The still-unresolved romaji buffer after this keystroke. */
  buffer: string;
}

/**
 * Replays a romaji string one character at a time the way the input component
 * does — applying each step's (deleteCount, insertText) edit to a running
 * answer string — so tests assert on what the learner actually ends up seeing.
 */
function typeRomaji(input: string): { text: string; state: JapanesePhoneticState; keystrokes: Keystroke[] } {
  let state = initialJapanesePhoneticState;
  let text = "";
  const keystrokes: Keystroke[] = [];

  for (const char of input) {
    const step = feedRomajiChar(state, char);
    if (step.deleteCount > 0) text = text.slice(0, text.length - step.deleteCount);
    text += step.insertText;
    state = step.state;
    keystrokes.push({ char, deleteCount: step.deleteCount, insertText: step.insertText, text, buffer: state.buffer });
  }

  return { text, state, keystrokes };
}

/** Replays a string, then commits any pending bare "n" the way blur/submit does. */
function typeAndFinalize(input: string): string {
  const { text, state } = typeRomaji(input);
  const step = finalizeRomaji(state);
  return (step.deleteCount > 0 ? text.slice(0, text.length - step.deleteCount) : text) + step.insertText;
}

describe("feedRomajiChar", () => {
  const cases: { name: string; input: string; text: string; buffer: string }[] = [
    { name: "a bare vowel", input: "a", text: "あ", buffer: "" },
    { name: "a simple CV syllable", input: "ka", text: "か", buffer: "" },
    { name: "a consonant alone stays buffered and shows nothing", input: "k", text: "", buffer: "k" },
    {
      name: "sokuon: a doubled consonant emits っ and the consonant still forms its own syllable",
      input: "kitte",
      text: "きって",
      buffer: "",
    },
    { name: "sokuon across a whole word", input: "gakkou", text: "がっこう", buffer: "" },
    { name: "youon: a y-cluster resolves on the vowel", input: "kya", text: "きゃ", buffer: "" },
    { name: "a bare n shows the full-width placeholder and stays pending", input: "n", text: "ｎ", buffer: "n" },
    { name: "nn commits ん and consumes both n's", input: "nn", text: "ん", buffer: "" },
    { name: "n followed by a vowel is an ordinary na-row syllable", input: "na", text: "な", buffer: "" },
    { name: "n followed by a consonant commits ん and starts the consonant fresh", input: "nk", text: "ん", buffer: "k" },
    { name: "n followed by a consonant, completed", input: "nka", text: "んか", buffer: "" },
    { name: "an alternate spelling from the table", input: "sushi", text: "すし", buffer: "" },
    { name: "the si/shi alternate resolves identically", input: "susi", text: "すし", buffer: "" },
    { name: "a dakuten youon cluster", input: "zya", text: "じゃ", buffer: "" },
    { name: "x-prefixed small kana", input: "xtsu", text: "っ", buffer: "" },
    {
      name: "an impossible consonant cluster drops the stale buffer and restarts",
      input: "ktu",
      text: "つ",
      buffer: "",
    },
    {
      name: "an unresolvable cluster followed by a vowel drops the buffer and takes the vowel alone",
      input: "kye",
      text: "え",
      buffer: "",
    },
    {
      name: "nn is greedy, so konnichiha yields こんいちは rather than こんにちは",
      input: "konnichiha",
      text: "こんいちは",
      buffer: "",
    },
    { name: "uppercase input is lowercased first", input: "KA", text: "か", buffer: "" },
  ];

  for (const { name, input, text, buffer } of cases) {
    it(name, () => {
      const result = typeRomaji(input);
      expect(result.text).toBe(text);
      expect(result.state.buffer).toBe(buffer);
    });
  }

  it('emits the right per-keystroke edits for "kitte"', () => {
    expect(typeRomaji("kitte").keystrokes).toEqual([
      { char: "k", deleteCount: 0, insertText: "", text: "", buffer: "k" },
      { char: "i", deleteCount: 0, insertText: "き", text: "き", buffer: "" },
      { char: "t", deleteCount: 0, insertText: "", text: "き", buffer: "t" },
      { char: "t", deleteCount: 0, insertText: "っ", text: "きっ", buffer: "t" },
      { char: "e", deleteCount: 0, insertText: "て", text: "きって", buffer: "" },
    ]);
  });

  it('replaces the ｎ placeholder when "nn" resolves', () => {
    expect(typeRomaji("nn").keystrokes).toEqual([
      { char: "n", deleteCount: 0, insertText: "ｎ", text: "ｎ", buffer: "n" },
      { char: "n", deleteCount: 1, insertText: "ん", text: "ん", buffer: "" },
    ]);
  });

  it("replaces the ｎ placeholder when a consonant forces the syllabic reading", () => {
    expect(typeRomaji("nk").keystrokes).toEqual([
      { char: "n", deleteCount: 0, insertText: "ｎ", text: "ｎ", buffer: "n" },
      { char: "k", deleteCount: 1, insertText: "ん", text: "ん", buffer: "k" },
    ]);
  });

  it("replaces the ｎ placeholder when a vowel makes it a na-row syllable instead", () => {
    expect(typeRomaji("na").keystrokes).toEqual([
      { char: "n", deleteCount: 0, insertText: "ｎ", text: "ｎ", buffer: "n" },
      { char: "a", deleteCount: 1, insertText: "な", text: "な", buffer: "" },
    ]);
  });

  it('buffers the cluster silently for "kya" and resolves it on the vowel', () => {
    expect(typeRomaji("kya").keystrokes).toEqual([
      { char: "k", deleteCount: 0, insertText: "", text: "", buffer: "k" },
      { char: "y", deleteCount: 0, insertText: "", text: "", buffer: "ky" },
      { char: "a", deleteCount: 0, insertText: "きゃ", text: "きゃ", buffer: "" },
    ]);
  });
});

describe("finalizeRomaji", () => {
  it("commits a pending bare n as ん, replacing the placeholder", () => {
    expect(finalizeRomaji({ buffer: "n" })).toEqual({
      state: initialJapanesePhoneticState,
      deleteCount: 1,
      insertText: "ん",
    });
    expect(typeAndFinalize("nihon")).toBe("にほん");
  });

  it("drops any other pending buffer without emitting anything", () => {
    expect(finalizeRomaji({ buffer: "ky" })).toEqual({
      state: initialJapanesePhoneticState,
      deleteCount: 0,
      insertText: "",
    });
    expect(typeAndFinalize("nihonk")).toBe("にほん");
  });

  it("is a no-op on an empty buffer", () => {
    expect(finalizeRomaji(initialJapanesePhoneticState)).toEqual({
      state: initialJapanesePhoneticState,
      deleteCount: 0,
      insertText: "",
    });
  });
});
