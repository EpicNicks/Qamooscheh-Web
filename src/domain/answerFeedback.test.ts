import { describe, expect, it } from "vitest";
import { checkAnswer, closestAnswerFirst } from "./answerFeedback";
import { accepted, correct, fakeGrader } from "../grader/fakeGrader";
import type { ExerciseArtifact } from "../types/content";

const ZWNJ = "‌";
/** Strips the bidi isolates the note wraps a Persian word in. */
const plain = (note: string | null) => note?.replace(/[⁨⁩]/g, "") ?? null;

function exercise(type: ExerciseArtifact["type"], answer: string[]): Pick<ExerciseArtifact, "type" | "scriptMode" | "answer" | "alternativeAnswers"> {
  return { type, scriptMode: "native", answer, alternativeAnswers: null };
}

describe("checkAnswer's request", () => {
  it("sends the exercise in the grader's own spelling, with what the XP depends on", () => {
    const grader = fakeGrader(() => correct("x"));
    const romanized = { ...exercise("type_in", ["man ketab daram"]), scriptMode: "romanized" as const };
    checkAnswer(grader, "fa", romanized, "man ketab daram", { attempt: 2, usedHint: true });
    checkAnswer(grader, "fa", exercise("speak", ["سلام"]), "سلام");
    expect(grader.requests).toEqual([
      { exerciseType: "TypeIn", scriptMode: "Romanized", submitted: "man ketab daram", acceptedAnswers: ["man ketab daram"], attempt: 2, usedHint: true },
      { exerciseType: "Speak", scriptMode: "Native", submitted: "سلام", acceptedAnswers: ["سلام"] },
    ]);
  });

  it("hands a selection its ordered tiles and the other correct orders, for the grader to join", () => {
    const grader = fakeGrader(() => correct("x"));
    const wordBank = { ...exercise("word_bank", ["من", "کتاب", "دارم"]), alternativeAnswers: [["کتاب", "دارم"]] };
    checkAnswer(grader, "fa", wordBank, "من کتاب دارم");
    expect(grader.requests[0]).toMatchObject({
      exerciseType: "WordBank",
      acceptedAnswers: ["من", "کتاب", "دارم"],
      alternativeAnswers: [["کتاب", "دارم"]],
    });
  });

  it("passes a retype's XP inputs through", () => {
    const grader = fakeGrader(() => correct("x", 2));
    const feedback = checkAnswer(grader, "fa", exercise("type_in", ["x"]), "x", { attempt: 1, usedHint: false, retype: true, retypeNumber: 2 });
    expect(grader.requests[0]).toMatchObject({ retype: true, retypeNumber: 2 });
    expect(feedback.xp).toBe(2);
  });
});

describe("checkAnswer's verdict and XP", () => {
  const typeIn = exercise("type_in", ["x"]);

  it("takes both from the grader's response", () => {
    expect(checkAnswer(fakeGrader(() => correct("x", 10)), "fa", typeIn, "x")).toEqual({ verdict: "correct", note: null, xp: 10 });
    expect(checkAnswer(fakeGrader(() => accepted("x", [])), "fa", typeIn, "x")).toMatchObject({ verdict: "accepted_with_correction", xp: 7 });
    expect(checkAnswer(fakeGrader(() => ({})), "fa", typeIn, "y")).toEqual({ verdict: "incorrect", note: null, xp: 0 });
  });

  it("falls back to an exact match, with no XP, without a grader", () => {
    expect(checkAnswer(null, "fa", typeIn, " X ")).toEqual({ verdict: "correct", note: null, xp: 0 });
    expect(checkAnswer(null, "fa", typeIn, "y").verdict).toBe("incorrect");
    const wordBank = { ...exercise("word_bank", ["من", "کتاب"]), alternativeAnswers: [["کتاب", "من"]] };
    expect(checkAnswer(null, "fa", wordBank, "کتاب من").verdict).toBe("correct");
    expect(checkAnswer(null, "fa", wordBank, "من من").verdict).toBe("incorrect");
  });

  it("falls back the same way when the grader can't interpret the request", () => {
    const grader = fakeGrader(() => ({ verdict: null, error: "unknown exerciseType 'Nope'." }));
    expect(checkAnswer(grader, "fa", typeIn, "x")).toEqual({ verdict: "correct", note: null, xp: 0 });
  });
});

