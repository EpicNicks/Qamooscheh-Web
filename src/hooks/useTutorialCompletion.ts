import { useState } from "react";
import { useAuth } from "../auth/useAuth";
import { loadTutorialCompleted, saveTutorialCompleted } from "../lib/tutorialCompletionStore";

export function useTutorialCompletion() {
  const { userId } = useAuth();
  const [completed, setCompleted] = useState(() => (userId ? loadTutorialCompleted(userId) : false));

  /** Called on both finishing the tutorial and skipping it — either way, it's been shown once and shouldn't be forced again. */
  function markComplete() {
    setCompleted(true);
    if (userId) saveTutorialCompleted(userId);
  }

  return { completed, markComplete };
}
