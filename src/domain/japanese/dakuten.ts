// Dakuten (゛) / handakuten (゜) combine with the PREVIOUSLY typed kana, the
// same way real JIS kana-input hardware works — a following keystroke, not
// a Shift chord. Only the rows that actually take a voicing mark have
// entries; applying either to any other kana is a no-op (returns it
// unchanged) rather than an error, since JapaneseKanaKeyboard just calls
// this unconditionally on whatever kana was last inserted.
const DAKUTEN: Record<string, string> = {
  か: "が", き: "ぎ", く: "ぐ", け: "げ", こ: "ご",
  さ: "ざ", し: "じ", す: "ず", せ: "ぜ", そ: "ぞ",
  た: "だ", ち: "ぢ", つ: "づ", て: "で", と: "ど",
  は: "ば", ひ: "び", ふ: "ぶ", へ: "べ", ほ: "ぼ",
};

const HANDAKUTEN: Record<string, string> = {
  は: "ぱ", ひ: "ぴ", ふ: "ぷ", へ: "ぺ", ほ: "ぽ",
};

export function applyDakuten(kana: string): string {
  return DAKUTEN[kana] ?? kana;
}

export function applyHandakuten(kana: string): string {
  return HANDAKUTEN[kana] ?? kana;
}
