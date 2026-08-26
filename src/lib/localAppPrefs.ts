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
export interface LocalAppPrefs {
  /** True once the learner has ticked "Don't ask me again" on the skip confirmation. */
  suppressSkipWarning: boolean;
}

const DEFAULTS: LocalAppPrefs = {
  suppressSkipWarning: false,
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
