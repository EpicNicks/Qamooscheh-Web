import { describe, expect, it } from "vitest";
import { NO_NEW_WORDS, buildNewWords, hasNewTag, isNewNativeWord, withNewWordHints } from "./newWords";
import { buildLexemeHintMap, EMPTY_HINT_MAP } from "./romanization";
import { englishCandidates, segmentEnglish } from "./englishHints";
import type { LexemeIndex } from "../types/content";

const lexemes: LexemeIndex = {
  "مادر<n>": { gloss: "mother", register: null, romanization: "mādar", romanizationIsAuthored: true },
  "خسته<adj>": { gloss: "tired", register: null, romanization: "khaste", romanizationIsAuthored: true },
  "کتاب<n>": { gloss: "book", register: null, romanization: "ketāb", romanizationIsAuthored: true },
};
const courseHintMap = buildLexemeHintMap(lexemes);

describe("buildNewWords", () => {
  it("is empty without newLexemes", () => {
    expect(buildNewWords(undefined, courseHintMap)).toBe(NO_NEW_WORDS);
    expect(buildNewWords([], courseHintMap)).toBe(NO_NEW_WORDS);
  });

  it("keys new words by tag and by surface, with their course hints", () => {
    const newWords = buildNewWords(["مادر<n>"], courseHintMap);
    expect(hasNewTag(["مادر<n>", "خسته<adj>"], newWords)).toBe(true);
    expect(hasNewTag(["خسته<adj>"], newWords)).toBe(false);
    expect(isNewNativeWord("مادر", newWords)).toBe(true);
    expect(isNewNativeWord("خسته", newWords)).toBe(false);
    expect(newWords.hintMap.get("مادر")?.translation).toBe("mother");
  });

  it("matches a word written with its reading aids", () => {
    expect(isNewNativeWord("کِتاب", buildNewWords(["کتاب<n>"], courseHintMap))).toBe(true);
  });
});

describe("withNewWordHints", () => {
  it("adds the new words' hints to a map gated empty by the learner's toggles", () => {
    const map = withNewWordHints(EMPTY_HINT_MAP, buildNewWords(["مادر<n>"], courseHintMap));
    expect([...map.keys()]).toEqual(["مادر"]);
  });

  it("leaves a map that already has them as it is", () => {
    expect(withNewWordHints(courseHintMap, buildNewWords(["مادر<n>"], courseHintMap))).toBe(courseHintMap);
  });

  it("lets an English prompt hover just the new words", () => {
    const newWords = buildNewWords(["مادر<n>"], courseHintMap);
    const tags = ["مادر<n>", "خسته<adj>"].filter((tag) => newWords.tags.has(tag));
    const segments = segmentEnglish("mother is tired", englishCandidates(tags, withNewWordHints(EMPTY_HINT_MAP, newWords)));
    expect(segments.filter((s) => s.hint).map((s) => `${s.text}=${s.hint!.tag}`)).toEqual(["mother=مادر<n>"]);
  });
});
