// Same shape as useShowRomanizationHints.ts for a different per-device local
// setting — see localAppPrefs.ts's own doc on why this one stays local
// rather than joining user_prefs.
import { useLocalAppPref } from "./useLocalAppPref";

export function useShowTranslationHints() {
  const [enabled, setShowTranslationHints] = useLocalAppPref("showTranslationHints", false);
  return { enabled, setShowTranslationHints };
}
