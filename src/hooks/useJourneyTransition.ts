import { useEffect, useRef } from "react";
import { diffPathProgress, type PathUnit } from "../domain/pathProgress";
import {
  clearPendingCompletion,
  lastShownPath,
  rememberShownPath,
  takePendingCompletion,
} from "../lib/journeyTransition";
import {
  domJourneyAnimator,
  type JourneyAnimator,
} from "../lib/journeyAnimator";

/**
 * Plays the completion animation once when the Journey's path changes after a
 * graded pass (see lib/journeyTransition.ts). `path` must be the settled path:
 * pass an empty one while loading.
 */
export function useJourneyTransition(
  path: PathUnit[],
  animator: JourneyAnimator = domJourneyAnimator,
) {
  const playing = useRef(false);

  useEffect(() => {
    if (path.length === 0) return;
    const before = lastShownPath();
    const keys = takePendingCompletion();
    if (!keys || !before) {
      rememberShownPath(path);
      return;
    }
    if (before === path || playing.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      clearPendingCompletion();
      rememberShownPath(path);
      return;
    }
    // A finish lands as two pieces, the cursor (bootstrap) and the completed keys (their own fetch), in either
    // order. Until the pass shows as completed in the new path, keep the old baseline so the diff still sees
    // the cursor move; the pending record's timeout drops a half that never arrives.
    const transition = keys
      .filter((key) =>
        path.some((u) =>
          u.standardPositions.some((p) =>
            p.skills.some((s) => s.skillKey === key && s.completed),
          ),
        ),
      )
      .map((key) => diffPathProgress(before, path, key))
      .find((t) => t != null);
    if (!transition) return;
    rememberShownPath(path);
    clearPendingCompletion();
    playing.current = true;
    void (async () => {
      try {
        // Wait a frame so the road has rendered the new state the animation draws over.
        await new Promise((resolve) => requestAnimationFrame(resolve));
        await animator.drawEdges(transition.edges);
        if (transition.unlockedSkillKeys.length > 0)
          await animator.playUnlock(transition.unlockedSkillKeys);
      } finally {
        playing.current = false;
      }
    })();
  }, [path, animator]);
}
