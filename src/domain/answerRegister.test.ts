import { describe, expect, it } from "vitest";
import { answerRegister, describeAnswerRegister } from "./answerRegister";
import type { WordHint } from "./romanization";
import type { Register } from "./enums";

const hint = (register: Register | null): WordHint => ({ translation: "", romanization: null, ruby: null, register });
const hintMap = new Map<string, WordHint>([
  ["خونه", hint("spoken")],
  ["خانه", hint("written")],
  ["من", hint("both")],
  ["رفتم", hint(null)],
]);

describe("answerRegister", () => {
  it("is spoken when any word is spoken, even beside a written one", () => {
    expect(answerRegister("خانه خونه", hintMap)).toBe("spoken");
  });

  it("is written when the most marked word is written", () => {
    expect(answerRegister("من خانه رفتم", hintMap)).toBe("written");
  });

  it("is null when no word is specific to a register", () => {
    expect(answerRegister("من رفتم", hintMap)).toBeNull();
    expect(answerRegister("unknown words", hintMap)).toBeNull();
  });

  it("looks words up past surrounding punctuation", () => {
    expect(answerRegister("خونه؟", hintMap)).toBe("spoken");
  });
});

describe("describeAnswerRegister", () => {
  const typed = { type: "type_in" as const, answer: ["من خانه", "من خونه", "من رفتم"], alternativeAnswers: null };

  it("labels the answer nearest the submission and lists the others in another register", () => {
    expect(describeAnswerRegister(typed, "من خونه", hintMap)).toEqual({
      label: "informal",
      alternatives: [{ answer: "من خانه", label: "formal" }],
    });
  });

  it("caps the alternatives at two", () => {
    const many = { ...typed, answer: ["خونه", "خانه", "من خانه", "خانه من"] };
    expect(describeAnswerRegister(many, "خونه", hintMap)?.alternatives).toHaveLength(2);
  });

  it("is null when nothing is specific to a register", () => {
    expect(describeAnswerRegister({ ...typed, answer: ["من رفتم"] }, "من رفتم", hintMap)).toBeNull();
  });

  it("reads a word bank's accepted tile orders", () => {
    const bank = { type: "word_bank" as const, answer: ["من", "خونه"], alternativeAnswers: [["خانه", "من"]] };
    expect(describeAnswerRegister(bank, "من خونه", hintMap)).toEqual({
      label: "informal",
      alternatives: [{ answer: "خانه من", label: "formal" }],
    });
  });
});
