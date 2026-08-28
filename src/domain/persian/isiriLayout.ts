// The ISIRI standard-layout letter placement — shared by PersianKeyboard.tsx
// (the on-screen grid) and TypeInExercise.tsx (so typing the corresponding
// physical key on a real keyboard also converts, the same way switching an
// OS to the Persian-Standard input method would). Six of the 32 letters sit
// on the extremity punctuation keys ([ ] ; ' , .), not on a letter key at
// all — those are included here too (PHYSICAL_KEY_TO_ISIRI is keyed by
// whatever character a plain US layout sends for a key, letter or not) so
// typing them converts exactly like every other key on the row. See
// PersianKeyboard.tsx's header comment for the one remaining simplification
// (ژ's placement).
export const ISIRI_ROWS: readonly (readonly [number, string][])[] = [
  [
    [0x0636, "KeyQ"], // dad
    [0x0635, "KeyW"], // sad
    [0x062b, "KeyE"], // theh
    [0x0642, "KeyR"], // qaf
    [0x0641, "KeyT"], // feh
    [0x063a, "KeyY"], // ghain
    [0x0639, "KeyU"], // ain
    [0x0647, "KeyI"], // heh
    [0x062e, "KeyO"], // khah
    [0x062d, "KeyP"], // hah
    [0x062c, "BracketLeft"], // jeem
    [0x0686, "BracketRight"], // tcheh
  ],
  [
    [0x0634, "KeyA"], // sheen
    [0x0633, "KeyS"], // seen
    [0x06cc, "KeyD"], // yeh
    [0x0628, "KeyF"], // beh
    [0x0644, "KeyG"], // lam
    [0x0627, "KeyH"], // alef
    [0x062a, "KeyJ"], // teh
    [0x0646, "KeyK"], // noon
    [0x0645, "KeyL"], // meem
    [0x06a9, "Semicolon"], // keheh
    [0x06af, "Quote"], // gaf
  ],
  [
    [0x0638, "KeyZ"], // zah
    [0x0637, "KeyX"], // tah
    [0x0632, "KeyC"], // zain
    [0x0631, "KeyV"], // reh
    [0x0630, "KeyB"], // thal
    [0x062f, "KeyN"], // dal
    [0x067e, "KeyM"], // peh
    [0x0648, "Comma"], // waw
    [0x0698, "Period"], // jeh (ژ)
  ],
];

/** The six non-letter physical codes ISIRI_ROWS also uses, mapped to whatever character a plain US layout sends for that same key. */
const PUNCTUATION_CODE_CHAR: Record<string, string> = {
  BracketLeft: "[",
  BracketRight: "]",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
};

/** physicalCode ("KeyQ", "BracketLeft", ...) -> the character a real US keyboard's key sends ("q", "[", ...) — for matching a typed keystroke back to a row entry. */
function defaultCharForPhysicalCode(code: string): string | null {
  const letterMatch = /^Key([A-Z])$/.exec(code);
  if (letterMatch) return letterMatch[1].toLowerCase();
  return PUNCTUATION_CODE_CHAR[code] ?? null;
}

/** The character a plain US keyboard sends for a key -> the Persian letter at that same physical position, e.g. "q" -> "ض", "[" -> "ج". Built once from ISIRI_ROWS so the mapping can never drift from what the on-screen keyboard shows. */
export const PHYSICAL_KEY_TO_ISIRI: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const row of ISIRI_ROWS) {
    for (const [codePoint, physicalCode] of row) {
      const char = defaultCharForPhysicalCode(physicalCode);
      if (char) map[char] = String.fromCodePoint(codePoint);
    }
  }
  return map;
})();
