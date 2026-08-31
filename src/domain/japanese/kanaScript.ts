// Hiragana <-> katakana conversion for the kana keyboard's script toggle.
// The two blocks are in the same relative order a fixed 0x60 codepoint apart
// (ぁ U+3041 .. ゖ U+3096 vs. ァ U+30A1 .. ヶ U+30F6), so shifting by that
// offset covers every kana this app ever produces; anything outside the
// range (ー, punctuation, ASCII) passes through unchanged since it's shared
// between both scripts already.
const HIRAGANA_START = 0x3041;
const HIRAGANA_END = 0x3096;
const KATAKANA_START = 0x30a1;
const KATAKANA_END = 0x30f6;

export type KanaScript = "hiragana" | "katakana";

export function toKatakana(text: string): string {
  return Array.from(text)
    .map((ch) => {
      const cp = ch.codePointAt(0)!;
      return cp >= HIRAGANA_START && cp <= HIRAGANA_END ? String.fromCodePoint(cp + 0x60) : ch;
    })
    .join("");
}

export function toHiragana(text: string): string {
  return Array.from(text)
    .map((ch) => {
      const cp = ch.codePointAt(0)!;
      return cp >= KATAKANA_START && cp <= KATAKANA_END ? String.fromCodePoint(cp - 0x60) : ch;
    })
    .join("");
}

export function convertKanaScript(text: string, script: KanaScript): string {
  return script === "katakana" ? toKatakana(text) : toHiragana(text);
}
