import { describe, expect, it } from "vitest";
import { attemptWorth, buildClozeCard, buildClozeDeck, clozeResultLines, clozeSourcesForTags, clozeXp, gapLabel, gradeCloze, summarizeCloze } from "./cloze";
import { buildLexemeHintMap } from "./romanization";
import type { ExerciseArtifact, LexemeIndex, LexemeIndexEntry } from "../types/content";

function entry(gloss: string, extra: Partial<LexemeIndexEntry> = {}): LexemeIndexEntry {
  return { gloss, register: null, romanization: null, romanizationIsAuthored: false, ...extra };
}

const lexemes: LexemeIndex = {
  "من<pron>": entry("I"),
  "آب<n>": entry("water"),
  "تشنه<adj>": entry("thirsty"),
  "می‌خواهم<v>": entry("I want"),
  "خونه<n><spoken>": entry("house", { register: "spoken" }),
};
const hintMap = buildLexemeHintMap(lexemes);

function exercise(partial: Partial<ExerciseArtifact>): ExerciseArtifact {
  return { type: "type_in", scriptMode: "native", prompt: "", tiles: null, answer: [], tags: [], ...partial };
}

const thirsty = exercise({
  prompt: "I'm thirsty, I want water.",
  answer: ["من تشنه‌ام، آب می‌خواهم."],
  tags: ["من<pron>", "تشنه<adj>", "آب<n>", "می‌خواهم<v>"],
});

describe("gradeCloze", () => {
  const accepted = ["تشنه"];

  it("accepts the exact word, ignoring reading aids and Arabic letter variants", () => {
    expect(gradeCloze("تشنه", accepted, false)).toBe("exact");
    expect(gradeCloze("تَشنه", accepted, true)).toBe("exact");
    expect(gradeCloze("  تشنه ", accepted, true)).toBe("exact");
    expect(gradeCloze("كتاب", ["کتاب"], true)).toBe("exact");
  });

  it("forgives one wrong, missing, extra or swapped letter in regular mode", () => {
    expect(gradeCloze("تشنو", accepted, false)).toBe("typo");
    expect(gradeCloze("تشن", accepted, false)).toBe("typo");
    expect(gradeCloze("تششنه", accepted, false)).toBe("typo");
    expect(gradeCloze("شتنه", accepted, false)).toBe("typo");
  });

  it("forgives two letters in neither mode", () => {
    expect(gradeCloze("تشخو", accepted, false)).toBe("wrong");
    expect(gradeCloze("abc", accepted, false)).toBe("wrong");
  });

  it("forgives nothing in hardcore mode", () => {
    expect(gradeCloze("تشنو", accepted, true)).toBe("wrong");
    expect(gradeCloze("تشن", accepted, true)).toBe("wrong");
  });

  it("keeps a short word strict, where one letter makes a different word", () => {
    expect(gradeCloze("از", ["او"], false)).toBe("wrong");
    expect(gradeCloze("آب", ["آب"], false)).toBe("exact");
  });

  it("rejects an empty answer and takes any of several spellings", () => {
    expect(gradeCloze("   ", accepted, false)).toBe("wrong");
    expect(gradeCloze("خانه", ["خونه", "خانه"], true)).toBe("exact");
  });
});

describe("clozeXp", () => {
  it("pays 5, 3, 1 and then nothing by attempt", () => {
    expect([1, 2, 3, 4, 9].map((attempt) => clozeXp(attempt, true))).toEqual([5, 3, 1, 0, 0]);
  });

  it("pays nothing for a give-up", () => {
    expect(clozeXp(1, false)).toBe(0);
    expect(clozeXp(3, false)).toBe(0);
  });
});

describe("summarizeCloze", () => {
  it("counts cards by the attempt they ended on and totals the table's XP", () => {
    const results = [
      { tag: "a", correct: true, attempt: 1, elapsedMs: 1 },
      { tag: "b", correct: true, attempt: 2, elapsedMs: 1 },
      { tag: "c", correct: true, attempt: 3, elapsedMs: 1 },
      { tag: "d", correct: true, attempt: 5, elapsedMs: 1 },
      { tag: "e", correct: false, attempt: 2, elapsedMs: 1 },
    ];
    expect(summarizeCloze(results)).toEqual({ firstTry: 1, secondTry: 1, thirdTry: 1, later: 1, gaveUp: 1, maxXp: 9 });
  });
});

