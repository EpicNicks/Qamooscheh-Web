import { useState } from "react";
import { RollForwardConfirmDialog } from "./RollForwardConfirmDialog";
import type { CourseRef, CourseUpdateRef } from "../../types/api";
import { Button } from "../common/Button";
import styles from "./CourseUpdateBanner.module.css";

/**
 * The learning tab's "a new version of this course exists" prompt. Sticky at
 * the top of the path's content column so it survives scrolling the road
 * instead of disappearing after a few seconds — the learner decides when
 * they're done with it, not a timer.
 *
 * Rendered whenever `bootstrap.data.update` is non-null; `eligible: false` is
 * now the abandoned-branch case (a purely structural check, not a
 * progress-based one — see CourseUpdateRef's doc comment) and still shows the
 * offer rather than hiding it, so the learner isn't left wondering why their
 * course stopped growing.
 *
 * Tapping Update no longer rolls forward directly — it opens
 * RollForwardConfirmDialog, which fetches the roll-forward preview and shows
 * exactly where the learner will land (plus a clamp notice) before anything
 * actually moves.
 */
export function CourseUpdateBanner({ course, update }: { course: CourseRef; update: CourseUpdateRef }) {
  const [confirming, setConfirming] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <>
      <div className={styles.banner} role="status">
        <div className={styles.text}>
          <p className={styles.title}>Course update available — version {update.version}</p>
          {update.notes ? (
            <p className={styles.hint}>{update.notes}</p>
          ) : (
            !update.eligible && <p className={styles.hint}>Tap Update to see what's going on.</p>
          )}
        </div>
        <Button type="button" onClick={() => setConfirming(true)}>
          Update
        </Button>
        {/* No persistence yet — reappears next time the journey page mounts. Debounce TBD. */}
        <button type="button" className={styles.close} aria-label="Dismiss update notice" onClick={() => setDismissed(true)}>
          ✕
        </button>
      </div>
      {confirming && (
        <RollForwardConfirmDialog
          fromCourse={course}
          toVersion={update.version}
          onCancel={() => setConfirming(false)}
          onDone={() => setConfirming(false)}
        />
      )}
    </>
  );
}
