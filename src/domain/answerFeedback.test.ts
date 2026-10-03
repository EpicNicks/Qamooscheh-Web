import { describe, expect, it } from "vitest";
import { checkAnswer } from "./answerFeedback";
import type { ExerciseArtifact } from "../types/content";

const ZWNJ = "‌";
/** Strips the bidi isolates the note wraps a Persian word in. */
const plain = (note: string | null) => note?.replace(/[⁨⁩]/g, "") ?? null;

function exercise(type: ExerciseArtifact["type"], answer: string[]): Pick<ExerciseArtifact, "type" | "scriptMode" | "answer" | "alternativeAnswers"> {
  return { type, scriptMode: "native", answer, alternativeAnswers: null };
}

describe("checkAnswer's spacing note (issue #39)", () => {
  const typeIn = exercise("type_in", [`من می${ZWNJ}خرم`]);

  it("marks a missing half-space wrong and says exactly where it goes", () => {
    const feedback = checkAnswer("fa", typeIn, "من میخرم");
    expect(feedback.verdict).toBe("incorrect");
    expect(plain(feedback.note)).toBe("Needs a half-space after می.");
  });

  it("names a space typed in a half-space's place, and every place that's off", () => {
    expect(plain(checkAnswer("fa", typeIn, "من می خرم").note)).toBe("Needs a half-space, not a space, after می.");
    expect(plain(checkAnswer("fa", typeIn, "منمیخرم").note)).toBe("Needs a space after من; a half-space after می.");
  });

  it("gives no spacing note when a letter is wrong too, or for a spoken answer", () => {
    expect(checkAnswer("fa", typeIn, "تو میخرم").note).toBeNull();
    expect(checkAnswer("fa", exercise("speak", typeIn.answer), "من میخرم").note).toBeNull();
  });
});
