import { describe, expect, it } from "vitest";
import { storyLine, storyLines } from "./storyLines";
import type { ExerciseArtifact } from "../types/content";

const exercise = (fields: Partial<ExerciseArtifact>): ExerciseArtifact =>
  ({ type: "type_in", scriptMode: "native", prompt: "", tiles: null, answer: [], tags: [], ...fields }) as ExerciseArtifact;

describe("storyLine", () => {
  it("takes a Persian prompt, with the prompt's own recording", () => {
    const audio = { v1: ["a.mp3"] };
    const line = storyLine(
      exercise({ type: "word_bank", prompt: "ما غذا می‌خوایم", tiles: ["we want", "food"], answer: ["we want", "food"], promptAudio: audio, promptRomanization: "mā ghazā" }),
      "fa",
    );
    expect(line).toMatchObject({ text: "ما غذا می‌خوایم", audio, romanization: "mā ghazā" });
  });

  it("takes the Persian answer when the prompt is English, with the answer's recording", () => {
    const audio = { v1: ["b.mp3"] };
    const line = storyLine(
      exercise({ prompt: "Sara is very hungry", answer: ["سارا خیلی گرسنه است", "سارا خیلی گرسنه‌ست"], answerAudio: audio, answerRomanization: "Sārā" }),
      "fa",
    );
    expect(line).toMatchObject({ text: "سارا خیلی گرسنه است", audio, romanization: "Sārā" });
  });

  it("joins a word bank's tokens for its answer", () => {
    const line = storyLine(exercise({ type: "word_bank", prompt: "Ali wants a sandwich", tiles: ["علی", "ساندویچ", "می‌خواهد"], answer: ["علی", "ساندویچ", "می‌خواهد"] }), "fa");
    expect(line?.text).toBe("علی ساندویچ می‌خواهد");
  });

  it("is null for a line with nothing in the course language", () => {
    expect(storyLine(exercise({ prompt: "Hello", answer: ["Hi"] }), "fa")).toBeNull();
  });

  it("is null when the course isn't known", () => {
    expect(storyLine(exercise({ prompt: "سلام" }), null)).toBeNull();
  });

  it("carries no audio when none is recorded", () => {
    expect(storyLine(exercise({ prompt: "سلام" }), "fa")?.audio).toBeNull();
  });
});

describe("storyLines", () => {
  it("keeps authored order and drops lines with no course-language sentence", () => {
    const lines = storyLines([exercise({ prompt: "سلام" }), exercise({ prompt: "Hi", answer: ["Yo"] }), exercise({ prompt: "Bye", answer: ["خداحافظ"] })], "fa");
    expect(lines.map((line) => line.text)).toEqual(["سلام", "خداحافظ"]);
  });
});
