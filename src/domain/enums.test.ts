import { describe, expect, it } from "vitest";
import { EXERCISE_TYPES, isKnownExerciseType } from "./enums";

describe("isKnownExerciseType", () => {
  it("accepts every type this build renders", () => {
    for (const type of EXERCISE_TYPES) expect(isKnownExerciseType(type)).toBe(true);
  });

  it("rejects a type a newer backend added", () => {
    expect(isKnownExerciseType("listen_translate")).toBe(false);
    expect(isKnownExerciseType("")).toBe(false);
  });
});
