// What a remix holds (issue #45): the learner picks, before it starts,
// whether a remix keeps every exercise it would build or only one kind. The
// filter runs client-side over the exercises the remix already built, by
// render type (the mode an exercise will actually show in, after
// exerciseResolution.ts) — never by changing what the server is asked for —
// so submission, XP and review credit are the same as for an unfiltered
// remix: the learner just answers fewer kinds of exercise.
import type { ExerciseType } from "./enums";

export type RemixContents = "all" | "type_in" | "word_bank" | "flashcards" | "flashcards_and_all" | "cloze";

export const REMIX_CONTENTS_LABELS: Record<RemixContents, string> = {
  all: "All exercises",
  type_in: "Typing only",
  word_bank: "Word bank only",
  flashcards: "Flashcards only",
  flashcards_and_all: "Flashcards + all exercises",
  cloze: "Fill in the blank",
};

/** The choices a remix can offer: the flashcard ones only where it has flashcards at all; fill in the blank (issue #105) always. */
export function remixContentsOptions(hasFlashcards: boolean): RemixContents[] {
  return hasFlashcards ? ["all", "type_in", "word_bank", "flashcards", "flashcards_and_all", "cloze"] : ["all", "type_in", "word_bank", "cloze"];
}

/**
 * A fill-in-the-blank Repack (issue #105) is not a filter over the remix's
 * exercises: its whole round is cloze cards (domain/cloze.ts), run and
 * submitted as a cloze round, so the exercise queue never starts.
 */
export function isClozeContents(contents: RemixContents): boolean {
  return contents === "cloze";
}

/** `remembered` when this remix offers it, else `fallback` — a choice saved on a remix with flashcards can't apply to one without. */
export function initialRemixContents(remembered: RemixContents, options: readonly RemixContents[], fallback: RemixContents): RemixContents {
  return options.includes(remembered) ? remembered : fallback;
}

export function includesFlashcards(contents: RemixContents): boolean {
  return contents === "flashcards" || contents === "flashcards_and_all";
}

export function includesExercise(contents: RemixContents, renderType: ExerciseType): boolean {
  switch (contents) {
    case "all":
    case "flashcards_and_all":
      return true;
    case "flashcards":
    case "cloze":
      return false;
    case "type_in":
    case "word_bank":
      return renderType === contents;
  }
}

/**
 * Keeps the exercises `contents` allows, THEN caps the result at `max` — in
 * that order, so a filtered remix is still full whenever enough matching
 * exercises exist further down the built queue.
 */
export function filterRemixExercises<T extends { renderType: ExerciseType }>(
  exercises: readonly T[],
  contents: RemixContents,
  max: number = Infinity,
): T[] {
  return exercises.filter((exercise) => includesExercise(contents, exercise.renderType)).slice(0, max);
}
