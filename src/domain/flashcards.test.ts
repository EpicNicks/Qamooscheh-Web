import { describe, expect, it } from "vitest";
import { flashcardWords, glossAnswers, gradeTranslation, normalizeMeaning } from "./flashcards";
import type { LexemeIndex, LexemeIndexEntry } from "../types/content";

describe("normalizeMeaning", () => {
  it("ignores case, punctuation, articles and a leading 'to'", () => {
    expect(normalizeMeaning("  To the Bazaar! ")).toBe("bazaar");
    expect(normalizeMeaning("I'm tired.")).toBe("im tired");
  });
});

describe("glossAnswers", () => {
  it("splits alternatives and drops parenthesized asides", () => {
    expect(glossAnswers("after / later / next (بعد از = after)")).toEqual(
      expect.arrayContaining(["after", "later", "next"]),
    );
    expect(glossAnswers("uncle (father's brother)")).toEqual(["uncle"]);
  });

  it("expands a slash between two single words in place", () => {
    expect(glossAnswers("he / she cooks")).toEqual(expect.arrayContaining(["he cooks", "she cooks"]));
    expect(glossAnswers("he/she has")).toEqual(expect.arrayContaining(["he has", "she has"]));
  });

  it("strips the quotes some glosses are written in", () => {
    expect(glossAnswers("'I give (written: می‌دهم)'")).toEqual(["i give"]);
  });
});

describe("gradeTranslation", () => {
  it("accepts any of a gloss's meanings, loosely", () => {
    expect(gradeTranslation("Thank you!", "thank you")).toBe(true);
    expect(gradeTranslation("drink", "to eat / to drink")).toBe(true);
    expect(gradeTranslation("she cooks", "he/she cooks")).toBe(true);
    expect(gradeTranslation("you cook", "you (plural) cook")).toBe(true);
  });

  it("forgives one typo in a longer answer but not in a short one", () => {
    expect(gradeTranslation("goodbey", "goodbye")).toBe(true);
    expect(gradeTranslation("tee", "tea")).toBe(false);
  });

  it("rejects a wrong or empty answer", () => {
    expect(gradeTranslation("water", "bread")).toBe(false);
    expect(gradeTranslation("  ", "bread")).toBe(false);
  });
});

describe("flashcardWords", () => {
  const entry: LexemeIndexEntry = { gloss: "x", register: null, romanization: null, romanizationIsAuthored: false };
  const index: LexemeIndex = { "چای<n>": entry, "ـم<poss>": entry, "آب<n>": entry };

  it("keeps saved tags this course has, in order, without attached endings", () => {
    expect(flashcardWords(["آب<n>", "ـم<poss>", "dog<n>", "چای<n>"], index).map((w) => w.surface)).toEqual(["آب", "چای"]);
  });
});
