import { describe, expect, it } from "vitest";
import { romanizeSentence, segmentAnnotatedText } from "./annotation";
import { buildLexemeHintMap } from "./romanization";
import { normalizeStrict, stripReadingAids } from "./persian/normalize";
import type { LexemeIndex } from "../types/content";

const KASRA = String.fromCharCode(0x0650);
const FATHA = String.fromCharCode(0x064e);
const HAMZA_ABOVE = String.fromCharCode(0x0654);
const ZWNJ = String.fromCharCode(0x200c);

// Entries as content/fa/lexemes.yaml writes them, plus the `forms` an ending's
// after-a-vowel spelling is published under.
const lexemes: LexemeIndex = {
  "من<pron>": { gloss: "I / me", register: null, romanization: "man", romanizationIsAuthored: true },
  "مادر<n>": { gloss: "mother", register: null, romanization: "mādar", romanizationIsAuthored: true },
  "کتاب<n>": { gloss: "book", register: null, romanization: "ketāb", romanizationIsAuthored: true },
  "خانه<n>": { gloss: "home", register: null, romanization: "khāne", romanizationIsAuthored: true },
  "هوا<n>": { gloss: "weather / air", register: null, romanization: "havā", romanizationIsAuthored: true },
  "چای<n>": { gloss: "tea", register: null, romanization: "chāy", romanizationIsAuthored: true },
  "خوب<adj>": { gloss: "good", register: null, romanization: "khūb", romanizationIsAuthored: true },
  "خسته<adj>": { gloss: "tired", register: null, romanization: "khaste", romanizationIsAuthored: true },
  "سر<n>": { gloss: "head", register: null, romanization: "sar", romanizationIsAuthored: true },
  "سر<prep>": { gloss: "at (a meal / table): سر سفره = at the sofreh", register: null, romanization: "sar-e", romanizationIsAuthored: true },
  "پا<n>": { gloss: "leg / foot", register: null, romanization: "pā", romanizationIsAuthored: true },
  "سال<n>": { gloss: "year", register: null, romanization: "sāl", romanizationIsAuthored: true },
  "نو<adj>": { gloss: "new", register: null, romanization: "no", romanizationIsAuthored: true },
  "عمو<n>": { gloss: "uncle (father's brother)", register: null, romanization: "amū", romanizationIsAuthored: true },
  "ـم<v><spoken>": { gloss: "am (attached to a predicate)", register: "spoken", romanization: "-am", romanizationIsAuthored: true, forms: ["ـام"] },
  "ـم<poss>": { gloss: "my (attached to a noun: سرم = my head)", register: null, romanization: "-am", romanizationIsAuthored: true, forms: ["ـام"] },
  "ـش<poss>": { gloss: "his / her (attached to a noun: کیفش = his/her bag)", register: null, romanization: "-esh", romanizationIsAuthored: true },
  "ـش<obj>": { gloss: "him / her / it, attached to a verb (دیدمش = I saw him / her)", register: null, romanization: "-esh", romanizationIsAuthored: true },
  "ـه<v><spoken>": { gloss: "is (attached to a predicate)", register: "spoken", romanization: "-e", romanizationIsAuthored: true },
  "ـها<pl>": { gloss: "plural ending (کتاب‌ها = books)", register: null, romanization: "-hā", romanizationIsAuthored: true },
  "ـی<v><spoken>": { gloss: "are (you; attached to a predicate)", register: "spoken", romanization: "-ī", romanizationIsAuthored: true, forms: ["ـای"] },
  "ـی<rel>": { gloss: "(attached before که: دوستی که = the friend who)", register: null, romanization: "-ī", romanizationIsAuthored: true },
  "ـی<indef>": { gloss: "a / an / one (attached to a noun: کتابی = a book)", register: null, romanization: "-ī", romanizationIsAuthored: true },
};
const hintMap = buildLexemeHintMap(lexemes);

function hintFor(word: string, tags: string[] = []) {
  const [segment] = segmentAnnotatedText(word, hintMap, tags);
  return segment.hint;
}

