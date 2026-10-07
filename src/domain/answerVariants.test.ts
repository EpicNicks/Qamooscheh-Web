import { describe, expect, it } from "vitest";
import { shownAnswerVariant, variantAudio } from "./answerVariants";
import { pickRecording } from "./recordings";
import type { ExerciseArtifact } from "../types/content";

const base = { tiles: null, alternativeAnswers: null } as const;
const a0 = { setareh: ["a0.mp3"] };
const a2 = { setareh: ["a2.mp3"], hooman: ["h2.mp3"] };

describe("shownAnswerVariant", () => {
  const typeIn: Pick<ExerciseArtifact, "type" | "tiles" | "answer" | "alternativeAnswers" | "answerAudio" | "answerVariantAudio"> = {
    ...base,
    type: "type_in",
    answer: ["سلام", "درود", "های"],
  };

  it("shows the variant closest to the submission, by its index in answer", () => {
    expect(shownAnswerVariant(typeIn, "های")).toEqual({ index: 2, text: "های" });
    expect(shownAnswerVariant(typeIn, "درود")).toEqual({ index: 1, text: "درود" });
  });

  it("keeps the first answer with no submission", () => {
    expect(shownAnswerVariant(typeIn, undefined)).toEqual({ index: 0, text: "سلام" });
  });

  it("indexes a word bank's alternative orders after the primary one", () => {
    const bank = { ...base, type: "word_bank" as const, tiles: ["a", "b", "c"], answer: ["a", "b"], alternativeAnswers: [["b", "a"], ["c", "a"]] };
    expect(shownAnswerVariant(bank, "a b")).toEqual({ index: 0, text: "a b" });
    expect(shownAnswerVariant(bank, "b a")).toEqual({ index: 1, text: "b a" });
    expect(shownAnswerVariant(bank, "c a")).toEqual({ index: 2, text: "c a" });
  });
});

describe("variantAudio", () => {
  it("uses the shown variant's recording", () => {
    expect(variantAudio({ answerAudio: a0, answerVariantAudio: [a0, null, a2] }, 2)).toBe(a2);
  });

  it("falls back to answerAudio when the field is missing or null", () => {
    expect(variantAudio({ answerAudio: a0 }, 1)).toBe(a0);
    expect(variantAudio({ answerAudio: a0, answerVariantAudio: null }, 1)).toBe(a0);
  });

  it("falls back to answerAudio for a null, empty or absent entry", () => {
    const variants = [a0, null, {}, { setareh: [] }];
    for (const index of [1, 2, 3, 9]) expect(variantAudio({ answerAudio: a0, answerVariantAudio: variants }, index)).toBe(a0);
  });

  it("is null, not a crash, when nothing at all is recorded", () => {
    expect(variantAudio({ answerVariantAudio: [null, null] }, 1)).toBeNull();
    expect(pickRecording(variantAudio({}, 0), { preferredVoice: null, defaultVoice: "setareh" })).toBeNull();
  });

  it("keeps voice selection on the variant's own voice map", () => {
    const audio = variantAudio({ answerAudio: a0, answerVariantAudio: [a0, a2] }, 1);
    expect(pickRecording(audio, { preferredVoice: "hooman", defaultVoice: "setareh" })).toBe("h2.mp3");
    expect(pickRecording(audio, { preferredVoice: "ali", defaultVoice: "setareh" })).toBe("a2.mp3");
  });
});
