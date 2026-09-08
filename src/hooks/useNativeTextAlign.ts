// Same shape as useShowRomanizationHints.ts for a different per-device local
// setting — see localAppPrefs.ts's own doc on NativeTextAlign for why this
// stays local rather than joining user_prefs, and on why it defaults left.
import { useLocalAppPref } from "./useLocalAppPref";

export function useNativeTextAlign() {
  const [align, setNativeTextAlign] = useLocalAppPref("nativeTextAlign", "left");
  return { align, setNativeTextAlign };
}
