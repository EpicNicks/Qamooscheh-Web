import { describe, expect, it } from "vitest";
import { needsRetype, retypeMatches } from "./retype";
import { checkAnswer } from "./answerFeedback";
import type { ExerciseArtifact } from "../types/content";

type Checked = Pick<ExerciseArtifact, "type" | "scriptMode" | "answer" | "alternativeAnswers">;

const native: Checked = { type: "type_in", scriptMode: "native", answer: ["من کتاب دارم", "کتاب دارم"], alternativeAnswers: null };
const english: Checked = { type: "type_in", scriptMode: "native", answer: ["I have a book", "I've got a book"], alternativeAnswers: null };

describe("needsRetype (issue #44)", () => {
  it("offers a retype only after a wrong typed answer", () => {
    expect(needsRetype("type_in", false)).toBe(true);
    expect(needsRetype("type_in", true)).toBe(false);
  });

  it("never offers one for an exercise that isn't typed", () => {
    for (const type of ["word_bank", "match", "speak"] as const) expect(needsRetype(type, false)).toBe(false);
  });
});

describe("retypeMatches (issue #44)", () => {
  it("accepts any accepted answer, not just the first", () => {
    expect(retypeMatches("fa", native, "من کتاب دارم")).toBe(true);
    expect(retypeMatches("fa", native, "کتاب دارم")).toBe(true);
    expect(retypeMatches("en", english, "I've got a book")).toBe(true);
  });

  it("rejects a wrong retype and an empty one", () => {
    expect(retypeMatches("fa", native, "تو کتاب داری")).toBe(false);
    expect(retypeMatches("en", english, "I have a cat")).toBe(false);
    expect(retypeMatches("fa", native, "   ")).toBe(false);
  });

  it("compares exactly as the exercise does, forgiven typos included", () => {
    expect(checkAnswer("fa", native, "من کتاو دارم").verdict).toBe("accepted_with_correction");
    expect(retypeMatches("fa", native, "من کتاو دارم")).toBe(true);
  });

  it("leaves the exercise and the original answer's grading untouched", () => {
    const exercise = Object.freeze({ ...native, answer: Object.freeze([...native.answer]) as string[] });
    const before = checkAnswer("fa", exercise, "تو کتاب داری");
    retypeMatches("fa", exercise, "من کتاب دارم");
    expect(checkAnswer("fa", exercise, "تو کتاب داری")).toEqual(before);
    expect(before.verdict).toBe("incorrect");
  });
});
