// Same shape as useKeyboardInputMethod.ts for a different per-device local
// setting — see localAppPrefs.ts's own doc on why this one stays local
// rather than joining user_prefs.
import { useState } from "react";
import { useAuth } from "../auth/useAuth";
import { loadLocalAppPrefs, saveLocalAppPrefs } from "../lib/localAppPrefs";

export function useShowFurigana() {
  const { userId } = useAuth();
  const [enabled, setEnabled] = useState(() => (userId ? loadLocalAppPrefs(userId).showFurigana : true));

  function setShowFurigana(next: boolean) {
    setEnabled(next);
    if (userId) saveLocalAppPrefs(userId, { showFurigana: next });
  }

  return { enabled, setShowFurigana };
}
