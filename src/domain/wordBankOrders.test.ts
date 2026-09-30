import { describe, expect, it } from "vitest";
import { checkAnswer } from "./answerFeedback";
import { closestTileOrder, gradeTiles, missingBankTiles, revealedTileOrder } from "./wordBankOrders";
import type { ExerciseArtifact } from "../types/content";

// "I go to school tomorrow": the pronoun is optional and the time word can
// sit either side of it.
const exercise: ExerciseArtifact = {
  type: "word_bank",
  scriptMode: "native",
  prompt: "I go to school tomorrow",
  tiles: ["من", "فردا", "به", "مدرسه", "می‌روم", "کتاب"],
  answer: ["من", "فردا", "به", "مدرسه", "می‌روم"],
  alternativeAnswers: [
    ["فردا", "من", "به", "مدرسه", "می‌روم"],
    ["فردا", "به", "مدرسه", "می‌روم"],
  ],
  tags: [],
};

describe("gradeTiles", () => {
  it("marks exactly one swapped pair yellow", () => {
    expect(gradeTiles(["b", "a", "c"], ["a", "b", "c"])).toEqual(["swapped", "swapped", "right"]);
  });

  it("marks only tiles outside the longest common subsequence red", () => {
    expect(gradeTiles(["x", "a", "b", "c"], ["a", "b", "c"])).toEqual(["wrong", "right", "right", "right"]);
  });
});

describe("closestTileOrder", () => {
  it("prefers the authored answer on a tie", () => {
    const { order } = closestTileOrder(["a"], [["a", "b"], ["a", "c"]]);
    expect(order).toEqual(["a", "b"]);
  });

  it("picks an alternative the submission is one swap away from", () => {
    // Swapping "به" and "مدرسه" in the first alternative.
    const submitted = ["فردا", "من", "مدرسه", "به", "می‌روم"];
    const { order, marks } = closestTileOrder(submitted, [exercise.answer, ...exercise.alternativeAnswers!]);
    expect(order).toEqual(exercise.alternativeAnswers![0]);
    expect(marks).toEqual(["right", "right", "swapped", "swapped", "right"]);
  });

  it("measures a pronoun-less submission against the pronoun-less order", () => {
    const submitted = ["فردا", "به", "مدرسه", "کتاب", "می‌روم"];
    const { order, marks } = closestTileOrder(submitted, [exercise.answer, ...exercise.alternativeAnswers!]);
    expect(order).toEqual(exercise.alternativeAnswers![1]);
    expect(marks).toEqual(["right", "right", "right", "wrong", "right"]);
  });
});

describe("revealedTileOrder", () => {
  it("reveals the order the submission is closest to", () => {
    expect(revealedTileOrder(exercise, "فردا من مدرسه به می‌روم")).toEqual(exercise.alternativeAnswers![0]);
  });

  it("falls back to the authored answer without alternatives or a recoverable submission", () => {
    expect(revealedTileOrder({ ...exercise, alternativeAnswers: null }, "فردا من مدرسه به می‌روم")).toEqual(exercise.answer);
    expect(revealedTileOrder(exercise, "nonsense")).toEqual(exercise.answer);
    expect(revealedTileOrder(exercise, undefined)).toEqual(exercise.answer);
  });
});

describe("checkAnswer with alternative orders", () => {
  it.each(["fa", "en"])("accepts every listed order (%s)", (course) => {
    for (const order of [exercise.answer, ...exercise.alternativeAnswers!]) {
      expect(checkAnswer(course, exercise, order.join(" ")).verdict).toBe("correct");
    }
    expect(checkAnswer(course, exercise, "به فردا مدرسه می‌روم").verdict).toBe("incorrect");
  });
});

describe("missingBankTiles", () => {
  const tiles = exercise.tiles!;

  it("outlines the bank tiles the closest order still needed", () => {
    // Submitted "من به مدرسه" — فردا and می‌روم were left in the bank, کتاب is a decoy.
    const submitted = ["من", "به", "مدرسه"];
    const { order, marks } = closestTileOrder(submitted, [exercise.answer, ...exercise.alternativeAnswers!]);
    expect(missingBankTiles(tiles, [1, 4, 5], submitted, marks, order)).toEqual(new Set([1, 4]));
  });

  it("outlines nothing once every needed tile was used", () => {
    const submitted = exercise.answer;
    const marks = gradeTiles(submitted, exercise.answer);
    expect(missingBankTiles(tiles, [5], submitted, marks, exercise.answer).size).toBe(0);
  });

  it("still outlines a needed tile whose only submitted copy was marked wrong", () => {
    const repeated = ["a", "b", "a"];
    const submitted = ["b", "a"];
    const marks = gradeTiles(submitted, repeated);
    // One "a" of the two the order needs is placed; the other is in the bank.
    expect(missingBankTiles(["a", "b", "a"], [2], submitted, marks, repeated)).toEqual(new Set([2]));
  });
});