describe("checkAnswer's spacing note (issue #39)", () => {
  const typeIn = exercise("type_in", [`من می${ZWNJ}خرم`]);
  const wrong = fakeGrader(() => ({}));

  it("says exactly where a half-space goes when the grader marks the answer wrong", () => {
    const feedback = checkAnswer(wrong, "fa", typeIn, "من میخرم");
    expect(feedback.verdict).toBe("incorrect");
    expect(plain(feedback.note)).toBe("Needs a half-space after می.");
  });

  it("names a space typed in a half-space's place, and every place that's off", () => {
    expect(plain(checkAnswer(wrong, "fa", typeIn, "من می خرم").note)).toBe("Needs a half-space, not a space, after می.");
    expect(plain(checkAnswer(wrong, "fa", typeIn, "منمیخرم").note)).toBe("Needs a space after من; a half-space after می.");
  });

  it("gives no spacing note when a letter is wrong too", () => {
    expect(checkAnswer(wrong, "fa", typeIn, "تو میخرم").note).toBeNull();
  });

  it("notes a speak exercise's spacing too, while its answer is typed", () => {
    expect(plain(checkAnswer(wrong, "fa", exercise("speak", typeIn.answer), "من میخرم").note)).toBe("Needs a half-space after می.");
  });

  it("gives none for another language or a romanized answer", () => {
    expect(checkAnswer(wrong, "ja", typeIn, "من میخرم").note).toBeNull();
    expect(checkAnswer(wrong, "fa", { ...typeIn, scriptMode: "romanized" }, "من میخرم").note).toBeNull();
  });

  it("adds where the half-space goes to a forgiven one", () => {
    const grader = fakeGrader(() => accepted(typeIn.answer[0], ["ZwnjOrSpacing"]));
    expect(plain(checkAnswer(grader, "fa", typeIn, "من میخرم").note)).toBe("Close — the half-space (ZWNJ) was off: needs a half-space after می.");
  });
});

describe("checkAnswer's reason notes", () => {
  it("words the Arabic-letter reason", () => {
    const grader = fakeGrader(() => accepted("کتاب", ["CodepointSubstitution"]));
    expect(checkAnswer(grader, "fa", exercise("type_in", ["کتاب"]), "كتاب").note).toBe("Close — used the Arabic form of a letter instead of the Persian one.");
  });

  it("says nothing for a reason it has no wording for, as the Japanese grader's", () => {
    const grader = fakeGrader(() => accepted("かな", ["VariantFormSubstitution"]));
    expect(checkAnswer(grader, "ja", exercise("type_in", ["かな"]), "かな").note).toBeNull();
  });
});

describe("checkAnswer's typo note (issue #42)", () => {
  it("names the word a forgiven typo was in, with its right spelling", () => {
    const grader = fakeGrader(() => accepted("من کتاب دارم", ["EditDistanceTypo"]));
    const feedback = checkAnswer(grader, "fa", exercise("type_in", ["من کتاب دارم"]), "من کتاو دارم");
    expect(feedback.verdict).toBe("accepted_with_correction");
    expect(plain(feedback.note)).toBe("Close — a small typo: کتاب, not کتاو.");
  });

  it("ignores reading aids on the accepted answer when naming the word", () => {
    const grader = fakeGrader(() => accepted("کِتابِ مَن", ["EditDistanceTypo"]));
    expect(plain(checkAnswer(grader, "fa", exercise("type_in", ["کِتابِ مَن"]), "کتاو من").note)).toBe("Close — a small typo: کتاب, not کتاو.");
  });

  it("names a romanized typo's word, romanization first", () => {
    const grader = fakeGrader(() => accepted("man ketab daram", ["EditDistanceTypo", "LatinizationVariance"]));
    const romanized = { ...exercise("type_in", ["man ketab daram"]), scriptMode: "romanized" as const };
    expect(plain(checkAnswer(grader, "fa", romanized, "man ketob daram").note)).toBe("Close — romanization spelling, a small typo: ketab, not ketob.");
  });

  it("gives the whole answer when a romanized typo moved a space", () => {
    const grader = fakeGrader(() => accepted("man ketab daram", ["EditDistanceTypo", "LatinizationVariance"]));
    const romanized = { ...exercise("type_in", ["man ketab daram"]), scriptMode: "romanized" as const };
    expect(plain(checkAnswer(grader, "fa", romanized, "man ketabdaram").note)).toBe("Close — romanization spelling, a small typo: it's man ketab daram.");
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
