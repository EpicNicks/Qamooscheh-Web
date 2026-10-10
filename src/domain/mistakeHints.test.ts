import { describe, expect, it } from "vitest";
import { mistakeKind } from "./mistakeHints";
import { markTypedAnswer } from "./typedAnswerMarks";

describe("mistakeKind", () => {
  it("names a left-out را in a Persian answer", () => {
    const marked = markTypedAnswer("fa", ["کتاب را خواندم"], "کتاب خواندم", false);
    expect(marked.map((word) => mistakeKind("fa", word))).toEqual([null, "missingRa", null]);
  });

  it("ignores reading aids and Arabic codepoints on the missing word", () => {
    expect(mistakeKind("fa", { text: "رَا", mark: "missing" })).toBe("missingRa");
  });

  it("gives no hint for a را the learner typed", () => {
    const marked = markTypedAnswer("fa", ["کتاب را خواندم"], "کتاب را خواند", false);
    expect(marked.map((word) => mistakeKind("fa", word))).toEqual([null, null, null]);
  });

  it("gives no hint for any other missing word", () => {
    const marked = markTypedAnswer("fa", ["من کتاب را خواندم"], "کتاب را خواندم", false);
    expect(marked[0]).toEqual({ text: "من", mark: "missing" });
    expect(marked.map((word) => mistakeKind("fa", word))).toEqual([null, null, null, null]);
  });

  it("gives no hint outside a Persian course", () => {
    expect(mistakeKind("en", { text: "را", mark: "missing" })).toBeNull();
    expect(mistakeKind(null, { text: "را", mark: "missing" })).toBeNull();
  });
});
