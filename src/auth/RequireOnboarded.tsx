import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useBootstrap } from "../hooks/useBootstrap";
import { Spinner } from "../components/common/Spinner";

/**
 * The second gate, inside `RequireAuth`: signed in, but enrolled in nothing.
 *
 * Since registration stopped implicitly provisioning a default course, that is
 * a real, reachable state rather than an impossible one — `GET /v1/bootstrap`
 * answers `course: null, enrolledCourseCodes: []` for it, and every screen
 * under `AppShell` is written assuming a course exists.
 *
 * Waits for the query to settle before deciding: redirecting on a still-pending
 * bootstrap would send every signed-in user through /onboarding for a frame on
 * every cold load.
 *
 * A FAILED bootstrap falls through to the children rather than redirecting —
 * "the request errored" is not evidence of "you have no courses", and the
 * pages below already surface their own bootstrap errors.
 */
export function RequireOnboarded({ children }: { children: ReactNode }) {
  const bootstrap = useBootstrap();

  if (bootstrap.isPending) return <Spinner label="Loading your courses…" />;
  if (bootstrap.data && bootstrap.data.enrolledCourseCodes.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
