// Same shape as useShowRomanizationHints.ts for a different per-device local
// setting — see localAppPrefs.ts's showSentenceRomanization.
import { useLocalAppPref } from "./useLocalAppPref";

export function useShowSentenceRomanization() {
  const [enabled, setShowSentenceRomanization] = useLocalAppPref("showSentenceRomanization", false);
  return { enabled, setShowSentenceRomanization };
}
