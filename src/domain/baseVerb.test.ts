import { describe, expect, it } from "vitest";
import { baseVerbOf, baseVerbTags, isBaseVerb } from "./baseVerb";
import type { LexemeIndex, LexemeIndexEntry } from "../types/content";

function entry(overrides: Partial<LexemeIndexEntry>): LexemeIndexEntry {
  return { gloss: "", register: "standard", romanization: null, romanizationIsAuthored: false, ...overrides } as LexemeIndexEntry;
}

const index: LexemeIndex = {
  "خریدن<v>": entry({ gloss: "to buy", pos: "verb", verbForm: "infinitive", lemma: "خریدن" }),
  "می‌خرم<v>": entry({ gloss: "I buy", pos: "verb", verbForm: "conjugated", lemma: "خریدن" }),
  "باید<v>": entry({ gloss: "must", pos: "verb", verbForm: "modal", lemma: "بایستن" }),
  "کتاب<n>": entry({ gloss: "book", pos: "noun" }),
};

describe("baseVerbOf", () => {
  const byLemma = baseVerbTags(index);

  it("finds a form's infinitive through its lemma", () => {
    expect(baseVerbOf(index["می‌خرم<v>"], byLemma)).toBe("خریدن<v>");
  });

  it("offers nothing for an infinitive itself, a word with no lemma, or a lemma with no infinitive", () => {
    expect(baseVerbOf(index["خریدن<v>"], byLemma)).toBeNull();
    expect(baseVerbOf(index["کتاب<n>"], byLemma)).toBeNull();
    expect(baseVerbOf(index["باید<v>"], byLemma)).toBeNull();
  });
});

describe("isBaseVerb", () => {
  it("is the infinitive only", () => {
    expect(isBaseVerb(index["خریدن<v>"])).toBe(true);
    expect(isBaseVerb(index["می‌خرم<v>"])).toBe(false);
    expect(isBaseVerb(undefined)).toBe(false);
  });
});
