// What a story chapter reads as in the reader. A chapter is a run of
// exercises, and which side of each holds the course-language sentence varies:
// a word bank over a Persian prompt has it as the prompt, a type-in over an
// English one has it as the answer. The reader shows only that sentence, with
// its own recording and romanization; an exercise with no course-language
// sentence at all (an English-only line) isn't part of it.
import { getLanguageInfo, getSpeechLang } from "./language";
import { shownAnswerVariant, variantAudio } from "./answerVariants";
import type { AudioMap, ExerciseArtifact } from "../types/content";

export interface StoryLine {
  /** The course-language sentence. */
  text: string;
  romanization: string | null;
  /** Recordings of `text`, by voice — null when none is recorded. */
  audio: AudioMap | null;
  /** The exercise's lexeme tags: how its words are found for hints and saving. */
  tags: readonly string[];
  /** Who says the line (audio.json's `speakers`), for choosing its voice. */
  speaker: string | null;
}

/** The chapter's lines, in authored order, or `null` for an exercise with no course-language sentence. */
export function storyLine(exercise: ExerciseArtifact, courseCode: string | null | undefined): StoryLine | null {
  const courseLang = getLanguageInfo(courseCode)?.speechLang ?? null;
  if (!courseLang) return null;
  const inCourseLanguage = (text: string) => !!text && getSpeechLang(courseCode, text) === courseLang;

  if (inCourseLanguage(exercise.prompt)) {
    return {
      text: exercise.prompt,
      romanization: exercise.promptRomanization ?? null,
      audio: exercise.promptAudio ?? null,
      tags: exercise.tags,
      speaker: exercise.speaker ?? null,
    };
  }
  const shown = shownAnswerVariant(exercise, undefined);
  if (!inCourseLanguage(shown.text)) return null;
  return {
    text: shown.text,
    romanization: exercise.answerRomanization ?? null,
    audio: variantAudio(exercise, shown.index),
    tags: exercise.tags,
    speaker: exercise.speaker ?? null,
  };
}

export function storyLines(exercises: readonly ExerciseArtifact[], courseCode: string | null | undefined): StoryLine[] {
  return exercises.flatMap((exercise) => storyLine(exercise, courseCode) ?? []);
}
