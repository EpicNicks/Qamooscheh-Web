import { describe, expect, it } from "vitest";
import { xpForAnswer } from "./xp";
import type { AnswerVerdict } from "./answerFeedback";
// Copied as-is from the backend repo's
// tools/Qamooscheh.GraderBuilder/verify/xp-vectors.json (API_SPEC.md §2.3
// point 8's conformance table). Re-copy it when AnswerXp changes; both go
// when web issue #71 (WASI grader) lands.
import vectorsJson from "./xp-vectors.json?raw";

interface XpVector {
  name: string;
  verdict: "Correct" | "AcceptedWithCorrection" | "Incorrect";
  attempt: number;
  usedHint: boolean;
  retype: boolean;
  xp: number;
}

const VERDICTS: Record<XpVector["verdict"], AnswerVerdict> = {
  Correct: "correct",
  AcceptedWithCorrection: "accepted_with_correction",
  Incorrect: "incorrect",
};

const vectors = JSON.parse(vectorsJson) as XpVector[];

describe("xpForAnswer matches the backend's AnswerXp", () => {
  it("has vectors to check", () => {
    expect(vectors.length).toBeGreaterThan(0);
  });

  it.each(vectors.map((v) => [v.name, v] as const))("%s", (_, v) => {
    expect(xpForAnswer(VERDICTS[v.verdict], v.attempt, v.usedHint, v.retype)).toBe(v.xp);
  });
});
