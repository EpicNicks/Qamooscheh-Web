// Local-only "has the real-lesson overlay already run for this exercise
// kind" — see localAppPrefs.ts's seenLessonOverlay doc for why this is
// frontend-only rather than joining the server-synced onboarding-tutorial flag.
import { useState } from "react";
import { useAuth } from "../auth/useAuth";
import { loadLocalAppPrefs, saveLocalAppPrefs } from "../lib/localAppPrefs";

export type LessonOverlayKind = "wordBank" | "typeIn";

export function useLessonOverlaySeen(kind: LessonOverlayKind) {
  const { userId } = useAuth();
  // A plain lazy initializer, the same shape useKeyboardInputMethod.ts uses:
  // AuthProvider seeds its session synchronously in its own useState
  // initializer (`useState(() => loadSession())`), so `userId` is already
  // whatever it is going to be on this hook's very first render — there is no
  // later arrival to re-seed from. Signed out, nothing is "unseen": the
  // overlay is a signed-in lesson's affordance tour.
  const [seen, setSeen] = useState(() => (userId ? loadLocalAppPrefs(userId).seenLessonOverlay[kind] : true));

  function markSeen() {
    setSeen(true);
    if (!userId) return;
    const current = loadLocalAppPrefs(userId).seenLessonOverlay;
    saveLocalAppPrefs(userId, { seenLessonOverlay: { ...current, [kind]: true } });
  }

  return { seen, markSeen };
}
