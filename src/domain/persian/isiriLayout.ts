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

// The on-screen keyboard's virtual-only Shift layer: a handful of ISIRI
// 9147 level-2 (Shift) letters that are genuine, distinct Persian letters —
// not one of the Arabic-only codepoints normalize.ts's CODEPOINT_FOLD_MAP
// silently folds away (Arabic yeh/kaf, teh marbuta, hamza-alefs), and not a
// duplicate of a letter already reachable elsewhere on this layout. Verified
// against the same reference isiriLayout's base rows were checked against —
// Microsoft's kbdfar table, which mirrors ISIRI 9147's Shift level exactly:
// KeyH -> ARABIC LETTER ALEF WITH MADDA ABOVE (0622), KeyA -> ARABIC LETTER
// WAW WITH HAMZA ABOVE (0624), KeyS -> ARABIC LETTER YEH WITH HAMZA ABOVE
// (0626), KeyM -> ARABIC LETTER HAMZA (0621). Deliberately NOT a physical-
// keystroke mapping (PersianKeyboard.tsx's header comment explains why
// physical ISIRI conversion is handled once, centrally, in TypeInExercise) —
// this only changes what tapping the on-screen key inserts.
export const ISIRI_SHIFT: Readonly<Record<string, number>> = {
  KeyH: 0x0622, // alef -> alef madda (آ)
  KeyA: 0x0624, // sheen key -> waw with hamza above (ؤ)
  KeyS: 0x0626, // seen key -> yeh with hamza above (ئ)
  KeyM: 0x0621, // peh key -> hamza (ء)
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
