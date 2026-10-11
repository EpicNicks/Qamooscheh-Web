import { describe, expect, it } from "vitest";
import { needsRetype, retypeMatches } from "./retype";
import { checkAnswer } from "./answerFeedback";
import { accepted, correct, fakeGrader } from "../grader/fakeGrader";
import type { ExerciseArtifact } from "../types/content";

type Checked = Pick<ExerciseArtifact, "type" | "scriptMode" | "answer" | "alternativeAnswers">;

const native: Checked = { type: "type_in", scriptMode: "native", answer: ["من کتاب دارم", "کتاب دارم"], alternativeAnswers: null };
// Answers like the real grader: any accepted answer is right, "من کتاو دارم" is
// a forgiven typo of the first, and nothing else is.
const grader = fakeGrader(({ submitted, acceptedAnswers }) =>
  acceptedAnswers.includes(submitted) ? correct(submitted) : submitted === "من کتاو دارم" ? accepted(acceptedAnswers[0], ["EditDistanceTypo"]) : {},
);

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
    expect(retypeMatches(grader, "fa", native, "من کتاب دارم")).toBe(true);
    expect(retypeMatches(grader, "fa", native, "کتاب دارم")).toBe(true);
    expect(retypeMatches(grader, "en", english, "I've got a book")).toBe(true);
  });

  it("rejects a wrong retype and an empty one", () => {
    expect(retypeMatches(grader, "fa", native, "تو کتاب داری")).toBe(false);
    expect(retypeMatches(grader, "en", english, "I have a cat")).toBe(false);
    expect(retypeMatches(grader, "fa", native, "   ")).toBe(false);
  });

  it("compares exactly as the exercise does, forgiven typos included", () => {
    expect(checkAnswer(grader, "fa", native, "من کتاو دارم").verdict).toBe("accepted_with_correction");
    expect(retypeMatches(grader, "fa", native, "من کتاو دارم")).toBe(true);
  });

  it("leaves the exercise and the original answer's grading untouched", () => {
    const exercise = Object.freeze({ ...native, answer: Object.freeze([...native.answer]) as string[] });
    const before = checkAnswer(grader, "fa", exercise, "تو کتاب داری");
    retypeMatches(grader, "fa", exercise, "من کتاب دارم");
    expect(checkAnswer(grader, "fa", exercise, "تو کتاب داری")).toEqual(before);
    expect(before.verdict).toBe("incorrect");
  });
});
