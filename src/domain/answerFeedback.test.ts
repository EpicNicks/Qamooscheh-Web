import { describe, expect, it } from "vitest";
import { checkAnswer, closestAnswerFirst } from "./answerFeedback";
import { accepted, correct, fakeGrader } from "../grader/fakeGrader";
import type { SeparatorEdit } from "../grader/types";
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

  it("explains a hint-halved award from the grader's reasons", () => {
    const grader = fakeGrader(() => ({ ...correct("x", 5), xpBase: 10, xpReasons: ["first_try", "hint_halved"] }));
    expect(checkAnswer(grader, "fa", exercise("type_in", ["x"]), "x", { usedHint: true }).xpNote).toBe("Hint used: half of the 10 XP for a first try.");
  });
});

describe("checkAnswer's verdict and XP", () => {
  const typeIn = exercise("type_in", ["x"]);

  it("takes both from the grader's response", () => {
    expect(checkAnswer(fakeGrader(() => correct("x", 10)), "fa", typeIn, "x")).toEqual({ verdict: "correct", note: null, xp: 10, xpNote: null, separators: null });
    expect(checkAnswer(fakeGrader(() => accepted("x", [])), "fa", typeIn, "x")).toMatchObject({ verdict: "accepted_with_correction", xp: 7 });
    expect(checkAnswer(fakeGrader(() => ({})), "fa", typeIn, "y")).toEqual({ verdict: "incorrect", note: null, xp: 0, xpNote: null, separators: null });
  });

  it("falls back to an exact match, with no XP, without a grader", () => {
    expect(checkAnswer(null, "fa", typeIn, " X ")).toEqual({ verdict: "correct", note: null, xp: 0, xpNote: null, separators: null });
    expect(checkAnswer(null, "fa", typeIn, "y").verdict).toBe("incorrect");
    const wordBank = { ...exercise("word_bank", ["من", "کتاب"]), alternativeAnswers: [["کتاب", "من"]] };
    expect(checkAnswer(null, "fa", wordBank, "کتاب من").verdict).toBe("correct");
    expect(checkAnswer(null, "fa", wordBank, "من من").verdict).toBe("incorrect");
  });

  it("falls back the same way when the grader can't interpret the request", () => {
    const grader = fakeGrader(() => ({ verdict: null, error: "unknown exerciseType 'Nope'." }));
    expect(checkAnswer(grader, "fa", typeIn, "x")).toEqual({ verdict: "correct", note: null, xp: 0, xpNote: null, separators: null });
  });
});

describe("checkAnswer's spacing hint (issue #39)", () => {
  const matched = `من می${ZWNJ}خرم`;
  const typeIn = exercise("type_in", [matched]);
  const withEdits = (separatorEdits: SeparatorEdit[]) => fakeGrader(() => ({ ...accepted(matched, ["ZwnjOrSpacing"]), separatorEdits }));
  const missingZwnj: SeparatorEdit = { kind: "missingZwnj", index: 5, length: 1 };

  it("accepts a missing half-space with a hint naming where it goes, and keeps the grader's edits", () => {
    const feedback = checkAnswer(withEdits([missingZwnj]), "fa", typeIn, "من میخرم");
    expect(feedback.verdict).toBe("accepted_with_correction");
    expect(feedback.xp).toBe(7);
    expect(plain(feedback.note)).toBe("Close — the half-space (ZWNJ) was off: needs a half-space after می.");
    expect(feedback.separators).toEqual({ matchedAnswer: matched, edits: [missingZwnj] });
  });

  it("words each kind of edit from the grader's offsets", () => {
    const note = (edits: SeparatorEdit[]) => plain(checkAnswer(withEdits(edits), "fa", typeIn, "x").note);
    expect(note([{ kind: "spaceForZwnj", index: 5, length: 1 }])).toBe("Close — the half-space (ZWNJ) was off: needs a half-space, not a space, after می.");
    expect(note([{ kind: "missingSpace", index: 2, length: 1 }])).toBe("Close — the half-space (ZWNJ) was off: needs a space after من.");
    expect(note([{ kind: "extraZwnj", index: 2, length: 0 }])).toBe("Close — the half-space (ZWNJ) was off: needs no half-space after من.");
    expect(note([{ kind: "missingSpace", index: 2, length: 1 }, missingZwnj])).toBe(
      "Close — the half-space (ZWNJ) was off: needs a space after من; a half-space after می.",
    );
  });

  it("names the word after an edit at a word's start", () => {
    expect(plain(checkAnswer(withEdits([{ kind: "extraSpace", index: 0, length: 0 }]), "fa", typeIn, "x").note)).toBe(
      "Close — the half-space (ZWNJ) was off: needs no space before من.",
    );
  });

  it("falls back to the reason alone without edits, and has no separators then", () => {
    const feedback = checkAnswer(withEdits([]), "fa", typeIn, "من میخرم");
    expect(feedback.note).toBe("Close — the half-space (ZWNJ) was off.");
    expect(feedback.separators).toBeNull();
  });

  it("gives a wrong answer no spacing note", () => {
    expect(checkAnswer(fakeGrader(() => ({})), "fa", typeIn, "من میخرم")).toMatchObject({ verdict: "incorrect", note: null, separators: null });
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
