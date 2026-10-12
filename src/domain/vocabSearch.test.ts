import { describe, expect, it } from "vitest";
import { foldForSearch, matchesVocabQuery } from "./vocabSearch";
import type { LexemeIndexEntry } from "../types/content";

const entry = (gloss: string, romanization: string | null = null) => ({ gloss, romanization }) as LexemeIndexEntry;

describe("foldForSearch", () => {
  it("ignores case, accents and Arabic diacritics", () => {
    expect(foldForSearch("  Café ")).toBe("cafe");
    expect(foldForSearch("کِتاب")).toBe("کتاب");
  });

  it("keeps Japanese dakuten, so か and が stay different", () => {
    expect(foldForSearch("が")).not.toBe(foldForSearch("か"));
    expect(matchesVocabQuery("がくせい", entry("student"), "か")).toBe(false);
    expect(matchesVocabQuery("がくせい", entry("student"), "がく")).toBe(true);
  });

  it("unifies Arabic yeh and kaf with the Persian forms", () => {
    expect(foldForSearch("كيف")).toBe(foldForSearch("کیف"));
  });
});

describe("matchesVocabQuery", () => {
  const book = entry("book", "ketâb");

  it("matches everything for a blank query", () => {
    expect(matchesVocabQuery("کتاب", book, "   ")).toBe(true);
  });

  it("matches the surface, gloss or romanization by substring", () => {
    expect(matchesVocabQuery("کتاب", book, "تاب")).toBe(true);
    expect(matchesVocabQuery("کتاب", book, "BOO")).toBe(true);
    expect(matchesVocabQuery("کتاب", book, "ket")).toBe(true);
  });

  it("rejects words that match none of them", () => {
    expect(matchesVocabQuery("کتاب", book, "water")).toBe(false);
    expect(matchesVocabQuery("کتاب", entry("book"), "ket")).toBe(false);
  });
});
