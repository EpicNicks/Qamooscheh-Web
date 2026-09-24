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

/**
 * How an RTL native-script text BLOCK (an exercise prompt, a revealed
 * answer, a story transcript line) lines up on the page — independent of
 * `dir`, which only controls character/word order within a line and stays
 * "rtl" regardless of this setting. Defaults to "left": a right-aligned
 * paragraph of Persian has each line's start land wherever that line
 * happens to end (varying with its length), so scanning down several lines
 * means the eye re-hunting for the next line's start every time; pinning
 * every line's start to the same left edge (while the words within each
 * line still read right-to-left) removes that hunt.
 */
export type NativeTextAlign = "left" | "center" | "right";

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
  /** See NativeTextAlign's own doc. Defaults to "left". */
  nativeTextAlign: NativeTextAlign;
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
  /**
   * The last local calendar day (`YYYY-MM-DD`, this device's own clock — not
   * user_prefs' server-side day_start_hour bucketing, which PathPage's
   * DailyGoalRing has no reason to duplicate for a purely cosmetic
   * first-time-per-day celebration) the daily-XP-goal celebration was shown,
   * or null if never. Local rather than synced: it gates an animation, not a
   * fact about the learner's study — the same reasoning suppressSkipWarning
   * stays local.
   */
  lastGoalCelebrationDay: string | null;
  /** Whether the daily-XP-goal completion animation plays at all — a learner who finds it distracting can turn it off without losing the goal/progress tracking itself. Defaults on. */
  goalCelebrationEnabled: boolean;
  /**
   * Per-script font choice (domain/fonts.ts) — `family: null` means "use the
   * built-in fallback stack", same convention resolveFontStack itself uses.
   * Local, not a synced user_prefs column: which font renders best on THIS
   * device/OS is a per-device fact (a font installed on a work laptop may
   * not be on a phone), not an account-level study setting. `custom` is
   * "pro mode": hand-entered font names, persisted so they reappear as
   * regular choices next session. `latin` applies app-wide (English UI text
   * and romanized/Latin course text alike) rather than per-course, since
   * code and language coincide 1:1 today (domain/language.ts's own caveat)
   * — there is no scenario yet where two different-language courses would
   * need independent Latin choices.
   */
  fontPrefs: Record<
    "fa" | "ja" | "latin",
    { family: string | null; sizePct: number; custom: string[] }
  >;
  /** True once the learner has ticked "Don't ask me again" on the remove-custom-font confirmation (Settings -> Appearance). */
  suppressRemoveFontWarning: boolean;
  /**
   * Which flag represents the Persian course's badge (CourseSwitcher,
   * CourseCatalogList)
   */
  persianFlag: "pahlavi" | "iri";
  /**
   * Whether a native-script exercise lets the device's own keyboard (a
   * phone's OS keyboard, a Bluetooth keyboard's own popup, ...) come up
   * instead of suppressing it for the app's on-screen one. A per-device UI
   * choice, same reasoning as keyboardInputMethod, not an account-level
   * study setting. Defaults off: TypeInExercise sets `inputMode="none"` on
   * the answer input specifically so the on-screen keyboard is the only one
   * a learner sees by default — this is the opt-out for someone who'd
   * rather type on their own keyboard and skip the on-screen one entirely
   * (showing both at once would just be clutter, which is why enabling this
   * also hides the on-screen keyboard rather than showing both).
   */
  deviceInputEnabled: boolean;
}

const DEFAULTS: LocalAppPrefs = {
  suppressSkipWarning: false,
  keyboardInputMethod: { fa: "layout", ja: "phonetic" },
  showFurigana: true,
  showRomanizationHints: true,
  showTranslationHints: false,
  nativeTextAlign: "left",
  seenLessonOverlay: { wordBank: false, typeIn: false },
  lastGoalCelebrationDay: null,
  goalCelebrationEnabled: true,
  fontPrefs: {
    fa: { family: null, sizePct: 100, custom: [] },
    ja: { family: null, sizePct: 100, custom: [] },
    latin: { family: null, sizePct: 100, custom: [] },
  },
  suppressRemoveFontWarning: false,
  persianFlag: "pahlavi",
  deviceInputEnabled: false,
};

function storageKey(userId: string): string {
  return `qamooscheh.localPrefs.${userId}`;
}

function readFromStorage(userId: string): LocalAppPrefs {
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

/**
 * One cached object per user rather than re-parsing storage on every call.
 * `useLocalAppPref` reads an object-valued field (`keyboardInputMethod`,
 * `seenLessonOverlay`) straight through `useSyncExternalStore`, which compares
 * snapshots by reference — a fresh `JSON.parse` on every call hands it a new
 * object every time even when nothing changed, which is exactly
 * "getSnapshot should be cached" and, once React notices the mismatch on its
 * own re-check, an infinite render loop (a real crash this caused, not a
 * theoretical one). Keeping one object per user and only replacing it in
 * `saveLocalAppPrefs` gives every unrelated field the same reference across
 * calls, the same way a plain `useState` would.
 */
const cache = new Map<string, LocalAppPrefs>();

export function loadLocalAppPrefs(userId: string): LocalAppPrefs {
  let prefs = cache.get(userId);
  if (!prefs) {
    prefs = readFromStorage(userId);
    cache.set(userId, prefs);
  }
  return prefs;
}

export function saveLocalAppPrefs(
  userId: string,
  patch: Partial<LocalAppPrefs>,
): void {
  const next = { ...loadLocalAppPrefs(userId), ...patch };
  cache.set(userId, next);
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

export function subscribeLocalAppPrefsListener(
  listener: () => void,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyLocalAppPrefsListeners(): void {
  listeners.forEach((listener) => listener());
}
