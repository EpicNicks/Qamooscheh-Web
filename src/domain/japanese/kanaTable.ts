// Romaji -> hiragana lookup for romajiToKana.ts's maximal-munch buffering.
// Standard gojuon + dakuten/handakuten + youon + the common alternate
// spellings (shi/si, chi/ti, tsu/tu, fu/hu, ji/zi, du/di) + x-prefixed small
// kana (Google IME's convention for ぁぃぅぇぉ/っ/ゃゅょ, e.g. "xya" -> ゃ).
export const KANA_TABLE: Record<string, string> = {
  a: "あ", i: "い", u: "う", e: "え", o: "お",

  ka: "か", ki: "き", ku: "く", ke: "け", ko: "こ",
  sa: "さ", shi: "し", si: "し", su: "す", se: "せ", so: "そ",
  ta: "た", chi: "ち", ti: "ち", tsu: "つ", tu: "つ", te: "て", to: "と",
  na: "な", ni: "に", nu: "ぬ", ne: "ね", no: "の",
  ha: "は", hi: "ひ", fu: "ふ", hu: "ふ", he: "へ", ho: "ほ",
  ma: "ま", mi: "み", mu: "む", me: "め", mo: "も",
  ya: "や", yu: "ゆ", yo: "よ",
  ra: "ら", ri: "り", ru: "る", re: "れ", ro: "ろ",
  wa: "わ", wo: "を",

  ga: "が", gi: "ぎ", gu: "ぐ", ge: "げ", go: "ご",
  za: "ざ", ji: "じ", zi: "じ", zu: "ず", ze: "ぜ", zo: "ぞ",
  da: "だ", di: "ぢ", du: "づ", de: "で", do: "ど",
  ba: "ば", bi: "び", bu: "ぶ", be: "べ", bo: "ぼ",
  pa: "ぱ", pi: "ぴ", pu: "ぷ", pe: "ぺ", po: "ぽ",

  kya: "きゃ", kyu: "きゅ", kyo: "きょ",
  sha: "しゃ", shu: "しゅ", sho: "しょ", sya: "しゃ", syu: "しゅ", syo: "しょ",
  cha: "ちゃ", chu: "ちゅ", cho: "ちょ", cya: "ちゃ", cyu: "ちゅ", cyo: "ちょ", tya: "ちゃ", tyu: "ちゅ", tyo: "ちょ",
  nya: "にゃ", nyu: "にゅ", nyo: "にょ",
  hya: "ひゃ", hyu: "ひゅ", hyo: "ひょ",
  mya: "みゃ", myu: "みゅ", myo: "みょ",
  rya: "りゃ", ryu: "りゅ", ryo: "りょ",
  gya: "ぎゃ", gyu: "ぎゅ", gyo: "ぎょ",
  ja: "じゃ", ju: "じゅ", jo: "じょ", jya: "じゃ", jyu: "じゅ", jyo: "じょ", zya: "じゃ", zyu: "じゅ", zyo: "じょ",
  bya: "びゃ", byu: "びゅ", byo: "びょ",
  pya: "ぴゃ", pyu: "ぴゅ", pyo: "ぴょ",
  dya: "ぢゃ", dyu: "ぢゅ", dyo: "ぢょ",

  xa: "ぁ", xi: "ぃ", xu: "ぅ", xe: "ぇ", xo: "ぉ",
  xtsu: "っ", xtu: "っ", ltsu: "っ",
  xya: "ゃ", xyu: "ゅ", xyo: "ょ",
  xwa: "ゎ",
};

/** Every proper prefix of every key above, e.g. "ky" for "kya" — precomputed once so romajiToKana's buffering check is O(1) per keystroke instead of scanning the whole table. */
export const VALID_PREFIXES: Set<string> = (() => {
  const prefixes = new Set<string>();
  for (const key of Object.keys(KANA_TABLE)) {
    for (let length = 1; length < key.length; length++) prefixes.add(key.slice(0, length));
  }
  return prefixes;
})();
