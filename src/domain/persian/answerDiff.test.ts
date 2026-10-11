import { describe, expect, it } from "vitest";
import { separatorMistakes } from "./answerDiff";

// Codepoints spelled out as escapes for the same reason normalize.ts does it:
// Arabic-vs-Persian lookalikes are indistinguishable in a source listing.
const ZWNJ = "‌";
const PERSIAN_YEH = "ی";
const ARABIC_YEH = "ي";

/** کتاب "ketab". */
const KETAB = "کتاب";

/** می‌روم "miravam", correctly spelled with a ZWNJ after the mi- prefix. */
const MIRAVAM = `م${PERSIAN_YEH}${ZWNJ}روم`;
/** میروم — the same word with the ZWNJ omitted. */
const MIRAVAM_NO_ZWNJ = `م${PERSIAN_YEH}روم`;
/** می روم — the ZWNJ typed as a plain space. */
const MIRAVAM_SPACE = `م${PERSIAN_YEH} روم`;
/** من می‌روم "man miravam", two words. */
const MAN_MIRAVAM = `من ${MIRAVAM}`;

describe("separatorMistakes", () => {
  it("says where a half-space was left out, or typed as a space", () => {
    expect(separatorMistakes(MIRAVAM_NO_ZWNJ, [MIRAVAM])).toEqual([{ after: `م${PERSIAN_YEH}`, expected: "half-space", typed: "none" }]);
    expect(separatorMistakes(MIRAVAM_SPACE, [MIRAVAM])).toEqual([{ after: `م${PERSIAN_YEH}`, expected: "half-space", typed: "space" }]);
  });

  it("names every place, each after its own word's letters", () => {
    expect(separatorMistakes(`من${MIRAVAM_NO_ZWNJ}`, [MAN_MIRAVAM])).toEqual([
      { after: "من", expected: "space", typed: "none" },
      { after: `م${PERSIAN_YEH}`, expected: "half-space", typed: "none" },
    ]);
  });

  it("catches a separator typed where none belongs", () => {
    expect(separatorMistakes(`ک${ZWNJ}تاب`, [KETAB])).toEqual([{ after: "ک", expected: "none", typed: "half-space" }]);
  });

  it("is empty for a correctly spaced answer, and null when a letter is off too", () => {
    expect(separatorMistakes(MAN_MIRAVAM, [MAN_MIRAVAM])).toEqual([]);
    expect(separatorMistakes(`من م${PERSIAN_YEH}رم`, [MAN_MIRAVAM])).toBeNull();
  });

  it("goes by the closest accepted answer and forgives Arabic codepoints", () => {
    const arabicNoZwnj = `م${ARABIC_YEH}روم`;
    expect(separatorMistakes(arabicNoZwnj, [MAN_MIRAVAM, MIRAVAM])).toEqual([
      { after: `م${PERSIAN_YEH}`, expected: "half-space", typed: "none" },
    ]);
  });
});
