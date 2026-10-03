// What a typed Persian answer is submitted as. Isolated keyboard mode
// (PersianKeyboard.tsx, scriptEngines.tsx's layout engine) writes a ZWNJ
// after every letter so each one shows in its isolated form — a way of
// seeing the letters, not a spelling. Now that a misplaced half-space is
// wrong (comparators.ts), those have to come out before grading, or every
// answer typed that way would fail.
import { ZWNJ } from "./normalize";

/** Each letter's own isolating ZWNJ; one typed on purpose after it (isolated mode's ZWNJ key adds a second) stays. */
const ISOLATING_ZWNJ = new RegExp(`([^${ZWNJ}\\s])${ZWNJ}`, "gu");
/** A ZWNJ at either end, or beside a space, joins nothing and shows nothing. */
const STRAY_ZWNJ = new RegExp(`^${ZWNJ}+|${ZWNJ}+$|${ZWNJ}*(\\s+)${ZWNJ}*`, "gu");

/**
 * `text` as the learner meant it: without the ZWNJ isolated mode put after
 * each letter (when `isolatedLetters`), and without any half-space that
 * can't be part of a word.
 */
export function submittedSpelling(text: string, isolatedLetters: boolean): string {
  const spelled = isolatedLetters ? text.replace(ISOLATING_ZWNJ, "$1") : text;
  return spelled.replace(STRAY_ZWNJ, (_, space: string | undefined) => space ?? "");
}
