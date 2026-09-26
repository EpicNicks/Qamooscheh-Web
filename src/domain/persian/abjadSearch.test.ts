import { describe, expect, it } from "vitest";
import { lettersMatching, parseLetterSearch, type LetterSearchToken } from "./abjadSearch";

const parse = (text: string, tokens: LetterSearchToken[] = []) => parseLetterSearch(text, tokens);
const labels = (text: string, tokens: LetterSearchToken[] = []) => parse(text, tokens).tokens.map((t) => t.label);

describe("parseLetterSearch", () => {
  it("turns each Persian letter into its own token", () => {
    const { tokens } = parse("ثب");
    expect(tokens.map((t) => [t.label, t.letters])).toEqual([
      ["ث", ["ث"]],
      ["ب", ["ب"]],
    ]);
  });

  it("maps a Latin character to every letter with that sound", () => {
    expect(parse("s").tokens[0].letters).toEqual(["ث", "س", "ص"]);
    expect(parse("z").tokens[0].letters).toEqual(["ذ", "ز", "ض", "ظ"]);
    expect(parse("H").tokens[0].letters).toEqual(["ح", "ه"]);
  });

  it("drops anything that isn't a letter or a mapped Latin character", () => {
    expect(labels("1 x!؟s")).toEqual(["s"]);
  });

  it("builds digraphs as the h arrives, including across separate keystrokes", () => {
    expect(labels("sh")).toEqual(["sh"]);
    expect(labels("h", parse("k").tokens)).toEqual(["kh"]);
    expect(parse("gh").tokens[0].letters).toEqual(["غ", "ق"]);
  });

  it("holds a lone c until it becomes ch, and drops it otherwise", () => {
    expect(parse("c")).toEqual({ tokens: [], pending: "c" });
    expect(labels("ch")).toEqual(["ch"]);
    expect(labels("cb")).toEqual(["b"]);
  });

  it("keeps one token per search, moving a repeat to the end", () => {
    expect(labels("sbs")).toEqual(["b", "s"]);
  });

  it("reads Arabic look-alikes, hamza/madde forms and macrons as their base letter", () => {
    expect(labels("يكآ")).toEqual(["ی", "ک", "ا"]);
    expect(labels("ؤئ")).toEqual(["و", "ی"]);
    expect(labels("ā")).toEqual(["a"]);
  });
});

describe("lettersMatching", () => {
  it("is null with no tokens (no filter) and the union otherwise", () => {
    expect(lettersMatching([])).toBeNull();
    expect([...lettersMatching(parse("tث").tokens)!]).toEqual(["ت", "ط", "ث"]);
  });
});
