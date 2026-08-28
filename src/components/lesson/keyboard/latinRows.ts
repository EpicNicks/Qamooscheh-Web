/** Plain QWERTY letter rows, shared by both phonetic keyboards (Persian and Japanese) — each just feeds taps/keystrokes through its own conversion engine. */
export const QWERTY_ROWS: readonly (readonly string[])[] = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

export function physicalCodeForLetter(letter: string): string {
  return `Key${letter.toUpperCase()}`;
}
