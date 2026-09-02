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
  seenLessonOverlay: { wordBank: false, typeIn: false },
};

function storageKey(userId: string): string {
  return `qamooscheh.localPrefs.${userId}`;
}

export function loadLocalAppPrefs(userId: string): LocalAppPrefs {
  const raw = localStorage.getItem(storageKey(userId));
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
  localStorage.setItem(storageKey(userId), JSON.stringify(next));
}
