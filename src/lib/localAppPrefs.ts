// Purely local UI preferences — the kind that describe how this browser
// behaves, not who the learner is.
//
// Deliberately NOT part of usePrefs / GET|PUT /v1/prefs. Those are the
// learner's real, server-synced course settings (script mode, register,
// daily goal, desired retention) and every one of them has to follow them to
// another device. "Don't ask me again before skipping" is a dismissed
// confirmation dialog: syncing it would mean a stray checkbox on a phone
// silently disarms the guard on a laptop, and it would put a UI affordance's
// state into the same table as an FSRS parameter. Kept here instead, beside
// the other local stores (cardStateStore.ts, offlineQueue.ts, storage.ts) and
// keyed per-user the same way they are, so two accounts sharing a browser
// don't inherit each other's dismissals.
import { safeStorage } from "./safeStorage";

/** Which virtual keyboard a learner sees for a given language — a UI choice, not an FSRS/grading concern, so it lives here rather than in usePrefs. */
export interface KeyboardInputMethod {
  fa: "layout" | "phonetic";
  ja: "phonetic" | "kana";
}

export interface LocalAppPrefs {
  /** True once the learner has ticked "Don't ask me again" on the skip confirmation. */
  suppressSkipWarning: boolean;
  /** Per-language virtual keyboard mode (see components/lesson/keyboard/). fa defaults to the standard ISIRI layout, ja defaults to phonetic (romaji IME) — matching what most learners already expect from each language. */
  keyboardInputMethod: KeyboardInputMethod;
  /**
   * Japanese-only: show furigana readings over kanji. Local rather than a
   * synced user_prefs column, same reasoning as keyboardInputMethod — a
   * per-device rendering choice, not an account-level study setting like
   * scriptMode. Defaults on: furigana is a reading aid a beginner wants by
   * default and can turn off once kanji stop needing it, not something to
   * opt into.
   */
  showFurigana: boolean;
  /**
   * Whether hovering/focusing a native-script word that has a matching
   * lexeme shows its romanization in a small tooltip above it — a per-
   * device reading aid, same reasoning as showFurigana, not an account-
   * level study setting like scriptMode. Defaults on for the same reason
   * showFurigana does.
   */
  showRomanizationHints: boolean;
  /**
   * Whether hovering/focusing a native-script word that has a matching
   * lexeme shows its English translation (gloss) in the same tooltip as
   * showRomanizationHints — a per-device reading aid, same reasoning as
   * that setting, not an account-level study setting like scriptMode.
   * Defaults OFF, unlike showFurigana/showRomanizationHints: a translation
   * is a much bigger hint than a reading aid (it hands over the meaning,
   * not just how to say it), so this stays opt-in rather than on-by-default.
   */
  showTranslationHints: boolean;
  /**
   * Whether the real-lesson spotlight overlay (components/tutorial/
   * RealLessonOverlay.tsx) has already been shown for each exercise kind —
   * frontend-only, unlike the onboarding tutorial's completion flag
   * (server-synced, hooks/useTutorialCompletion.ts): this one points out
   * the ACTUAL lesson screen's own controls (which the onboarding mock
   * doesn't have — a real audio button, the language settings cog, real
   * keyboards), so it's shown once per exercise kind independently of
   * whether onboarding's tutorial ran at all.
   */
  seenLessonOverlay: { wordBank: boolean; typeIn: boolean };
}

const DEFAULTS: LocalAppPrefs = {
  suppressSkipWarning: false,
  keyboardInputMethod: { fa: "layout", ja: "phonetic" },
  showFurigana: true,
  showRomanizationHints: true,
  showTranslationHints: false,
  seenLessonOverlay: { wordBank: false, typeIn: false },
};

function storageKey(userId: string): string {
  return `qamooscheh.localPrefs.${userId}`;
}

export function loadLocalAppPrefs(userId: string): LocalAppPrefs {
  const raw = safeStorage.getItem(storageKey(userId));
  if (!raw) return { ...DEFAULTS };
  try {
    // Spread over the defaults rather than trusting the parse: a stored blob
    // written by an older build is missing whatever keys were added since.
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<LocalAppPrefs>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveLocalAppPrefs(userId: string, patch: Partial<LocalAppPrefs>): void {
  const next = { ...loadLocalAppPrefs(userId), ...patch };
  safeStorage.setItem(storageKey(userId), JSON.stringify(next));
  notifyLocalAppPrefsListeners();
}

// Every field here is read through its own useState-per-component hook
// (useShowFurigana, useShowRomanizationHints, useShowTranslationHints, ...),
// each initialized once from storage — without this, one instance's setter
// (e.g. the language-settings cog) would write localStorage correctly but
// every OTHER already-mounted instance (e.g. the lesson page underneath it)
// would keep rendering its own stale initial read until it happened to
// remount. hooks/useLocalAppPref.ts subscribes every instance to this so a
// change from any one of them is visible everywhere immediately.
const listeners = new Set<() => void>();

export function subscribeLocalAppPrefsListener(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyLocalAppPrefsListeners(): void {
  listeners.forEach((listener) => listener());
}
