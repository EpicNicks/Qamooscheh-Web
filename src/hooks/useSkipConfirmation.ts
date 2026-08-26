// The "are you sure you want to skip?" gate, shared by every screen that can
// be walked away from mid-way (LessonPage, StoryPage).
//
// The whole reason this is a hook rather than repeated state in each page is
// the suppression check: "don't ask me again" has to be consulted at exactly
// one place, or a second caller silently gets a different answer from the
// first. The modal component stays in the pages' own JSX — what differs
// between them is only what sits beside it.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { loadLocalAppPrefs, saveLocalAppPrefs } from "../lib/localAppPrefs";

const DESTINATION = "/path";

export interface SkipConfirmation {
  /** True while the confirm modal should be on screen. */
  isConfirming: boolean;
  /** Wire to the Skip button: leaves immediately if the learner has suppressed the warning, otherwise opens the modal. */
  requestSkip: () => void;
  /** Wire to the modal's confirm: persists the suppression if asked, then leaves. */
  confirmSkip: (dontAskAgain: boolean) => void;
  /** Wire to the modal's cancel/dismiss. */
  cancelSkip: () => void;
}

export function useSkipConfirmation(): SkipConfirmation {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [isConfirming, setIsConfirming] = useState(false);

  return {
    isConfirming,

    requestSkip() {
      // Leaving is a plain navigate in both callers: neither has submitted
      // anything yet — their single POST fires only once the queue empties,
      // which by definition hasn't happened while a Skip button is still on
      // screen.
      if (userId && loadLocalAppPrefs(userId).suppressSkipWarning) {
        navigate(DESTINATION);
        return;
      }
      setIsConfirming(true);
    },

    confirmSkip(dontAskAgain: boolean) {
      if (dontAskAgain && userId) saveLocalAppPrefs(userId, { suppressSkipWarning: true });
      navigate(DESTINATION);
    },

    cancelSkip() {
      setIsConfirming(false);
    },
  };
}
