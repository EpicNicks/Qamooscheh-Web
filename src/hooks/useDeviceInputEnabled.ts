// Same shape as useShowFurigana.ts for a different per-device local setting —
// see localAppPrefs.ts's own doc on why this one stays local rather than
// joining user_prefs.
import { useLocalAppPref } from "./useLocalAppPref";

export function useDeviceInputEnabled() {
  const [enabled, setEnabled] = useLocalAppPref("deviceInputEnabled", false);
  return { enabled, setEnabled };
}
