// Local-only "has the real-lesson overlay already run for this exercise
// kind" — see localAppPrefs.ts's seenLessonOverlay doc for why this is
// frontend-only rather than joining the server-synced onboarding-tutorial flag.
import { useState } from "react";
import { useAuth } from "../auth/useAuth";
import { loadLocalAppPrefs, saveLocalAppPrefs } from "../lib/localAppPrefs";

export type LessonOverlayKind = "wordBank" | "typeIn";

export function useLessonOverlaySeen(kind: LessonOverlayKind) {
  const { userId } = useAuth();
  const [seen, setSeen] = useState(false);
  // userId arrives asynchronously on first load — a lazy initializer would
  // freeze on whatever it was on the very first render (null), same pitfall
  // useStarredLexemes.ts's own doc calls out. Re-seed during render (not a
  // useEffect) when it actually changes.
  const [checkedFor, setCheckedFor] = useState<string | null | undefined>(undefined);
  if (userId !== checkedFor) {
    setCheckedFor(userId);
    setSeen(userId ? loadLocalAppPrefs(userId).seenLessonOverlay[kind] : true);
  }

  function markSeen() {
    setSeen(true);
    if (!userId) return;
    const current = loadLocalAppPrefs(userId).seenLessonOverlay;
    saveLocalAppPrefs(userId, { seenLessonOverlay: { ...current, [kind]: true } });
  }

  return { seen, markSeen };
}
