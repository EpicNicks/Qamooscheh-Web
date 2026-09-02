// Course code -> language/script metadata, for everything the wire types
// don't carry directly. BootstrapResponse's CourseRef is {code, version,
// manifestSha256} — no language field (only GraderRef carries one, and
// graders is often an empty list, API_SPEC.md §2.1). 0001_initial.sql's own
// comment on course_version.language says code and language "coincide today
// by coincidence, not by rule" — this table encodes that same coincidence
// for the client, deliberately keyed on course CODE rather than treated as
// a language lookup in its own right. If a second course is ever added for
// an already-supported language, this needs a real per-course-version
// language field from the API instead of this table.
export type Language = "fa" | "ja";

export type WritingDirection = "rtl" | "ltr";

interface LanguageInfo {
  language: Language;
  displayName: string;
  direction: WritingDirection;
  /** Font stack for that language's native script — no external font loading, just broad-coverage system fonts. */
  nativeFontStack: string;
  /** BCP-47 tag for the Web Speech API (domain/tts.ts) — picks a language-appropriate voice/pronunciation, not just a font. */
  speechLang: string;
  /** The language's own endonym, in its own script — e.g. "فارسی", "日本語". Doubles as the worked example on the script-mode toggle (components/lesson/languageSettings/), since it's a word every learner already recognizes by the time they'd look for that setting. */
  nativeName: string;
  /** That same endonym, romanized — e.g. "Farsi", "Nihongo". The toggle's other worked example. */
  romanizedName: string;
  /** Short code for the badge fallback (LanguageBadge) — not an ISO list, just what's shown in all caps. */
  flagCode: string;
  /**
   * The country's flag colors, top to bottom, for LanguageBadge's gradient
   * fallback. Deliberately not real flag emoji/images: font-based flag
   * rendering is inconsistent across platforms (historically absent on
   * Windows, spotty on some Linux emoji fonts) — this draws the same colors
   * every time, everywhere, with CSS.
   */
  flagColors: readonly string[];
}

const COURSE_CODE_TO_LANGUAGE: Record<string, LanguageInfo> = {
  fa: {
    language: "fa",
    displayName: "Persian",
    direction: "rtl",
    nativeFontStack: "'Vazirmatn', 'Noto Naskh Arabic', Tahoma, 'Segoe UI', sans-serif",
    speechLang: "fa-IR",
    nativeName: "فارسی",
    romanizedName: "Farsi",
    flagCode: "FA",
    flagColors: ["#239F40", "#FFFFFF", "#DA0000"],
  },
  ja: {
    language: "ja",
    displayName: "Japanese",
    direction: "ltr",
    nativeFontStack: "'Noto Sans JP', 'Yu Gothic', 'Hiragino Sans', 'Meiryo', sans-serif",
    speechLang: "ja-JP",
    nativeName: "日本語",
    romanizedName: "Nihongo",
    flagCode: "JA",
    flagColors: ["#FFFFFF", "#BC002D"],
  },
};

export function getLanguageInfo(courseCode: string | null | undefined): LanguageInfo | null {
  if (!courseCode) return null;
  return COURSE_CODE_TO_LANGUAGE[courseCode] ?? null;
}

export function isPersian(courseCode: string | null | undefined): boolean {
  return getLanguageInfo(courseCode)?.language === "fa";
}

export function getWritingDirection(courseCode: string | null | undefined): WritingDirection {
  return getLanguageInfo(courseCode)?.direction ?? "ltr";
}

export type KeyboardKind = "persian-layout" | "persian-phonetic" | "japanese-phonetic" | "japanese-kana";

/**
 * Which on-screen keyboard (if any) TypeInExercise should show — null when
 * the exercise isn't in the native script (nothing to type in a script-
 * specific way) or the course's language isn't one of these two yet.
 * `method` is the learner's local, per-language input-method preference
 * (hooks/useKeyboardInputMethod.ts) — a client-only UI choice, distinct from
 * the server-synced keyboard_mode (contextual/isolated ZWNJ spacing).
 */
export function getKeyboardKind(
  courseCode: string | null | undefined,
  scriptMode: "native" | "romanized",
  method: { fa: "layout" | "phonetic"; ja: "phonetic" | "kana" },
): KeyboardKind | null {
  if (scriptMode !== "native") return null;
  const language = getLanguageInfo(courseCode)?.language;
  if (language === "fa") return method.fa === "phonetic" ? "persian-phonetic" : "persian-layout";
  if (language === "ja") return method.ja === "kana" ? "japanese-kana" : "japanese-phonetic";
  return null;
}
