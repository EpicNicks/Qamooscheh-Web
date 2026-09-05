import { ApiError } from "../../api/httpClient";
import { useRollForwardCourse } from "../../hooks/useEnrollment";
import { errorMessage } from "../../lib/errors";
import type { CourseUpdateRef } from "../../types/api";
import { Button } from "../common/Button";
import styles from "./CourseUpdateBanner.module.css";

/**
 * The learning tab's "a new version of this course exists" prompt. Sticky at
 * the top of the path's content column so it survives scrolling the road
 * instead of disappearing after a few seconds — the learner decides when
 * they're done with it, not a timer.
 *
 * Rendered whenever `bootstrap.data.update` is non-null; `eligible: false` is
 * a normal, expected state (not an error) and still shows the offer, with a
 * generic hint, rather than hiding it — hiding it here would leave the
 * learner with no way to understand why their course stopped growing.
 *
 * The button stays clickable even when `eligible` is false: roll-forward is
 * read-only until it actually applies a move (Qamooscheh.Api's
 * EnrollmentService.RollForwardAsync only writes after its own eligibility
 * check passes), so an ineligible click costs nothing but a 409 — and that
 * 409's `error` is the ONE place the learner gets the real, specific reason
 * ("you're at (2, 3), version 5's transfer point is (3, 1)"), not the
 * generic pre-click hint. Disabling the button on `!eligible` would hide that
 * behind a control the learner can never press.
 */
export function CourseUpdateBanner({ courseCode, update }: { courseCode: string; update: CourseUpdateRef }) {
  const rollForward = useRollForwardCourse();

  // Captured once the confirm click actually lands, from the exact `update`
  // this render was offering — see RollForwardCourseRequest's doc comment on
  // why "whatever version is current now" would be wrong here.
  const confirm = () => rollForward.mutate({ courseCode, toVersion: update.version });

  const conflict = rollForward.error instanceof ApiError && rollForward.error.status === 409 ? rollForward.error : null;
  const unavailable = rollForward.error instanceof ApiError && rollForward.error.status === 503;
  const otherError = rollForward.error && !conflict && !unavailable ? rollForward.error : null;

  return (
    <div className={styles.banner} role="status">
      <div className={styles.text}>
        <p className={styles.title}>Course update available — version {update.version}</p>
        {!update.eligible && !conflict && (
          <p className={styles.hint}>Finish your current unit to update — tap Update to see exactly what's left.</p>
        )}
        {/* The server's own message, verbatim — CoursesExceptions.cs's
            RollForwardRefusedException is written to be handed to a client
            as-is (it quotes only version numbers and positions), so this is
            more specific than any client-side gloss could be. */}
        {conflict && <p className={styles.hint}>{errorMessage(conflict, "That version isn't ready for you yet.")}</p>}
        {unavailable && (
          <p className={styles.hint}>That version isn't published yet — try again in a moment.</p>
        )}
        {otherError && <p className={styles.hint}>{errorMessage(otherError, "Couldn't update the course.")}</p>}
      </div>
      <Button type="button" onClick={confirm} disabled={rollForward.isPending}>
        {rollForward.isPending ? "Updating…" : conflict || unavailable ? "Try again" : "Update"}
      </Button>
    </div>
  );
}
