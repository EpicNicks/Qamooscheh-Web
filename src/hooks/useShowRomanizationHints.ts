// Same shape as useShowFurigana.ts for a different per-device local
// setting — see localAppPrefs.ts's own doc on why this one stays local
// rather than joining user_prefs.
import { useState } from "react";
import { useAuth } from "../auth/useAuth";
import { loadLocalAppPrefs, saveLocalAppPrefs } from "../lib/localAppPrefs";

export function useShowRomanizationHints() {
  const { userId } = useAuth();
  const [enabled, setEnabled] = useState(() => (userId ? loadLocalAppPrefs(userId).showRomanizationHints : true));

  function setShowRomanizationHints(next: boolean) {
    setEnabled(next);
    if (userId) saveLocalAppPrefs(userId, { showRomanizationHints: next });
  }

  return { enabled, setShowRomanizationHints };
}
