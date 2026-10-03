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

  it("forgives Arabic codepoints but not a missing half-space in Persian words", () => {
    // Arabic yeh (ي) for Persian yeh (ی) is forgiven; می‌روم typed without its ZWNJ is a misspelling.
    expect(markTypedAnswer("fa", ["من می‌روم"], "مني میروم", false).map((w) => w.mark)).toEqual(["wrong", "wrong"]);
    expect(markTypedAnswer("fa", ["من می\u200cروم"], "من مي\u200cروم", false).map((w) => w.mark)).toEqual(["right", "right"]);
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

  describe("missing words (issue #38)", () => {
    const show = (accepted: string[], submitted: string) =>
      markTypedAnswer("en", accepted, submitted, false).map((w) => (w.mark === "missing" ? `+${w.text}` : w.text));

    it("puts a left-out word where it belongs, as the answer writes it", () => {
      expect(show(["I am buying a bag"], "I buying a bag")).toEqual(["I", "+am", "buying", "a", "bag"]);
      expect(show(["Hello, how are you?"], "how are you")).toEqual(["+Hello,", "how", "are", "you"]);
      expect(markTypedAnswer("en", ["I am buying a bag"], "I buying a bag", false)[1]).toEqual({ text: "am", mark: "missing" });
    });

    it("measures against the closest accepted answer", () => {
      expect(show(["Hello, how are you?", "Hi, how are you?"], "hi are you")).toEqual(["hi", "+how", "are", "you"]);
    });

    it("adds nothing for a misspelled word: it stood in for the right one", () => {
      expect(show(["I am buying a bag"], "I am buying a cat")).toEqual(["I", "am", "buying", "a", "cat"]);
      expect(show(["I am buying a bag"], "I buying a cat")).toEqual(["I", "+am", "buying", "a", "cat"]);
      // A missing half-space is a misspelling too — the spacing note covers it.
      expect(markTypedAnswer("fa", ["من می\u200cخرم"], "من میخرم", false).some((w) => w.mark === "missing")).toBe(false);
    });

    it("adds nothing for a swapped pair, a correct answer, or one too far off", () => {
      expect(show(["I go to school"], "I to go school")).toEqual(["I", "to", "go", "school"]);
      expect(markTypedAnswer("en", ["I go"], "I go", true).some((w) => w.mark === "missing")).toBe(false);
      // One word of five: the blue would be most of the sentence.
      expect(show(["I am buying a bag"], "bag")).toEqual(["bag"]);
    });
  });
});
