import { useCallback, useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { Button } from "../components/common/Button";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { Spinner } from "../components/common/Spinner";
import { graderGate } from "../domain/lessonPin";
import { GraderHoldContext } from "./GraderContext";
import { useGraderState } from "./useGrader";

/**
 * Layout route for the screens that grade answers. Waits for the published
 * grader rather than grading with something cruder, and says so when there is
 * none to wait for: grading and XP both come from it, so without a cached copy
 * (offline on a first visit) a lesson can't be graded at all.
 */
export function RequireGrader() {
  const { state, ensure } = useGraderState();
  // A lesson that has pinned its grader (useHoldGrader) stays mounted when the
  // provider leaves "ready" (a language change): it keeps grading with the
  // pinned one (pinFirst) and the next lesson gets the new one. Before that the
  // gate applies, so nothing is graded without a grader.
  const holds = useRef(0);
  const hold = useCallback(() => {
    holds.current += 1;
    return () => {
      holds.current -= 1;
    };
  }, []);
  useEffect(() => {
    ensure();
    // Once per mount: ensure() changes with the state, and re-running it on every change would retry a failed load in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gate = graderGate(state.status, holds.current > 0);
  if (gate === "loading") return <Spinner label="Loading the answer checker…" />;
  if (gate === "unavailable" && state.status === "unavailable") {
    return (
      <div>
        <ErrorBanner
          message={
            state.offline
              ? "Grading is unavailable offline: the answer checker hasn't been downloaded on this device yet. Reconnect and it will load."
              : "Couldn't load the answer checker, so lessons can't be graded right now."
          }
        />
        <Button variant="secondary" onClick={ensure}>
          Try again
        </Button>
      </div>
    );
  }
  return (
    <GraderHoldContext.Provider value={hold}>
      <Outlet />
    </GraderHoldContext.Provider>
  );
}
