import { describe, expect, it } from "vitest";
import { pickShareWord, shareCardContent } from "./shareCard";
import type { WordHint } from "./romanization";

const hint = (translation: string, romanization: string | null): WordHint => ({ translation, romanization, ruby: romanization });

describe("pickShareWord", () => {
  const hints = new Map<string, WordHint>([
    ["و", hint("and", null)],
    ["خانه", hint("house", "khāne")],
    ["کتاب", hint("book", "ketāb")],
  ]);

  it("takes the first tagged word with a reading", () => {
    expect(pickShareWord(["و<conj>", "خانه<n>", "کتاب<n>"], hints)).toEqual({ text: "خانه", reading: "khāne", gloss: "house" });
  });

  it("falls back to a word without a reading, and to nothing", () => {
    expect(pickShareWord(["و<conj>"], hints)).toEqual({ text: "و", reading: null, gloss: "and" });
    expect(pickShareWord(["unknown<n>"], hints)).toBeNull();
  });
});

describe("shareCardContent", () => {
  it("leaves a zero or missing streak off the card", () => {
    expect(shareCardContent(12, 0, [], new Map()).streakDays).toBeNull();
    expect(shareCardContent(null, undefined, [], new Map())).toEqual({ headline: "Parsle complete!", xp: 0, streakDays: null, word: null });
    expect(shareCardContent(12, 5, [], new Map()).streakDays).toBe(5);
  });
});
