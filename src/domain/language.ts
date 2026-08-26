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
}

const COURSE_CODE_TO_LANGUAGE: Record<string, LanguageInfo> = {
  fa: {
    language: "fa",
    displayName: "Persian",
    direction: "rtl",
    nativeFontStack: "'Vazirmatn', 'Noto Naskh Arabic', Tahoma, 'Segoe UI', sans-serif",
  },
  ja: {
    language: "ja",
    displayName: "Japanese",
    direction: "ltr",
    nativeFontStack: "'Noto Sans JP', 'Yu Gothic', 'Hiragino Sans', 'Meiryo', sans-serif",
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
