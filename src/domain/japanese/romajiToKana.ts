// Google-IME-style incremental romaji -> hiragana conversion. Same
// feed-one-character shape as domain/persian/phoneticEngine.ts, but the
// per-step result is a (deleteCount, insertText) edit rather than an
// emission/candidates pair — Japanese romaji composition never needs a
// disambiguation picker the way Persian's Latin-sound overlap does, but it
// does need to *retroactively edit* already-inserted text: a bare "n" is
// spelled out as the full-width placeholder ｎ the moment it's typed (so the
// learner sees something), and a later keystroke may need to delete that
// placeholder and replace it with what it turned out to mean (ん, or ん plus
// whatever the next syllable resolves to). `deleteCount` is how many
// trailing characters of the CURRENT answer text to remove before appending
// `insertText` — 0 on every ordinary keystroke.
import { KANA_TABLE, VALID_PREFIXES } from "./kanaTable";

export interface JapanesePhoneticState {
  /** Accumulated romaji not yet resolved into kana — "", a single consonant, a consonant cluster ("ky"), or "n" (the pending syllabic-n placeholder). */
  buffer: string;
}

export const initialJapanesePhoneticState: JapanesePhoneticState = { buffer: "" };

export interface RomajiStep {
  state: JapanesePhoneticState;
  deleteCount: number;
  insertText: string;
}

const VOWELS = new Set(["a", "i", "u", "e", "o"]);

function isValidPrefix(candidate: string): boolean {
  return VALID_PREFIXES.has(candidate);
}

export function feedRomajiChar(state: JapanesePhoneticState, rawChar: string): RomajiStep {
  const char = rawChar.toLowerCase();
  const buffer = state.buffer;

  // "nn" always commits ん immediately, consuming both n's — checked first
  // since it doesn't fit the general vowel-completion shape below.
  if (buffer === "n" && char === "n") {
    return { state: initialJapanesePhoneticState, deleteCount: 1, insertText: "ん" };
  }

  if (char === "n" || VOWELS.has(char) || char === "y") {
    const candidate = buffer + char;
    const exact = KANA_TABLE[candidate];
    if (exact) {
      return { state: initialJapanesePhoneticState, deleteCount: buffer === "n" ? 1 : 0, insertText: exact };
    }
    if (isValidPrefix(candidate)) {
      return { state: { buffer: candidate }, deleteCount: buffer === "n" ? 1 : 0, insertText: candidate === "n" ? "ｎ" : "" };
    }
    if (buffer) {
      // Stale, unresolvable buffer — drop it and retry `char` fresh.
      const fresh = feedRomajiChar(initialJapanesePhoneticState, char);
      return { ...fresh, deleteCount: (buffer === "n" ? 1 : 0) + fresh.deleteCount };
    }
    return { state: initialJapanesePhoneticState, deleteCount: 0, insertText: "" };
  }

  // A consonant (not n/y/vowel).
  if (buffer === "n") {
    // Bare n followed by a consonant reads as syllabic ん, same as Google
    // IME — commit it, then let the consonant start a fresh buffer.
    const fresh = feedRomajiChar(initialJapanesePhoneticState, char);
    return { ...fresh, insertText: "ん" + fresh.insertText, deleteCount: 1 };
  }

  if (buffer === char) {
    // Sokuon: a doubled consonant emits っ, then this consonant restarts the
    // buffer so it can still combine with the vowel that follows
    // ("kitte" -> き + っ + て, not き + っ + き).
    return { state: { buffer: char }, deleteCount: 0, insertText: "っ" };
  }

  const candidate = buffer + char;
  if (isValidPrefix(candidate)) {
    return { state: { buffer: candidate }, deleteCount: 0, insertText: "" };
  }

  // Invalid cluster — drop the stale buffer, start fresh with this consonant.
  return { state: { buffer: char }, deleteCount: 0, insertText: "" };
}

/** Call on space/backspace-boundary/blur/submit — a still-pending bare "n" resolves to ん (the ｎ example the user called out). */
export function finalizeRomaji(state: JapanesePhoneticState): RomajiStep {
  if (state.buffer === "n") return { state: initialJapanesePhoneticState, deleteCount: 1, insertText: "ん" };
  return { state: initialJapanesePhoneticState, deleteCount: 0, insertText: "" };
}
