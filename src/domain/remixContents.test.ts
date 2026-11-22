import { describe, expect, it } from "vitest";
import type { ExerciseType } from "./enums";
import { composeRemix, filterRemixExercises, includesExercise, includesFlashcards, initialRemixContents, isClozeContents, remixContentsOptions } from "./remixContents";

function exercises(...types: ExerciseType[]) {
  return types.map((renderType, index) => ({ id: index, renderType }));
}

describe("filterRemixExercises", () => {
  const built = exercises("word_bank", "type_in", "match", "word_bank", "speak", "type_in");

  it("keeps everything for all exercises", () => {
    expect(filterRemixExercises(built, "all")).toEqual(built);
    expect(filterRemixExercises(built, "flashcards_and_all")).toEqual(built);
  });

  it("keeps only the chosen render type", () => {
    expect(filterRemixExercises(built, "type_in").map((e) => e.id)).toEqual([1, 5]);
    expect(filterRemixExercises(built, "word_bank").map((e) => e.id)).toEqual([0, 3]);
  });

  it("keeps no exercises for flashcards only", () => {
    expect(filterRemixExercises(built, "flashcards")).toEqual([]);
  });

  it("filters before capping, so matches past the cap still fill it", () => {
    const many = exercises("word_bank", "word_bank", "word_bank", "type_in", "type_in", "type_in");
    expect(filterRemixExercises(many, "type_in", 2).map((e) => e.id)).toEqual([3, 4]);
    expect(filterRemixExercises(many, "all", 2).map((e) => e.id)).toEqual([0, 1]);
  });

  it("can leave nothing", () => {
    expect(filterRemixExercises(exercises("word_bank"), "type_in", 20)).toEqual([]);
  });
});

describe("remix contents options", () => {
  it("offers the flashcard choices only when the remix has flashcards", () => {
    expect(remixContentsOptions(false)).toEqual(["all", "type_in", "word_bank", "cloze"]);
    expect(remixContentsOptions(true)).toHaveLength(6);
    expect(remixContentsOptions(true)).toContain("cloze");
  });

  it("falls back when the remembered choice isn't offered", () => {
    expect(initialRemixContents("flashcards", remixContentsOptions(false), "all")).toBe("all");
    expect(initialRemixContents("type_in", remixContentsOptions(false), "all")).toBe("type_in");
  });

  it("says which choices include flashcards and which exercises", () => {
    expect(includesFlashcards("flashcards")).toBe(true);
    expect(includesFlashcards("flashcards_and_all")).toBe(true);
    expect(includesFlashcards("all")).toBe(false);
    expect(includesExercise("type_in", "match")).toBe(false);
    expect(includesExercise("all", "speak")).toBe(true);
  });
});

describe("cloze contents", () => {
  it("holds no exercises or flashcards of its own", () => {
    expect(filterRemixExercises(exercises("type_in", "word_bank"), "cloze")).toEqual([]);
    expect(includesFlashcards("cloze")).toBe(false);
    expect(isClozeContents("cloze")).toBe(true);
    expect(isClozeContents("all")).toBe(false);
  });
});

describe("composeRemix", () => {
  const ex = (key: string, renderType: ExerciseType) => ({ key, renderType });
  const rough = [ex("u/s/1", "type_in"), ex("u/s/2", "word_bank")];
  const topics = [ex("u/s/1", "type_in"), ex("a/b/0", "type_in"), ex("a/b/1", "word_bank"), ex("a/b/2", "type_in")];

  it("is filterRemixExercises when nothing is rough", () => {
    expect(composeRemix([], topics, "all", 2)).toEqual(topics.slice(0, 2));
  });

  it("puts rough spots first, plays a shared exercise once, and caps only the topics", () => {
    expect(composeRemix(rough, topics, "all", 2).map((e) => e.key)).toEqual(["u/s/1", "u/s/2", "a/b/0", "a/b/1"]);
  });

  it("applies the contents filter to both parts", () => {
    expect(composeRemix(rough, topics, "type_in").map((e) => e.key)).toEqual(["u/s/1", "a/b/0", "a/b/2"]);
  });

  it("works with rough spots alone", () => {
    expect(composeRemix(rough, [], "all", 20)).toEqual(rough);
  });
});
