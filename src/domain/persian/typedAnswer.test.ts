import { describe, expect, it } from "vitest";
import { submittedSpelling } from "./typedAnswer";

const Z = "‌";
/** How isolated mode writes a word: a ZWNJ after every letter. */
const isolated = (word: string) => [...word].map((letter) => letter + Z).join("");

describe("submittedSpelling", () => {
  it("drops isolated mode's ZWNJ after each letter", () => {
    expect(submittedSpelling(isolated("کتاب"), true)).toBe("کتاب");
    expect(submittedSpelling(`${isolated("من")} ${isolated("رفتم")}`, true)).toBe("من رفتم");
  });

  it("keeps a half-space typed on purpose in isolated mode", () => {
    // می‌خرم: the ZWNJ key after ی adds a second one beside ی's own.
    expect(submittedSpelling(`${isolated("می")}${Z}${isolated("خرم")}`, true)).toBe(`می${Z}خرم`);
  });

  it("leaves a contextual answer's half-spaces alone", () => {
    expect(submittedSpelling(`می${Z}خرم`, false)).toBe(`می${Z}خرم`);
  });

  it("trims a half-space at either end or beside a space", () => {
    expect(submittedSpelling(`${Z}کتاب${Z}`, false)).toBe("کتاب");
    expect(submittedSpelling(`من${Z} ${Z}می${Z}خرم`, false)).toBe(`من می${Z}خرم`);
  });
});
