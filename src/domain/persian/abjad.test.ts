import { describe, expect, it } from "vitest";
import { ABJAD_LETTERS, abjadFlashcards, abjadSoundGroups, letterInForm } from "./abjad";

describe("ABJAD_LETTERS", () => {
  it("has all 32 letters, each once", () => {
    expect(ABJAD_LETTERS).toHaveLength(32);
    expect(new Set(ABJAD_LETTERS.map((l) => l.letter)).size).toBe(32);
  });

  it("marks exactly the seven non-joining letters", () => {
    expect(ABJAD_LETTERS.filter((l) => !l.joinsNext).map((l) => l.letter).join("")).toBe("ادذرزژو");
  });
});

describe("abjadSoundGroups", () => {
  const groups = abjadSoundGroups();
  const lettersFor = (sound: string) => groups.find((g) => g.sound === sound)?.letters.map((l) => l.letter).join("");

  it("groups the letters that share a sound", () => {
    expect(lettersFor("s")).toBe("ثسص");
    expect(lettersFor("z")).toBe("ذزضظ");
    expect(lettersFor("h")).toBe("حه");
    expect(lettersFor("t")).toBe("تط");
    expect(lettersFor("gh")).toBe("غق");
  });

  it("orders groups by their first letter's place in the alphabet", () => {
    expect(groups.map((g) => g.letters[0].letter).join("")).toBe("ابپتثجچحخدذرژشعغفکگلمنوی");
  });
});

describe("letterInForm", () => {
  const be = { letter: "ب", joinsNext: true };
  const re = { letter: "ر", joinsNext: false };

  it("extends a joining letter toward each neighbor it joins", () => {
    expect([letterInForm(be, "isolated"), letterInForm(be, "initial"), letterInForm(be, "medial"), letterInForm(be, "final")]).toEqual(["ب", "بـ", "ـبـ", "ـب"]);
  });

  it("never extends a non-joiner to its left", () => {
    expect([letterInForm(re, "isolated"), letterInForm(re, "initial"), letterInForm(re, "medial"), letterInForm(re, "final")]).toEqual(["ر", "ر", "ـر", "ـر"]);
  });
});

describe("abjadFlashcards", () => {
  it("makes one card per letter carrying its sound and both spellings of its name", () => {
    const cards = abjadFlashcards();
    expect(cards).toHaveLength(32);
    const se = cards.find((c) => c.id === "ث");
    expect(se).toMatchObject({ nameRomanized: "se", nameNative: "ثِ", sound: { label: "s" } });
  });
});
