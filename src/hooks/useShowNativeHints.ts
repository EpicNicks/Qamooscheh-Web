// Same shape as useShowRomanizationHints.ts for a different per-device local
// setting — see localAppPrefs.ts's showNativeHints.
import { useLocalAppPref } from "./useLocalAppPref";

export function useShowNativeHints() {
  const [enabled, setShowNativeHints] = useLocalAppPref("showNativeHints", false);
  return { enabled, setShowNativeHints };
}
