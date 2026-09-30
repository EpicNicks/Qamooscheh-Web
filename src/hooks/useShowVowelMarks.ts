// Same shape as useShowRomanizationHints.ts for a different per-device local
// setting — see localAppPrefs.ts's showVowelMarks.
import { useLocalAppPref } from "./useLocalAppPref";

export function useShowVowelMarks() {
  const [enabled, setShowVowelMarks] = useLocalAppPref("showVowelMarks", false);
  return { enabled, setShowVowelMarks };
}
