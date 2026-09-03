// Same shape as useKeyboardInputMethod.ts for a different per-device local
// setting — see localAppPrefs.ts's own doc on why this one stays local
// rather than joining user_prefs.
import { useLocalAppPref } from "./useLocalAppPref";

export function useShowFurigana() {
  const [enabled, setShowFurigana] = useLocalAppPref("showFurigana", true);
  return { enabled, setShowFurigana };
}
