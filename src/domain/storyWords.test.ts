import { describe, expect, it } from "vitest";
import { savedTagFor } from "./storyWords";
import type { WordHint } from "./romanization";
import type { LexemeIndex } from "../types/content";

const hint = (...tags: string[]): WordHint => ({
  translation: "x",
  romanization: null,
  ruby: null,
  senses: tags.map((tag) => ({ tag, pos: "", translation: "x", romanization: null })),
});

const index = {
  "کتاب<n>": { gloss: "book" },
  "رفتن<v>": { gloss: "to go", verbForm: "infinitive" },
  "ـم<poss>": { gloss: "my" },
} as unknown as LexemeIndex;

describe("savedTagFor", () => {
  it("is null for a word with no hint", () => {
    expect(savedTagFor(null, [], index)).toBeNull();
  });

  it("finds the tag of a word", () => {
    expect(savedTagFor(hint("کتاب<n>"), ["کتاب<n>"], index)).toEqual({ tag: "کتاب<n>", verb: false });
  });

  it("marks an infinitive as a verb", () => {
    expect(savedTagFor(hint("رفتن<v>"), [], index)).toEqual({ tag: "رفتن<v>", verb: true });
  });

  it("never offers an attached ending", () => {
    expect(savedTagFor(hint("ـم<poss>"), [], index)).toBeNull();
  });

  it("takes the sense the line's own tags pick out", () => {
    expect(savedTagFor(hint("رفتن<v>", "کتاب<n>"), ["کتاب<n>"], index)?.tag).toBe("کتاب<n>");
  });

  it("is null when the course doesn't index the tag", () => {
    expect(savedTagFor(hint("نامعلوم<n>"), [], index)).toBeNull();
  });
});
