import { describe, expect, it } from "vitest";
import { compareExact, compareNative, compareRomanized, compareSpeak } from "./comparators";
import type { PersianComparisonResult } from "./comparators";

// Codepoints spelled out as escapes for the same reason normalize.ts does it:
// Arabic-vs-Persian lookalikes are indistinguishable in a source listing.
const ZWNJ = "‌";
const PERSIAN_YEH = "ی";
const ARABIC_YEH = "ي";

/** کتاب "ketab" — 4 letters, so it clears minLengthForEditTolerance = 4. */
const KETAB = "کتاب";
/** کتب — KETAB with the alef dropped: edit distance 1, only 3 letters long. */
const KETAB_TYPO = "کتب";
/** کت — edit distance 2 from KETAB. */
const KETAB_TYPO_2 = "کت";

/** میز "miz", written with the correct Persian yeh. */
const MIZ = `م${PERSIAN_YEH}ز`;
/** میز written with the Arabic yeh — a codepoint substitution, not a typo. */
const MIZ_ARABIC = `م${ARABIC_YEH}ز`;

/** می‌روم "miravam", correctly spelled with a ZWNJ after the mi- prefix. */
const MIRAVAM = `م${PERSIAN_YEH}${ZWNJ}روم`;
/** میروم — the same word with the ZWNJ omitted. */
const MIRAVAM_NO_ZWNJ = `م${PERSIAN_YEH}روم`;

/** آب "ab" — only 2 letters, below the edit-tolerance minimum. */
const AB = "آب";
/** آد — edit distance 1 from AB, but AB is too short for that to be forgiven. */
const AB_TYPO = "آد";

interface Case {
  name: string;
  submitted: string;
  accepted: string[];
  expected: PersianComparisonResult;
}

describe("compareNative", () => {
  const cases: Case[] = [
    {
      name: "exact match is correct with no correction reasons",
      submitted: KETAB,
      accepted: [KETAB],
      expected: { verdict: "correct", matchedAnswer: KETAB, reasons: [] },
    },
    {
      name: "surrounding and repeated whitespace is normalized away, still correct",
      submitted: `  ${KETAB}  `,
      accepted: [KETAB],
      expected: { verdict: "correct", matchedAnswer: KETAB, reasons: [] },
    },
    {
      name: "Persian digits fold to ASCII before comparison",
      submitted: "۱۲۳",
      accepted: ["123"],
      expected: { verdict: "correct", matchedAnswer: "123", reasons: [] },
    },
    {
      name: "Arabic-Indic digits fold to ASCII too",
      submitted: "٣٤",
      accepted: ["34"],
      expected: { verdict: "correct", matchedAnswer: "34", reasons: [] },
    },
    {
      name: "Arabic yeh for Persian yeh is accepted as a codepoint substitution",
      submitted: MIZ_ARABIC,
      accepted: [MIZ],
      expected: { verdict: "accepted_with_correction", matchedAnswer: MIZ, reasons: ["codepoint_substitution"] },
    },
    {
      name: "a missing ZWNJ is accepted as a spacing correction",
      submitted: MIRAVAM_NO_ZWNJ,
      accepted: [MIRAVAM],
      expected: { verdict: "accepted_with_correction", matchedAnswer: MIRAVAM, reasons: ["zwnj_or_spacing"] },
    },
    {
      name: "a one-letter typo is forgiven when the accepted answer is long enough",
      submitted: KETAB_TYPO,
      accepted: [KETAB],
      expected: { verdict: "accepted_with_correction", matchedAnswer: KETAB, reasons: ["edit_distance_typo"] },
    },
    {
      name: "a two-letter typo exceeds the default budget of 1",
      submitted: KETAB_TYPO_2,
      accepted: [KETAB],
      expected: { verdict: "incorrect", matchedAnswer: null, reasons: [] },
    },
    {
      name: "edit tolerance keys off the accepted answer's length, so short answers get none",
      submitted: AB_TYPO,
      accepted: [AB],
      expected: { verdict: "incorrect", matchedAnswer: null, reasons: [] },
    },
    {
      name: "an unrelated word is incorrect",
      submitted: MIZ,
      accepted: [KETAB],
      expected: { verdict: "incorrect", matchedAnswer: null, reasons: [] },
    },
    {
      name: "an exact match wins over an earlier near-miss in the accepted list",
      submitted: KETAB,
      accepted: [KETAB_TYPO, KETAB],
      expected: { verdict: "correct", matchedAnswer: KETAB, reasons: [] },
    },
    {
      name: "the best-scoring answer of several is the one reported",
      submitted: MIZ_ARABIC,
      accepted: [KETAB, MIZ],
      expected: { verdict: "accepted_with_correction", matchedAnswer: MIZ, reasons: ["codepoint_substitution"] },
    },
    {
      name: "an empty accepted list is incorrect",
      submitted: KETAB,
      accepted: [],
      expected: { verdict: "incorrect", matchedAnswer: null, reasons: [] },
    },
  ];

  for (const { name, submitted, accepted, expected } of cases) {
    it(name, () => {
      expect(compareNative(submitted, accepted)).toEqual(expected);
    });
  }

  it("maxEditDistance = 0 disables the typo tier entirely", () => {
    expect(compareNative(KETAB_TYPO, [KETAB], 0)).toEqual({ verdict: "incorrect", matchedAnswer: null, reasons: [] });
  });

  it("raising minLengthForEditTolerance above the answer length disables the typo tier", () => {
    expect(compareNative(KETAB_TYPO, [KETAB], 1, 5)).toEqual({
      verdict: "incorrect",
      matchedAnswer: null,
      reasons: [],
    });
  });

  it("reports both a codepoint substitution and a typo when they occur together", () => {
    // میزی (miz + yeh) written with the Arabic yeh throughout, against میز:
    // folding fixes the letter forms, and the extra letter is the typo.
    const submitted = `م${ARABIC_YEH}ز${ARABIC_YEH}`;
    const accepted = `م${PERSIAN_YEH}ز${PERSIAN_YEH}م`;
    expect(compareNative(submitted, [accepted])).toEqual({
      verdict: "accepted_with_correction",
      matchedAnswer: accepted,
      reasons: ["codepoint_substitution", "edit_distance_typo"],
    });
  });
});