describe("attached endings", () => {
  it("gives an ending its general meaning — every sense, not a guess at one", () => {
    expect(hintFor("مادرم")).toMatchObject({ translation: "mother + -am (am / my)", romanization: "mādaram" });
    expect(hintFor("خوبم")?.translation).toBe("good + -am (am / my)");
  });

  it("finds an ending's after-a-vowel spelling behind a half-space", () => {
    expect(hintFor(`خسته${ZWNJ}ام`)?.translation).toBe("tired + -am (am / my)");
  });

  it("says a meaning two senses share once", () => {
    // ـش: "his / her" (possessive) and "him / her / it" (object).
    expect(hintFor("سالش")?.translation).toBe("year + -esh (his / her / him / it)");
  });

  it("stacks endings, longest one nearest the stem", () => {
    expect(hintFor("سالشه")?.translation).toBe("year + -esh (his / her / him / it) + -e (is)");
    expect(hintFor(`کتاب${ZWNJ}هام`)?.translation).toBe("book + -hā (plural ending) + -am (am / my)");
  });

  it("drops a sense whose gloss is only an authoring note", () => {
    // ـی's relative sense contributes nothing; its others do.
    expect(hintFor("کتابی")?.translation).toBe("book + -ī (are (you) / a / an / one)");
  });

  it("leaves a word alone when its stem would be too short to trust", () => {
    expect(hintFor("نون")).toBeNull();
  });

  it("splits a short stem that ends in a consonant", () => {
    expect(hintFor("سرم")).toMatchObject({ translation: "head + -am (am / my)", romanization: "saram" });
  });

  it("doesn't read a ی written onto a vowel as an ending — that's the ezafe", () => {
    expect(hintFor("عموی")).toBeNull();
  });

  it("prefers a word's own entry over a split", () => {
    expect(hintFor("مادر")?.translation).toBe("mother");
  });
});

describe("attached endings the exercise's tags spell out", () => {
  it("names just the tagged senses", () => {
    expect(hintFor("سرم", ["سر<n>", "ـم<poss>"])).toMatchObject({ translation: "head + -am (my)", romanization: "saram" });
    expect(hintFor(`خسته${ZWNJ}ام`, ["خسته<adj>", "ـم<v><spoken>"])?.translation).toBe("tired + -am (am)");
  });

  it("trusts a short vowel-final stem the tags name", () => {
    expect(hintFor("پام")).toBeNull();
    expect(hintFor("پام", ["پا<n>", "ـم<poss>"])).toMatchObject({ translation: "leg / foot + -am (my)", romanization: "pām" });
  });

  it("falls back to any split for a word the tags don't cover", () => {
    expect(hintFor("خوبم", ["سر<n>", "ـم<poss>"])?.translation).toBe("good + -am (am / my)");
  });
});

describe("ezafe marks", () => {
  it("reads a kasra on a consonant as -e", () => {
    expect(hintFor(`کتاب${KASRA}`)).toMatchObject({ translation: "book", romanization: "ketāb", ezafe: "-e" });
  });

  it("reads a kasra on the linking ی after a vowel as -ye", () => {
    expect(hintFor(`هوای${KASRA}`)).toMatchObject({ translation: "weather / air", ezafe: "-ye" });
  });

  it("reads a kasra on a word's own final ی as -e", () => {
    expect(hintFor(`چای${KASRA}`)).toMatchObject({ translation: "tea", ezafe: "-e" });
  });

  it("reads a hamza above a silent heh as -ye", () => {
    expect(hintFor(`خانه${HAMZA_ABOVE}`)).toMatchObject({ translation: "home", ezafe: "-ye" });
  });

  it("carries an ezafe on a word with endings", () => {
    expect(hintFor(`مادرم${KASRA}`)).toMatchObject({ translation: "mother + -am (am / my)", ezafe: "-e" });
  });

  it("looks a vowel-marked word up without its marks", () => {
    expect(hintFor(`م${FATHA}ن`)?.translation).toBe("I / me");
    expect(hintFor(`ک${KASRA}تاب${KASRA}`)).toMatchObject({ translation: "book", ezafe: "-e" });
  });
});

describe("reading aids", () => {
  it("strips vowel and ezafe marks and nothing else", () => {
    expect(stripReadingAids(`ک${KASRA}تاب${KASRA} م${FATHA}ن`)).toBe("کتاب من");
    expect(stripReadingAids(`خانه${HAMZA_ABOVE}`)).toBe("خانه");
    expect(stripReadingAids("لطفاً")).toBe("لطفاً"); // tanvin is spelling
  });

  it("grades a marked answer the same as the unmarked one", () => {
    expect(normalizeStrict(`ک${KASRA}تاب${KASRA} م${FATHA}ن`)).toBe(normalizeStrict("کتاب من"));
  });
});

describe("romanizeSentence", () => {
  it("romanizes word by word, ezafe included", () => {
    expect(romanizeSentence(`کتاب${KASRA} من`, hintMap)).toBe("ketāb-e man");
    expect(romanizeSentence(`هوای${KASRA} خوب؟`, hintMap)).toBe("havā-ye khūb?");
  });

  it("is null when no word is known", () => {
    expect(romanizeSentence("سلام", hintMap)).toBeNull();
  });
});
