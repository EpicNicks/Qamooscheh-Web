import { describe, expect, it } from "vitest";
import { markTypedAnswer } from "./typedAnswerMarks";

describe("markTypedAnswer", () => {
  it("marks every word green on a correct answer, typos included", () => {
    expect(markTypedAnswer("fa", ["man be madreseh miravam"], "man be madrese miravam", true).map((w) => w.mark)).toEqual([
      "right",
      "right",
      "right",
      "right",
    ]);
  });

  it("marks only the words outside the best alignment wrong", () => {
    const marked = markTypedAnswer("en", ["I go to school"], "I went to school", false);
    expect(marked).toEqual([
      { text: "I", mark: "right" },
      { text: "went", mark: "wrong" },
      { text: "to", mark: "right" },
      { text: "school", mark: "right" },
    ]);
  });

  it("ignores case and punctuation, and measures against the closest accepted answer", () => {
    const marked = markTypedAnswer("en", ["Hello, how are you?", "Hi, how are you?"], "hi how is you", false);
    expect(marked.map((w) => w.mark)).toEqual(["right", "right", "wrong", "right"]);
  });

  it("forgives Arabic codepoints and half-spaces in Persian words", () => {
    // Arabic yeh (ي) for Persian yeh (ی), and می‌روم typed without its ZWNJ.
    const marked = markTypedAnswer("fa", ["من می‌روم"], "مني میروم", false);
    expect(marked.map((w) => w.mark)).toEqual(["wrong", "right"]);
    expect(markTypedAnswer("fa", ["علي"], "علی", false)[0].mark).toBe("right");
  });

  it("marks a single swapped pair yellow", () => {
    expect(markTypedAnswer("en", ["I go to school"], "I to go school", false).map((w) => w.mark)).toEqual([
      "right",
      "swapped",
      "swapped",
      "right",
    ]);
  });
});
