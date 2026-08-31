// The direct kana-input layout — shared by JapaneseKanaKeyboard.tsx (the
// on-screen grid) and TypeInExercise.tsx (so typing the corresponding key on
// a real keyboard also converts, the same way switching an OS to a Japanese
// kana-input method would). A JIS keyboard has more physical keys than a US
// one, so a US physical code is used as the nearest equivalent wherever one
// exists; a `null` code means the real JIS key has no US counterpart at all
// (を and ろ) — those stay tap-only on the virtual keyboard, with no way to
// reach them by typing a Latin key.
//
// The number row carries its own vowels (あうえお — い sits on E, matching
// its real QWERTY-row position) plus やゆよわほへー, exactly where a real JIS
// keyboard places them; that's the one row previous versions of this layout
// dropped into an ad-hoc row below the three main ones instead.
export const JIS_KANA_NUMBER_ROW: readonly (readonly [string, string])[] = [
  ["ぬ", "Digit1"], ["ふ", "Digit2"], ["あ", "Digit3"], ["う", "Digit4"], ["え", "Digit5"],
  ["お", "Digit6"], ["や", "Digit7"], ["ゆ", "Digit8"], ["よ", "Digit9"], ["わ", "Digit0"],
  ["ほ", "Minus"], ["へ", "Equal"],
];

export const JIS_KANA_ROWS: readonly (readonly [string, string | null])[][] = [
  [
    ["た", "KeyQ"], ["て", "KeyW"], ["い", "KeyE"], ["す", "KeyR"], ["か", "KeyT"],
    ["ん", "KeyY"], ["な", "KeyU"], ["に", "KeyI"], ["ら", "KeyO"], ["せ", "KeyP"],
    ["ー", "Backslash"],
  ],
  [
    ["ち", "KeyA"], ["と", "KeyS"], ["し", "KeyD"], ["は", "KeyF"], ["き", "KeyG"],
    ["く", "KeyH"], ["ま", "KeyJ"], ["の", "KeyK"], ["り", "KeyL"], ["れ", "Semicolon"], ["け", "Quote"],
    ["む", "BracketLeft"],
  ],
  [
    ["つ", "KeyZ"], ["さ", "KeyX"], ["そ", "KeyC"], ["ひ", "KeyV"], ["こ", "KeyB"],
    ["み", "KeyN"], ["も", "KeyM"], ["ね", "Comma"], ["る", "Period"], ["め", "Slash"],
    ["ろ", null],
  ],
];

/** を has no US-layout key of its own (real JIS position is Shift+0) — tap-only, rendered at the end of the number row. */
export const JIS_KANA_WO: string = "を";

function charForPhysicalCode(code: string): string | null {
  const letterMatch = /^Key([A-Z])$/.exec(code);
  if (letterMatch) return letterMatch[1].toLowerCase();
  const digitMatch = /^Digit([0-9])$/.exec(code);
  if (digitMatch) return digitMatch[1];
  if (code === "Minus") return "-";
  if (code === "Equal") return "=";
  if (code === "Backslash") return "\\";
  return null;
}

/** The character a plain US keyboard sends for a key -> the kana at that same physical position on a JIS keyboard, e.g. "t" -> "か", "3" -> "あ". Built from the rows above so it can never drift from what the on-screen keyboard shows; only covers kana that land on a US-reachable key (see the `null`-coded entries above for the two that don't). */
export const PHYSICAL_CHAR_TO_KANA: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const row of [JIS_KANA_NUMBER_ROW, ...JIS_KANA_ROWS]) {
    for (const [kana, physicalCode] of row) {
      if (!physicalCode) continue;
      const char = charForPhysicalCode(physicalCode);
      if (char) map[char] = kana;
    }
  }
  return map;
})();
