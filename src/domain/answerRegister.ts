// The register an accepted answer is in (issue #54), read off the lexemes its
// words are. The published data has no per-answer register marking, so an
// answer is only as informal or formal as the words in it. Words are looked
// up by surface in the course's hint map (domain/romanization.ts), so a word
// that isn't a lexeme on its own (one with an ending attached) or an answer
// in Latin script reads from whichever of its words do match.
import type { Register } from "./enums";
import { registerLabel, type WordHint } from "./romanization";
import { acceptedTileOrders } from "./wordBankOrders";
import { closestAnswerFirst } from "./answerFeedback";
import type { ExerciseArtifact } from "../types/content";

/** Alternatives listed beside the answer given — enough to show the contrast without a list. */
const MAX_ALTERNATIVES = 2;

export interface AnswerRegisterNote {
  /** The given answer's register label ("informal"/"formal") — null when its words aren't specific to one. */
  label: string | null;
  /** Other accepted answers in a different, labelled register, closest to the given one first. */
  alternatives: { answer: string; label: string }[];
}

/**
 * Spoken if any word is spoken, otherwise the most marked register present
 * (written) — null when no word is specific to one. A "both" word is neutral.
 */
export function answerRegister(answer: string, hintMap: ReadonlyMap<string, WordHint>): Register | null {
  let register: Register | null = null;
  for (const word of answer.split(/\s+/)) {
    const hint = hintMap.get(word.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, ""));
    if (hint?.register === "spoken") return "spoken";
    if (hint?.register === "written") register = "written";
  }
  return register;
}

/**
 * The register of the answer the learner gave (the accepted answer nearest
 * their submission) and of the other accepted answers that are in another
 * one. Null when there's nothing to say: the given answer has no label and
 * no other is in a labelled register.
 */
export function describeAnswerRegister(
  exercise: Pick<ExerciseArtifact, "type" | "answer" | "alternativeAnswers">,
  submittedText: string,
  hintMap: ReadonlyMap<string, WordHint>,
): AnswerRegisterNote | null {
  const tokenized = exercise.type === "word_bank" || exercise.type === "match";
  const answers = tokenized ? acceptedTileOrders(exercise).map((order) => order.join(" ")) : exercise.answer;
  const [given, ...others] = closestAnswerFirst(submittedText, answers);
  if (given === undefined) return null;

  const label = registerLabel(answerRegister(given, hintMap));
  const alternatives: AnswerRegisterNote["alternatives"] = [];
  for (const answer of others) {
    const other = registerLabel(answerRegister(answer, hintMap));
    if (other && other !== label && alternatives.length < MAX_ALTERNATIVES) alternatives.push({ answer, label: other });
  }
  return label || alternatives.length > 0 ? { label, alternatives } : null;
}
