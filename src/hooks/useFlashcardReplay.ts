// Re-sends flashcard rounds (lib/flashcardAttempt.ts) whose answer never
// arrived — a reload, a closed tab or a dropped connection mid-submit — with
// their original submissionId and occurredAt. Mounted once for the whole
// authenticated app (components/layout/AppShell.tsx), like the offline queue's
// flush, on load and whenever the connection returns. A round a page is still
// sending is left to that page's own request.
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isFlashcardSubmitInFlight, submitFlashcardsDurably } from "../api/flashcards";
import { loadFlashcardAttempts } from "../lib/flashcardAttempt";
import { useAuth } from "../auth/useAuth";

export function useFlashcardReplay() {
  const { userId, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    const uid = userId;
    let replaying = false;

    async function replay() {
      if (replaying) return;
      replaying = true;
      try {
        let landed = false;
        for (const attempt of loadFlashcardAttempts(uid)) {
          if (isFlashcardSubmitInFlight(attempt.submissionId)) continue;
          try {
            await submitFlashcardsDurably(uid, attempt);
            landed = true;
          } catch {
            // A rejection settled it (the attempt is gone); a network failure
            // or an account change leaves it saved for the next trigger.
          }
        }
        if (landed) {
          for (const key of ["activity", "streak", "bootstrap", "sessionPlan"]) queryClient.invalidateQueries({ queryKey: [key] });
          queryClient.invalidateQueries({ queryKey: ["league", "current"] });
        }
      } finally {
        replaying = false;
      }
    }

    void replay();
    window.addEventListener("online", replay);
    return () => window.removeEventListener("online", replay);
  }, [userId, isAuthenticated, queryClient]);
}
