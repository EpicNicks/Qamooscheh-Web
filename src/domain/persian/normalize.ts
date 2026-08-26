// Client-side mirror of Qamooscheh.Persian.Normalization.PersianNormalizer,
// used ONLY for instant in-lesson feedback (lib/textMatch.ts's own caveat
// applies here too) — the server re-grades every submission with the real
// PersianNormalizer and is the sole source of truth for FSRS state.
//
// Every codepoint below is a \u escape with the same identifying comment the
// backend source carries, verified against that source directly (not
// visually transcribed — see the commit that added this file for how):
//   ZWNJ U+200C, Heh Goal U+06C0, Heh U+0647, Persian Yeh U+06CC,
//   Arabic Yeh U+064A, Arabic Kaf U+0643, Persian Keheh U+06A9,
//   Teh Marbuta U+0629, Alef with Hamza Above U+0623, Alef U+0627,
//   Alef with Hamza Below U+0625, Arabic-Indic digits U+0660-0669,
//   Extended Arabic-Indic (Persian) digits U+06F0-06F9.

const ZWNJ = "‌";
const HEH_GOAL = "ۀ";
const HEH = "ه";
const PERSIAN_YEH = "ی";

/** Arabic-only codepoints folded to their Persian counterpart. Alef Madda (آ, U+0622) is a genuine, distinct Persian letter and is deliberately NOT folded. */
const CODEPOINT_FOLD_MAP: Record<string, string> = {
  "ي": PERSIAN_YEH, // Arabic Yeh -> Persian Yeh
  "ك": "ک", // Arabic Kaf -> Persian Keheh
  "ة": HEH, // Teh Marbuta -> Heh
  "أ": "ا", // Alef with Hamza Above -> Alef
  "إ": "ا", // Alef with Hamza Below -> Alef
};

function buildDigitFoldMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (let i = 0; i <= 9; i++) {
    map[String.fromCodePoint(0x0660 + i)] = String(i); // Arabic-Indic
    map[String.fromCodePoint(0x06f0 + i)] = String(i); // Extended Arabic-Indic (Persian)
  }
  return map;
}
const DIGIT_FOLD_MAP = buildDigitFoldMap();

/** Always-safe: Unicode NFC, digit-system folding to ASCII, whitespace trim/collapse. Never itself a "correction". */
export function normalizeStrict(input: string): string {
  const composed = input.normalize("NFC");
  let out = "";
  let lastWasSpace = false;

  for (const ch of composed) {
    const mapped = DIGIT_FOLD_MAP[ch] ?? ch;
    if (/\s/.test(mapped)) {
      if (!lastWasSpace && out.length > 0) out += " ";
      lastWasSpace = true;
      continue;
    }
    out += mapped;
    lastWasSpace = false;
  }

  return out.trimEnd();
}

/** Arabic-vs-Persian codepoint substitution, folded away. Expects already-`normalizeStrict`'d input. */
export function foldCodepoints(strictlyNormalized: string): string {
  let out = "";
  for (const ch of strictlyNormalized) {
    if (ch === HEH_GOAL) {
      out += HEH + ZWNJ + PERSIAN_YEH;
      continue;
    }
    out += CODEPOINT_FOLD_MAP[ch] ?? ch;
  }
  return out;
}

/** Removes ZWNJ and plain spaces entirely — fallback tier after strict and codepoint-folded comparison have both failed. */
export function stripSeparators(input: string): string {
  if (!input.includes(ZWNJ) && !input.includes(" ")) return input;
  let out = "";
  for (const ch of input) {
    if (ch === ZWNJ || ch === " ") continue;
    out += ch;
  }
  return out;
}

/** Full pipeline: strict, then codepoint folding, then separator stripping. */
export function normalizeLoose(input: string): string {
  return stripSeparators(foldCodepoints(normalizeStrict(input)));
}

export interface ArabicVariantHit {
  index: number;
  found: string;
  suggested: string;
  label: string;
}

/**
 * The client half of the root README's "the frontend rejects and teaches"
 * rule for Arabic-only codepoints — a diagnostic pass over raw (not yet
 * normalized) input, for showing an inline "did you mean ی, not ي?" hint as
 * the learner types. Never blocks submission: the server still normalizes
 * as a backstop (API_SPEC.md's grading path), this is purely instructional.
 */
export function detectArabicVariants(rawInput: string): ArabicVariantHit[] {
  const hits: ArabicVariantHit[] = [];
  let index = 0;
  for (const ch of rawInput) {
    if (ch === "ي") {
      hits.push({ index, found: ch, suggested: PERSIAN_YEH, label: "Arabic yeh — Persian uses ی" });
    } else if (ch === "ك") {
      hits.push({ index, found: ch, suggested: "ک", label: "Arabic kaf — Persian uses ک" });
    } else if (ch === "ة") {
      hits.push({ index, found: ch, suggested: HEH, label: "Teh marbuta — Persian uses ه" });
    } else if (ch === "أ" || ch === "إ") {
      hits.push({ index, found: ch, suggested: "ا", label: "Hamza-marked alef — Persian uses plain ا" });
    }
    index += ch.length;
  }
  return hits;
}
