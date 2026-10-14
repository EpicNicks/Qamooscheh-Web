import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Button } from "../components/common/Button";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { Spinner } from "../components/common/Spinner";
import { useGraderState } from "./useGrader";

/**
 * Layout route for the screens that grade answers. Waits for the published
 * grader rather than grading with something cruder, and says so when there is
 * none to wait for: grading and XP both come from it, so without a cached copy
 * (offline on a first visit) a lesson can't be graded at all.
 */
export function RequireGrader() {
  const { state, ensure } = useGraderState();
  // No hold on the previous state: the provider only leaves a settled state
  // when the language changes, and the old language's grader must not grade
  // the new one's answers. An open lesson is kept on its own grader by the
  // engine (pinFirst), not here.
  useEffect(() => {
    ensure();
    // Once per mount: ensure() changes with the state, and re-running it on every change would retry a failed load in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.status === "loading") return <Spinner label="Loading the answer checker…" />;
  if (state.status === "unavailable") {
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
  return <Outlet />;
}
