// A small incremental state machine for the Persian phonetic keyboard —
// same (deleteCount, insertText) edit shape as domain/japanese/romajiToKana.ts,
// so both phonetic engines are used the same way from the UI layer.
//
// Digraph-starter letters (k, g, c, s, z — the first letters of kh/gh/ch/sh/
// zh) are the only ones needing a lookahead: typing "g" alone must show
// something immediately (real Persian phonetic keyboards, and this one's
// own first draft, waited silently for a possible following "h" — which
// reads as broken, not as "still composing"). So instead of waiting
// silently, a digraph-starter's single-letter reading (گ for "g") is
// inserted EAGERLY the moment it's typed, and RETROACTIVELY corrected
// (delete 1, insert the digraph's result) if the next character actually
// completes a digraph. `c` is the one starter with no standalone Persian
// sound of its own, so it has nothing to eagerly insert and stays silently
// buffered until "h" arrives or the word ends (dropped, same as before).
//
// `a` maps to ا like any other single letter (an ordinary two-way ambiguous
// entry in phoneticMap.ts's SINGLES table, toggling to آ via the same
// candidate picker every other ambiguous sound uses — no special-casing
// needed here). There used to be a special-cased `e`, silently pending until
// the word ended and then resolving to ه (or dropped) — removed because it
// let a keystroke be "accepted" with nothing shown for it, which reads as
// the keyboard swallowing input rather than composing it. A learner who
// wants ه types `h` instead, same as every other letter: immediate and
// visible. `e` is simply not a mapped sound (see phoneticMap.ts's
// VALID_PHONETIC_LETTERS) and the UI never accepts it.
import { DIGRAPH_STARTERS, resolveTrigger } from "./phoneticMap";

export interface PersianPhoneticState {
  /** A single Latin char that might still extend into a digraph (its own single-letter reading, if any, has already been eagerly inserted). "" when idle. */
  bufferedPrefix: string;
}

export const initialPersianPhoneticState: PersianPhoneticState = { bufferedPrefix: "" };

export interface PersianPhoneticStep {
  state: PersianPhoneticState;
  /** Trailing characters to remove from the current answer text before appending `insertText` — >0 only when retracting an eager single-letter guess in favor of a digraph. */
  deleteCount: number;
  insertText: string;
  /** Set alongside a just-inserted ambiguous letter (insertText === candidates[0]) — the UI should float a picker to let the learner correct it to a different candidate. */
  candidates: readonly string[] | null;
}

function eagerLengthFor(prefix: string): number {
  return resolveTrigger(prefix) ? 1 : 0;
}

export function feedLatinChar(state: PersianPhoneticState, rawChar: string): PersianPhoneticStep {
  const char = rawChar.toLowerCase();

  if (state.bufferedPrefix) {
    const combined = state.bufferedPrefix + char;
    const digraph = resolveTrigger(combined);
    if (digraph) {
      return {
        state: initialPersianPhoneticState,
        deleteCount: eagerLengthFor(state.bufferedPrefix),
        insertText: digraph[0],
        candidates: digraph.length > 1 ? digraph : null,
      };
    }
    // Doesn't extend into a digraph — the eager guess already inserted for
    // the old buffered letter (if any) stands as final. Nothing was silently
    // held back, so `char` just starts its own fresh determination.
    return feedLatinChar(initialPersianPhoneticState, char);
  }

  if (DIGRAPH_STARTERS.has(char)) {
    const single = resolveTrigger(char);
    return {
      state: { bufferedPrefix: char },
      deleteCount: 0,
      insertText: single?.[0] ?? "",
      candidates: single && single.length > 1 ? single : null,
    };
  }

  const single = resolveTrigger(char);
  return {
    state: initialPersianPhoneticState,
    deleteCount: 0,
    insertText: single?.[0] ?? "",
    candidates: single && single.length > 1 ? single : null,
  };
}

/** Call on space/blur/submit — a no-op edit: every digraph-starter's eager guess is already in the text, so there's nothing left to flush. Kept as a step (rather than dropped) so callers don't need to special-case "was there a pending vowel" any more. */
export function finalizeWord(): PersianPhoneticStep {
  return { state: initialPersianPhoneticState, deleteCount: 0, insertText: "", candidates: null };
}
