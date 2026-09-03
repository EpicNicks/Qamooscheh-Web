// Shared shape behind useShowFurigana/useShowRomanizationHints/
// useShowTranslationHints (and any future per-device toggle) — see
// localAppPrefs.ts's own doc on why these stay local rather than joining
// user_prefs. Backed by useSyncExternalStore/subscribeLocalAppPrefsListener
// so every mounted reader of the same field re-renders the moment ANY of
// them calls the setter, not just its own instance — a checkbox ticked in
// the language-settings popover has to take effect on the lesson page
// already on screen underneath it, not just after that page happens to
// remount.
import { useCallback, useSyncExternalStore } from "react";
import { useAuth } from "../auth/useAuth";
import { loadLocalAppPrefs, saveLocalAppPrefs, subscribeLocalAppPrefsListener, type LocalAppPrefs } from "../lib/localAppPrefs";

export function useLocalAppPref<K extends keyof LocalAppPrefs>(
  key: K,
  defaultWhenSignedOut: LocalAppPrefs[K],
): [LocalAppPrefs[K], (next: LocalAppPrefs[K]) => void] {
  const { userId } = useAuth();

  const value = useSyncExternalStore(subscribeLocalAppPrefsListener, () =>
    userId ? loadLocalAppPrefs(userId)[key] : defaultWhenSignedOut,
  );

  const setValue = useCallback(
    (next: LocalAppPrefs[K]) => {
      if (userId) saveLocalAppPrefs(userId, { [key]: next } as Partial<LocalAppPrefs>);
    },
    [userId, key],
  );

  return [value, setValue];
}
