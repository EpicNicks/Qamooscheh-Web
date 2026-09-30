import { describe, expect, it } from "vitest";
import { englishCandidates, isLatinText, segmentEnglish } from "./englishHints";
import { buildLexemeHintMap } from "./romanization";
import type { LexemeIndex } from "../types/content";

const lexemes: LexemeIndex = {
  "مادر<n>": { gloss: "mother", register: null, romanization: "mādar", romanizationIsAuthored: true },
  "خسته<adj>": { gloss: "tired", register: null, romanization: "khaste", romanizationIsAuthored: true },
  "است<v>": { gloss: "is", register: null, romanization: "ast", romanizationIsAuthored: true },
  "ـم<v><spoken>": { gloss: "am (attached to a predicate)", register: "spoken", romanization: "-am", romanizationIsAuthored: true },
  "ـم<poss>": { gloss: "my (attached to a noun: سرم = my head)", register: null, romanization: "-am", romanizationIsAuthored: true },
  "ممنون<interj><spoken>": { gloss: "thank you", register: "spoken", romanization: "mamnūn", romanizationIsAuthored: true },
  "تو<pron>": { gloss: "you", register: null, romanization: "to", romanizationIsAuthored: true },
  "داشتن<v>": { gloss: "to have", register: null, romanization: "dāshtan", romanizationIsAuthored: true },
  "کتاب<n>": { gloss: "book", register: null, romanization: "ketāb", romanizationIsAuthored: true },
  "مامان<n>": { gloss: "mom (everyday word: what you call your mother)", register: null, romanization: "māmān", romanizationIsAuthored: true },
  "می‌خواد<v><spoken>": { gloss: "he/she wants", register: "spoken", romanization: "mīkhād", romanizationIsAuthored: true },
  "اومد<v><spoken>": { gloss: "he / she came", register: "spoken", romanization: "ūmad", romanizationIsAuthored: true },
  "یک<num>": { gloss: "one", register: null, romanization: "yek", romanizationIsAuthored: true },
  "من<pron>": { gloss: "I", register: null, romanization: "man", romanizationIsAuthored: true },
  "ـتر<comp>": { gloss: "-er / more (comparative)", register: null, romanization: "-tar", romanizationIsAuthored: true },
};
const hintMap = buildLexemeHintMap(lexemes);

function hinted(text: string, tags: string[]) {
  return segmentEnglish(text, englishCandidates(tags, hintMap))
    .filter((s) => s.hint)
    .map((s) => `${s.text}=${s.hint!.native}`);
}

describe("English prompt hints", () => {
  it("matches only this exercise's own lexemes", () => {
    expect(hinted("My mother is tired.", ["مادر<n>", "خسته<adj>", "است<v>", "ـم<poss>"])).toEqual([
      "My=ـم",
      "mother=مادر",
      "is=است",
      "tired=خسته",
    ]);
    // "you" is a lexeme, but not one this exercise drills.
    expect(hinted("Are you tired?", ["خسته<adj>"])).toEqual(["tired=خسته"]);
  });

  it("uses the tag's own sense of a shared surface", () => {
    expect(hinted("I am tired", ["خسته<adj>", "ـم<v><spoken>"])).toEqual(["am=ـم", "tired=خسته"]);
  });

  it("prefers the longest phrase", () => {
    expect(hinted("Thank you!", ["ممنون<interj><spoken>", "تو<pron>"])).toEqual(["Thank you=ممنون"]);
  });

  it("matches plurals, a verb without its 'to', and a gloss without its note", () => {
    expect(hinted("Books", ["کتاب<n>"])).toEqual(["Books=کتاب"]);
    expect(hinted("We have tea", ["داشتن<v>"])).toEqual(["have=داشتن"]);
    expect(hinted("Where is mom?", ["مامان<n>"])).toEqual(["mom=مامان"]);
  });

  it("skips suffix-only alternatives but keeps the rest", () => {
    expect(hinted("more expensive", ["ـتر<comp>"])).toEqual(["more=ـتر"]);
  });

  it("expands slashed glosses without matching half of one", () => {
    expect(hinted("She wants tea", ["می‌خواد<v><spoken>"])).toEqual(["She wants=می‌خواد"]);
    expect(hinted("He wants tea", ["می‌خواد<v><spoken>"])).toEqual(["He wants=می‌خواد"]);
    expect(hinted("He came", ["اومد<v><spoken>"])).toEqual(["He came=اومد"]);
  });

  it("reads either half of a contraction, and یک as the article", () => {
    expect(hinted("I'm tired", ["من<pron>", "خسته<adj>"])).toEqual(["I'm=من", "tired=خسته"]);
    expect(hinted("It's tired", ["است<v>"])).toEqual(["It's=است"]);
    expect(hinted("a book", ["یک<num>", "کتاب<n>"])).toEqual(["a=یک", "book=کتاب"]);
    // برادرِ من: the pronoun after an ezafe is the English possessive.
    expect(hinted("My mother", ["مادر<n>", "من<pron>"])).toEqual(["My=من", "mother=مادر"]);
  });

  it("carries the romanization", () => {
    const [segment] = segmentEnglish("mother", englishCandidates(["مادر<n>"], hintMap));
    expect(segment.hint).toEqual({ native: "مادر", romanization: "mādar" });
  });

  it("tells English prompts from native ones", () => {
    expect(isLatinText("My mother is tired.")).toBe(true);
    expect(isLatinText("ketāb-e man")).toBe(true);
    expect(isLatinText("مادرم خسته است")).toBe(false);
    expect(isLatinText("123")).toBe(false);
  });
});
