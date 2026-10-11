import { describe, expect, it } from "vitest";
import type { LexemeIndex } from "../types/content";
import { buildLexemeHintMap } from "./romanization";

const base = { register: null, romanization: null, romanizationIsAuthored: false };

describe("buildLexemeHintMap verbLemma", () => {
  it("carries a verb lexeme's lemma and nothing else's", () => {
    const index: LexemeIndex = {
      "خریدم<v>": { ...base, gloss: "I bought", pos: "verb", verbForm: "conjugated", lemma: "خریدن" },
      "کتاب<n>": { ...base, gloss: "book", pos: "noun", lemma: "کتاب" },
      "سلام<interj>": { ...base, gloss: "hello" },
    };
    const map = buildLexemeHintMap(index);
    expect(map.get("خریدم")?.verbLemma).toBe("خریدن");
    expect(map.get("کتاب")?.verbLemma).toBeUndefined();
    expect(map.get("سلام")?.verbLemma).toBeUndefined();
  });

  it("keeps a verb's lemma when a homograph noun shares the surface", () => {
    const index: LexemeIndex = {
      "خرید<n>": { ...base, gloss: "purchase", pos: "noun" },
      "خرید<v>": { ...base, gloss: "bought", pos: "verb", verbForm: "conjugated", lemma: "خریدن" },
    };
    expect(buildLexemeHintMap(index).get("خرید")?.verbLemma).toBe("خریدن");
  });
});
