import { describe, expect, it } from "vitest";
import { checkAnswer, closestAnswerFirst } from "./answerFeedback";
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

  it("gives no spacing note when a letter is wrong too", () => {
    expect(checkAnswer("fa", typeIn, "تو میخرم").note).toBeNull();
  });

  it("notes a speak exercise's spacing too, while its answer is typed", () => {
    expect(plain(checkAnswer("fa", exercise("speak", typeIn.answer), "من میخرم").note)).toBe("Needs a half-space after می.");
  });
});

describe("checkAnswer's typo note (issue #42)", () => {
  it("names the word a forgiven typo was in, with its right spelling", () => {
    const feedback = checkAnswer("fa", exercise("type_in", ["من کتاب دارم"]), "من کتاو دارم");
    expect(feedback.verdict).toBe("accepted_with_correction");
    expect(plain(feedback.note)).toBe("Close — a small typo: کتاب, not کتاو.");
  });

  it("ignores reading aids on the accepted answer when naming the word", () => {
    expect(plain(checkAnswer("fa", exercise("type_in", ["کِتابِ مَن"]), "کتاو من").note)).toBe("Close — a small typo: کتاب, not کتاو.");
  });

  it("names a romanized typo's word", () => {
    const romanized = { ...exercise("type_in", ["man ketab daram"]), scriptMode: "romanized" as const };
    expect(plain(checkAnswer("fa", romanized, "man ketob daram").note)).toBe("Close — romanization spelling, a small typo: ketab, not ketob.");
  });

  it("gives the whole answer when a romanized typo moved a space", () => {
    const romanized = { ...exercise("type_in", ["man ketab daram"]), scriptMode: "romanized" as const };
    expect(plain(checkAnswer("fa", romanized, "man ketabdaram").note)).toBe("Close — romanization spelling, a small typo: it's man ketab daram.");
  });
});

describe("closestAnswerFirst (issue #42)", () => {
  it("puts the answer nearest the submission first", () => {
    expect(closestAnswerFirst("I have a book", ["I've got a book", "I have a book.", "I own a book"])).toEqual([
      "I have a book.",
      "I own a book",
      "I've got a book",
    ]);
  });

  it("keeps the authored order for ties and an empty submission", () => {
    expect(closestAnswerFirst("", ["b", "a"])).toEqual(["b", "a"]);
    expect(closestAnswerFirst("c", ["b", "a"])).toEqual(["b", "a"]);
  });
});
