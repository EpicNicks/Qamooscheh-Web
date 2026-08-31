// Turns the pure domain/persian/phoneticEngine state machine into something
// a component can drive: feed one Latin character at a time, get an edit
// applied via `onEdit`. Shared by both entry points (the on-screen phonetic
// keyboard and typing straight into the native <input>) so there's exactly
// one conversion implementation, and so tapping and typing can interleave
// mid-word without desyncing.
import { useRef, useState } from "react";
import {
  feedLatinChar,
  finalizeWord,
  initialPersianPhoneticState,
  type PersianPhoneticState,
  type PersianPhoneticStep,
} from "../domain/persian/phoneticEngine";

export interface PersianPhoneticInput {
  /** Non-null exactly when the last-inserted letter is ambiguous and a correction picker should float over it; index 0 is the default already in the text. */
  candidates: readonly string[] | null;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  feedChar: (char: string) => void;
  /** Replace the already-inserted default candidate with a different one (or re-confirm index 0). */
  selectCandidate: (index?: number) => void;
  /** Call on space/blur/submit — resolves a still-pending word-final e to ه. */
  finalize: () => void;
  /** Call on backspace — drops any buffered state without an edit of its own (the caller's own backspace already removed the visible character, if there was one — see `hasPending`). */
  reset: () => void;
  /** True only when nothing visible has been inserted for the current buffer yet (the rare lone "c" case, or a pending word-final e) — lets the caller avoid also deleting a real character. */
  hasPending: () => boolean;
}

export function usePersianPhoneticInput(onEdit: (deleteCount: number, insertText: string) => void): PersianPhoneticInput {
  const stateRef = useRef<PersianPhoneticState>(initialPersianPhoneticState);
  const [candidates, setCandidates] = useState<readonly string[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function apply(step: PersianPhoneticStep) {
    stateRef.current = step.state;
    if (step.deleteCount > 0 || step.insertText) onEdit(step.deleteCount, step.insertText);
    if (step.candidates) {
      setCandidates(step.candidates);
      setActiveIndex(0);
    } else {
      setCandidates(null);
    }
  }

  function feedChar(char: string) {
    apply(feedLatinChar(stateRef.current, char));
  }

  function selectCandidate(index = activeIndex) {
    if (!candidates) return;
    onEdit(1, candidates[index]);
    setCandidates(null);
    // A confirmed choice is final — a following letter starts its own fresh
    // determination rather than retroactively combining with this one (e.g.
    // picking ص for "s" and then typing "h" should not turn into ش).
    stateRef.current = initialPersianPhoneticState;
  }

  function finalize() {
    apply(finalizeWord());
  }

  function reset() {
    setCandidates(null);
    stateRef.current = initialPersianPhoneticState;
  }

  function hasPending() {
    const state = stateRef.current;
    return state.bufferedPrefix !== "" && !hasVisibleInsertion(state.bufferedPrefix);
  }

  return { candidates, activeIndex, setActiveIndex, feedChar, selectCandidate, finalize, reset, hasPending };
}

function hasVisibleInsertion(bufferedPrefix: string): boolean {
  // Mirrors phoneticEngine's own eager-insertion check — a buffered prefix
  // has something visible in the text exactly when it resolves on its own.
  return feedLatinChar(initialPersianPhoneticState, bufferedPrefix).insertText !== "";
}

/**
 * Arrow-key/Enter/Escape navigation for an open candidate picker — Escape
 * commits the currently-highlighted (default: top) candidate rather than
 * dismissing without a choice, since the letter is already in the text
 * either way. Returns true if it consumed the keydown (so the caller should
 * call `event.preventDefault()` and stop), false if the picker is closed or
 * the key wasn't a navigation key — printable characters are left for the
 * caller's own `feedChar` to handle.
 */
export function handlePickerNavigation(input: PersianPhoneticInput, key: string): boolean {
  if (!input.candidates) return false;

  switch (key) {
    case "ArrowDown":
      input.setActiveIndex(Math.min(input.activeIndex + 1, input.candidates.length - 1));
      return true;
    case "ArrowUp":
      input.setActiveIndex(Math.max(input.activeIndex - 1, 0));
      return true;
    case "Enter":
    case "Escape":
      input.selectCandidate();
      return true;
    default:
      return false;
  }
}
