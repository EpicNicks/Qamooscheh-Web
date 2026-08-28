// The direct kana-input layout — shared by JapaneseKanaKeyboard.tsx (the
// on-screen grid) and TypeInExercise.tsx (so typing the corresponding Latin
// key on a real keyboard also converts, the same way switching an OS to a
// Japanese kana-input method would). See JapaneseKanaKeyboard.tsx's header
// comment for the scope this covers (the 32 kana that fit cleanly on three
// QWERTY-shaped rows) and what it deliberately doesn't attempt.
export const JIS_KANA_ROWS: readonly (readonly [string, string][])[] = [
  [
    ["た", "KeyQ"], ["て", "KeyW"], ["い", "KeyE"], ["す", "KeyR"], ["か", "KeyT"],
    ["ん", "KeyY"], ["な", "KeyU"], ["に", "KeyI"], ["ら", "KeyO"], ["せ", "KeyP"],
  ],
  [
    ["ち", "KeyA"], ["と", "KeyS"], ["し", "KeyD"], ["は", "KeyF"], ["き", "KeyG"],
    ["く", "KeyH"], ["ま", "KeyJ"], ["の", "KeyK"], ["り", "KeyL"], ["れ", "Semicolon"], ["け", "Quote"],
  ],
  [
    ["つ", "KeyZ"], ["さ", "KeyX"], ["そ", "KeyC"], ["ひ", "KeyV"], ["こ", "KeyB"],
    ["み", "KeyN"], ["も", "KeyM"], ["ね", "Comma"], ["る", "Period"], ["め", "Slash"],
  ],
];

function latinForPhysicalCode(code: string): string | null {
  const match = /^Key([A-Z])$/.exec(code);
  return match ? match[1].toLowerCase() : null;
}

/** Lowercase Latin letter -> the kana at that same physical key position, e.g. "t" -> "か". Only covers the 32 kana reachable via a plain letter key — see the header comment. */
export const LATIN_TO_KANA: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const row of JIS_KANA_ROWS) {
    for (const [kana, physicalCode] of row) {
      const latin = latinForPhysicalCode(physicalCode);
      if (latin) map[latin] = kana;
    }
  }
  return map;
})();
