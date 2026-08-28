// Thin wrapper over domain/japanese/romajiToKana.ts, mirroring
// usePersianPhoneticInput.ts's role for the Persian engine — shared by both
// entry points (the on-screen phonetic keyboard and typing straight into
// the native <input>). Simpler than the Persian hook: romaji composition
// never needs a disambiguation picker, just a (delete N trailing chars,
// insert this text) edit applied to whatever text the caller is holding.
import { useRef } from "react";
import {
  feedRomajiChar,
  finalizeRomaji,
  initialJapanesePhoneticState,
  type JapanesePhoneticState,
} from "../domain/japanese/romajiToKana";

export interface JapanesePhoneticInput {
  feedChar: (char: string) => void;
  /** Call on space/blur/submit — resolves a still-pending bare "n" (shown as ｎ) to ん. */
  finalize: () => void;
  /** Call on backspace — drops any buffered romaji without emitting an edit (nothing further to delete/insert; the caller's own backspace already removed the last character). */
  reset: () => void;
  /**
   * The raw buffered romaji, "" when idle. Distinguishes backspace's two
   * cases: `"n"` has a visible ｎ placeholder already in the text (default
   * backspace deleting it is correct), while any other non-empty buffer
   * (a consonant cluster mid-syllable) is invisible — backspace should
   * cancel it without also deleting an already-committed character.
   */
  peekBuffer: () => string;
}

export function useJapanesePhoneticInput(onEdit: (deleteCount: number, insertText: string) => void): JapanesePhoneticInput {
  const stateRef = useRef<JapanesePhoneticState>(initialJapanesePhoneticState);

  function apply(step: { state: JapanesePhoneticState; deleteCount: number; insertText: string }) {
    stateRef.current = step.state;
    if (step.deleteCount > 0 || step.insertText) onEdit(step.deleteCount, step.insertText);
  }

  return {
    feedChar: (char) => apply(feedRomajiChar(stateRef.current, char)),
    finalize: () => apply(finalizeRomaji(stateRef.current)),
    reset: () => {
      stateRef.current = initialJapanesePhoneticState;
    },
    peekBuffer: () => stateRef.current.buffer,
  };
}
