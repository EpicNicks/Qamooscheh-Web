import { describe, expect, it } from "vitest";
import { NO_NEW_WORDS, buildNewWords, hasNewTag, isNewNativeWord, withNewWordHints } from "./newWords";
import { buildLexemeHintMap, EMPTY_HINT_MAP } from "./romanization";
import { segmentAnnotatedText } from "./annotation";
import { englishCandidates, segmentEnglish } from "./englishHints";
import type { LexemeIndex } from "../types/content";

const lexemes: LexemeIndex = {
  "مادر<n>": { gloss: "mother", register: null, romanization: "mādar", romanizationIsAuthored: true },
  "خسته<adj>": { gloss: "tired", register: null, romanization: "khaste", romanizationIsAuthored: true },
  "سر<n>": { gloss: "head", register: null, romanization: "sar", romanizationIsAuthored: true },
  "ـم<poss>": { gloss: "my (attached to a noun: سرم = my head)", register: null, romanization: "-am", romanizationIsAuthored: true },
};
const courseHintMap = buildLexemeHintMap(lexemes);

/** The prompt's words marked new, as AnnotatedText reads them with hover hints off. */
function newIn(text: string, newLexemes: string[], tags: string[]): string[] {
  const newWords = buildNewWords(newLexemes, courseHintMap);
  return segmentAnnotatedText(text, withNewWordHints(EMPTY_HINT_MAP, newWords), tags)
    .filter((segment) => segment.isWord && isNewNativeWord(segment.hint, newWords, tags))
    .map((segment) => segment.text);
}

describe("buildNewWords", () => {
  it("is empty without newLexemes", () => {
    expect(buildNewWords(undefined, courseHintMap)).toBe(NO_NEW_WORDS);
    expect(buildNewWords([], courseHintMap)).toBe(NO_NEW_WORDS);
  });

  it("hands out the same object for the same artifact list", () => {
    const newLexemes = ["مادر<n>"];
    expect(buildNewWords(newLexemes, courseHintMap)).toBe(buildNewWords(newLexemes, courseHintMap));
  });

  it("tells whether an exercise has a new tag", () => {
    const newWords = buildNewWords(["مادر<n>"], courseHintMap);
    expect(hasNewTag(["مادر<n>", "خسته<adj>"], newWords)).toBe(true);
    expect(hasNewTag(["خسته<adj>"], newWords)).toBe(false);
  });
});

describe("isNewNativeWord", () => {
  it("marks a new word, and leaves the others, with hover hints off", () => {
    expect(newIn("مادر خسته است", ["مادر<n>"], ["مادر<n>", "خسته<adj>"])).toEqual(["مادر"]);
  });

  it("marks a word written with endings when its stem is new", () => {
    expect(newIn("سرم", ["سر<n>"], ["سر<n>", "ـم<poss>"])).toEqual(["سرم"]);
  });

  it("doesn't mark a word for a new ending alone", () => {
    expect(newIn("مادرم", ["ـم<poss>"], ["مادر<n>", "ـم<poss>"])).toEqual([]);
  });
});

describe("withNewWordHints", () => {
  it("leaves a map that already has the new words as it is", () => {
    expect(withNewWordHints(courseHintMap, buildNewWords(["مادر<n>"], courseHintMap))).toBe(courseHintMap);
    expect(withNewWordHints(EMPTY_HINT_MAP, NO_NEW_WORDS)).toBe(EMPTY_HINT_MAP);
  });

  it("lets an English prompt hover just the new words", () => {
    const newWords = buildNewWords(["مادر<n>"], courseHintMap);
    const tags = ["مادر<n>", "خسته<adj>"].filter((tag) => newWords.tags.has(tag));
    const segments = segmentEnglish("mother is tired", englishCandidates(tags, withNewWordHints(EMPTY_HINT_MAP, newWords)));
    expect(segments.filter((s) => s.hint).map((s) => `${s.text}=${s.hint!.tag}`)).toEqual(["mother=مادر<n>"]);
  });
});