describe("compareRomanized", () => {
  const cases: Case[] = [
    {
      name: "case differences alone are still an exact match",
      submitted: "Salam",
      accepted: ["salam"],
      expected: { verdict: "correct", matchedAnswer: "salam", reasons: [] },
    },
    {
      name: "repeated inner whitespace collapses before comparison",
      submitted: "chetor   ast",
      accepted: ["chetor ast"],
      expected: { verdict: "correct", matchedAnswer: "chetor ast", reasons: [] },
    },
    {
      name: "an apostrophe hamza/ayin marker is latinization variance",
      submitted: "sa'lam",
      accepted: ["salam"],
      expected: { verdict: "accepted_with_correction", matchedAnswer: "salam", reasons: ["latinization_variance"] },
    },
    {
      name: "a hyphenated prefix is latinization variance",
      submitted: "mi-ravam",
      accepted: ["miravam"],
      expected: { verdict: "accepted_with_correction", matchedAnswer: "miravam", reasons: ["latinization_variance"] },
    },
    {
      name: "a doubled vowel spelling of a long vowel is latinization variance",
      submitted: "salaam",
      accepted: ["salam"],
      expected: { verdict: "accepted_with_correction", matchedAnswer: "salam", reasons: ["latinization_variance"] },
    },
    {
      name: "a one-letter typo is within the wider romanized budget",
      submitted: "salom",
      accepted: ["salam"],
      expected: {
        verdict: "accepted_with_correction",
        matchedAnswer: "salam",
        reasons: ["latinization_variance", "edit_distance_typo"],
      },
    },
    {
      name: "a two-letter typo is still within the default budget of 2",
      submitted: "solom",
      accepted: ["salam"],
      expected: {
        verdict: "accepted_with_correction",
        matchedAnswer: "salam",
        reasons: ["latinization_variance", "edit_distance_typo"],
      },
    },
    {
      name: "a three-letter typo exceeds the default budget",
      submitted: "solon",
      accepted: ["salam"],
      expected: { verdict: "incorrect", matchedAnswer: null, reasons: [] },
    },
    {
      name: "answers shorter than 3 characters get no edit tolerance",
      submitted: "ob",
      accepted: ["ab"],
      expected: { verdict: "incorrect", matchedAnswer: null, reasons: [] },
    },
    {
      name: "an unrelated word is incorrect",
      submitted: "xyzzy",
      accepted: ["salam"],
      expected: { verdict: "incorrect", matchedAnswer: null, reasons: [] },
    },
    {
      name: "an exact match wins over an earlier variance match",
      submitted: "salam",
      accepted: ["salaam", "salam"],
      expected: { verdict: "correct", matchedAnswer: "salam", reasons: [] },
    },
  ];

  for (const { name, submitted, accepted, expected } of cases) {
    it(name, () => {
      expect(compareRomanized(submitted, accepted)).toEqual(expected);
    });
  }
});

describe("compareExact", () => {
  it("accepts only a strictly-normalized identical answer", () => {
    expect(compareExact(KETAB, [KETAB])).toEqual({ verdict: "correct", matchedAnswer: KETAB, reasons: [] });
  });

  it("normalizes whitespace and digits but forgives nothing else", () => {
    expect(compareExact(` ${KETAB} `, [KETAB])).toEqual({ verdict: "correct", matchedAnswer: KETAB, reasons: [] });
    // A codepoint substitution that compareNative would forgive is rejected here.
    expect(compareExact(MIZ_ARABIC, [MIZ])).toEqual({ verdict: "incorrect", matchedAnswer: null, reasons: [] });
  });
});

describe("compareSpeak", () => {
  it("widens the native budget by the ASR allowance", () => {
    // Distance 2: rejected by compareNative's default budget of 1...
    expect(compareNative(KETAB_TYPO_2, [KETAB]).verdict).toBe("incorrect");
    // ...but inside compareSpeak's 1 + 1.
    expect(compareSpeak(KETAB_TYPO_2, [KETAB], "native")).toEqual({
      verdict: "accepted_with_correction",
      matchedAnswer: KETAB,
      reasons: ["edit_distance_typo"],
    });
  });

  it("widens the romanized budget by the ASR allowance", () => {
    expect(compareRomanized("solon", ["salam"]).verdict).toBe("incorrect");
    expect(compareSpeak("solon", ["salam"], "romanized")).toEqual({
      verdict: "accepted_with_correction",
      matchedAnswer: "salam",
      reasons: ["latinization_variance", "edit_distance_typo"],
    });
  });

  it("passes an exact match straight through", () => {
    expect(compareSpeak(KETAB, [KETAB], "native").verdict).toBe("correct");
    expect(compareSpeak("salam", ["salam"], "romanized").verdict).toBe("correct");
  });
});