describe("buildClozeCard", () => {
  it("cuts the word out of the sentence and shows its meaning in the gap", () => {
    const card = buildClozeCard(thirsty, "آب<n>", hintMap, lexemes);
    expect(card).toMatchObject({ tag: "آب<n>", blankText: "آب", accepted: ["آب"], gapLabel: "water", english: "I'm thirsty, I want water." });
    expect(card!.before).toBe("من تشنه‌ام، ");
    expect(card!.after).toBe(" می‌خواهم.");
    expect(card!.contextTags).not.toContain("آب<n>");
  });

  it("reads the sentence from the answer when the prompt is the English side", () => {
    const fromPersian = exercise({ prompt: "آب می‌خواهم", answer: ["I want water"], tags: ["آب<n>", "می‌خواهم<v>"] });
    const card = buildClozeCard(fromPersian, "آب<n>", hintMap, lexemes);
    expect(card).toMatchObject({ before: "", english: "I want water", blankText: "آب" });
  });

  it("joins a word bank's tiles into the sentence", () => {
    const bank = exercise({ type: "word_bank", prompt: "I want water", answer: ["آب", "می‌خواهم"], tiles: ["می‌خواهم", "آب"], tags: ["آب<n>", "می‌خواهم<v>"] });
    expect(buildClozeCard(bank, "آب<n>", hintMap, lexemes)).toMatchObject({ before: "", after: " می‌خواهم" });
  });

  it("gives no card when the word is not in the sentence, or is in it twice", () => {
    expect(buildClozeCard(thirsty, "خونه<n><spoken>", hintMap, lexemes)).toBeNull();
    const twice = exercise({ prompt: "Water, water.", answer: ["آب، آب."], tags: ["آب<n>"] });
    expect(buildClozeCard(twice, "آب<n>", hintMap, lexemes)).toBeNull();
  });

  it("gives no card for an exercise that is not a sentence to type or build", () => {
    expect(buildClozeCard({ ...thirsty, type: "match" }, "آب<n>", hintMap, lexemes)).toBeNull();
    expect(buildClozeCard({ ...thirsty, type: "speak" }, "آب<n>", hintMap, lexemes)).toBeNull();
  });

  it("marks an informal word's gap", () => {
    const spoken = exercise({ prompt: "My house", answer: ["خونه من"], tags: ["خونه<n><spoken>", "من<pron>"] });
    expect(buildClozeCard(spoken, "خونه<n><spoken>", hintMap, lexemes)?.gapLabel).toBe("house [informal]");
  });
});

describe("gapLabel", () => {
  it("prefers the meaning that is in the English sentence, else the gloss without its asides", () => {
    expect(gapLabel(entry("he / she wants"), "She wants tea.")).toBe("she wants");
    expect(gapLabel(entry("cousin (father's brother's son)"), "I have a brother.")).toBe("cousin");
  });
});

describe("buildClozeDeck", () => {
  it("takes one card per word, skips a word with no usable sentence, and can pick among sentences", () => {
    const second = exercise({ prompt: "Water!", answer: ["آب!"], tags: ["آب<n>"] });
    const sources = [
      { tag: "آب<n>", exercises: [thirsty, second] },
      { tag: "خونه<n><spoken>", exercises: [thirsty] },
    ];
    const first = buildClozeDeck(sources, hintMap, lexemes);
    expect(first).toHaveLength(1);
    expect(first[0].english).toBe("I'm thirsty, I want water.");
    expect(buildClozeDeck(sources, hintMap, lexemes, (count) => count - 1)[0].english).toBe("Water!");
  });
});

describe("clozeSourcesForTags", () => {
  it("groups exercises by word in the order given, once per word, skipping words no exercise uses", () => {
    const water = exercise({ prompt: "Water!", answer: ["آب!"], tags: ["آب<n>"] });
    const sources = clozeSourcesForTags(["آب<n>", "من<pron>", "آب<n>", "خونه<n><spoken>"], [thirsty, water]);
    expect(sources.map((s) => s.tag)).toEqual(["آب<n>", "من<pron>"]);
    expect(sources[0].exercises).toEqual([thirsty, water]);
    expect(sources[1].exercises).toEqual([thirsty]);
  });
});

describe("attemptWorth", () => {
  it("shows what a retry is worth, and when it stops paying", () => {
    expect(attemptWorth(1)).toBe("Worth up to 5 XP.");
    expect(attemptWorth(2)).toBe("Not quite. Now worth up to 3 XP.");
    expect(attemptWorth(3)).toBe("Not quite. Now worth up to 1 XP.");
    expect(attemptWorth(4)).toBe("Not quite. This one no longer pays XP.");
  });
});

describe("clozeResultLines", () => {
  const summary = { firstTry: 2, secondTry: 1, thirdTry: 1, later: 0, gaveUp: 1, maxXp: 14 };

  it("breaks the round down by attempt and shows the XP the server returned", () => {
    const lines = clozeResultLines(summary, 4, 14);
    expect(lines.breakdown).toBe("2 on the first try (5 XP each), 1 on the second (3 XP), 1 on the third (1 XP), 1 skipped.");
    expect(lines.xp).toBe("+14 XP");
  });

  it("says so when the cooldown paid less than the table", () => {
    expect(clozeResultLines(summary, 4, 9).xp).toContain("+9 XP. Words you've practised a lot today pay less.");
  });

  it("covers a round that paid nothing, is still saving, or failed to save", () => {
    expect(clozeResultLines(summary, 4, 0).xp).toContain("No XP this round: those words");
    expect(clozeResultLines({ ...summary, firstTry: 0, secondTry: 0, thirdTry: 0, maxXp: 0 }, 0, 0).xp).toBe("No XP this round.");
    expect(clozeResultLines(summary, 4, null).xp).toBe("Saving your XP…");
    expect(clozeResultLines(summary, 4, undefined).xp).toBe("Couldn't save this round's XP.");
  });

  it("mentions answers that came later", () => {
    expect(clozeResultLines({ ...summary, later: 2 }, 4, 14).breakdown).toContain("2 later (no XP)");
  });
});
