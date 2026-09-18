// Font PREFERENCE, as opposed to font FALLBACK: domain/language.ts's
// nativeFontStack is what a course renders in without any preference set —
// this module is the catalog a learner picks a REPLACEMENT for that stack's
// first slot from, plus the (script, choice) -> real CSS font-family
// resolution that keeps the rest of that fallback chain intact regardless of
// what's picked.
//
// Deliberately system fonts only, not a bundled webfont — every catalog
// entry here is a font that ships with (or is very commonly installed
// alongside) at least one of Windows/macOS/a common Linux desktop/Android/
// iOS, per script. A learner who doesn't have a given entry installed simply
// falls through to the existing fallback chain (isFontAvailable below is
// what lets the picker grey those out rather than silently doing nothing).
import type { Language } from "./language";

export type FontScript = Language | "latin";

export interface FontCatalogEntry {
  /** The literal font-family name, exactly as an OS would list it. */
  name: string;
  /** Which platform(s) ship this by default — shown in the picker so a learner understands why an entry might be greyed out for them. */
  platforms: string;
}

/**
 * Sample text for the picker's live preview — long enough to show a script's
 * actual letterforms (this issue's whole complaint is about how one letter,
 * ه, renders), short enough to read as a single word/phrase at a glance.
 */
export const FONT_PREVIEW_TEXT: Record<FontScript, string> = {
  fa: "سلام، خانه، معلم",
  ja: "こんにちは、元気ですか",
  latin: "The quick brown fox",
};

export const FONT_CATALOG: Record<FontScript, readonly FontCatalogEntry[]> = {
  fa: [
    { name: "Tahoma", platforms: "Windows" },
    { name: "Segoe UI", platforms: "Windows" },
    { name: "Arial", platforms: "Windows, macOS" },
    { name: "Noto Naskh Arabic", platforms: "Linux, Android" },
    { name: "Geeza Pro", platforms: "macOS, iOS" },
    { name: "Damascus", platforms: "macOS, iOS" },
  ],
  ja: [
    { name: "Yu Gothic", platforms: "Windows" },
    { name: "Meiryo", platforms: "Windows" },
    { name: "Hiragino Sans", platforms: "macOS, iOS" },
    { name: "Noto Sans JP", platforms: "Linux, Android" },
    { name: "MS Gothic", platforms: "Windows" },
  ],
  latin: [
    { name: "Segoe UI", platforms: "Windows" },
    { name: "Arial", platforms: "Windows, macOS" },
    { name: "Calibri", platforms: "Windows" },
    { name: "Georgia", platforms: "Windows, macOS" },
    { name: "Verdana", platforms: "Windows, macOS" },
    { name: "Helvetica", platforms: "macOS, iOS" },
    { name: "Times New Roman", platforms: "Windows, macOS" },
  ],
};

/**
 * The tail every resolved stack keeps regardless of what's chosen — fa/ja
 * match domain/language.ts's own nativeFontStack; latin matches index.css's
 * `--font-sans` default. Keep all three in sync with their source of truth
 * if either ever changes.
 */
const FALLBACK_TAIL: Record<FontScript, string> = {
  fa: "'Vazirmatn', 'Noto Naskh Arabic', Tahoma, 'Segoe UI', sans-serif",
  ja: "'Noto Sans JP', 'Yu Gothic', 'Hiragino Sans', 'Meiryo', sans-serif",
  latin: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
};

function quoteIfNeeded(family: string): string {
  return /\s/.test(family) ? `'${family}'` : family;
}

/**
 * The real `font-family` value for a script given a learner's choice (or
 * none) — the chosen family first, then the existing fallback chain
 * unchanged, so a family that's missing/mistyped/uninstalled degrades to
 * exactly what rendered before this preference existed rather than to the
 * browser's generic default.
 */
export function resolveFontStack(script: FontScript, chosenFamily: string | null): string {
  if (!chosenFamily) return FALLBACK_TAIL[script];
  return `${quoteIfNeeded(chosenFamily)}, ${FALLBACK_TAIL[script]}`;
}

let measureContext: CanvasRenderingContext2D | null | undefined;

/**
 * Whether `family` actually renders as itself rather than silently falling
 * back — the classic canvas-width comparison against a fallback font (the
 * only reliable cross-browser technique; the Local Font Access API exists
 * but is Chromium-only and permission-gated, so it's not a mechanism to
 * depend on here). A false positive (says available, isn't) just means an
 * ungreyed option that renders as the fallback anyway — no worse than not
 * checking at all; a false negative only grays out an option a learner could
 * otherwise have used, never breaks anything.
 */
export function isFontAvailable(family: string): boolean {
  if (typeof document === "undefined") return true;
  if (measureContext === undefined) {
    measureContext = document.createElement("canvas").getContext("2d");
  }
  if (!measureContext) return true;

  const probe = "mmmmmmmmmmlli";
  const size = "72px";
  measureContext.font = `${size} monospace`;
  const fallbackWidth = measureContext.measureText(probe).width;
  measureContext.font = `${size} ${quoteIfNeeded(family)}, monospace`;
  const testWidth = measureContext.measureText(probe).width;
  return testWidth !== fallbackWidth;
}
