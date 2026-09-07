import { useEffect, useRef } from "react";
import { useRollForwardCourse, useRollForwardPreview } from "../../hooks/useEnrollment";
import { useRollForwardPositionTitle } from "../../hooks/useCourseContent";
import { errorMessage } from "../../lib/errors";
import type { CourseRef, RollForwardPositionRef } from "../../types/api";
import { Button } from "../common/Button";
import { Spinner } from "../common/Spinner";
import styles from "./RollForwardConfirmDialog.module.css";

/** "Unit x Lesson y: Unit name - Lesson name" — indices are 0-based on the wire, so +1 for display. */
function formatPosition(ref: RollForwardPositionRef, title: { unitTitle: string; skillTitle: string } | undefined): string {
  const locator = `Unit ${ref.unitIndex + 1} Lesson ${ref.lessonIndex + 1}`;
  return title ? `${locator}: ${title.unitTitle} - ${title.skillTitle}` : locator;
}

/**
 * The "you tapped Update" confirmation, opened from CourseUpdateBanner.
 * Follows SkipLessonModal's pattern (the first modal in this codebase) for
 * the overlay/role/focus-trap/Escape wiring.
 *
 * Loads the roll-forward preview itself (read-only, safe to reopen any
 * number of times) rather than taking it as a prop, so the dialog can be
 * mounted lazily from the banner without the banner needing to know
 * anything about preview data.
 */
export function RollForwardConfirmDialog({
  fromCourse,
  toVersion,
  onCancel,
  onDone,
}: {
  /** The currently-pinned course — also the source of `fromVersion`'s manifest for title resolution. */
  fromCourse: CourseRef;
  toVersion: number;
  onCancel: () => void;
  /** Called once the roll-forward actually lands, so the caller can dismiss the dialog. */
  onDone: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const preview = useRollForwardPreview(fromCourse.code, toVersion, true);
  const rollForward = useRollForwardCourse();

  const toCourse: CourseRef | null = preview.data
    ? { code: fromCourse.code, version: preview.data.toVersion, manifestSha256: preview.data.manifestSha256 }
    : null;

  const fromTitle = useRollForwardPositionTitle(fromCourse, preview.data?.from ?? null);
  const toTitle = useRollForwardPositionTitle(toCourse, preview.data?.to ?? null);

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button");
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const confirm = () => {
    // Captured from the preview's own `toVersion`, not the `toVersion` prop —
    // they're always equal, but this is the value the shown preview actually
    // described, per RollForwardCourseRequest's doc comment.
    if (!preview.data) return;
    rollForward.mutate({ courseCode: fromCourse.code, toVersion: preview.data.toVersion }, { onSuccess: onDone });
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="roll-forward-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="roll-forward-title" className={styles.title}>
          Update to version {toVersion}?
        </h2>

        {preview.isLoading && <Spinner label="Checking what's new…" />}
        {preview.isError && <p className={styles.notes}>{errorMessage(preview.error, "Couldn't check this update.")}</p>}

        {preview.data && (
          <>
            {preview.data.updateNotes && <p className={styles.notes}>{preview.data.updateNotes}</p>}

            {preview.data.from != null &&
            preview.data.to != null &&
            preview.data.from.unitKey === preview.data.to.unitKey &&
            preview.data.from.skillKey === preview.data.to.skillKey ? (
              <p>Your progress will be preserved.</p>
            ) : (
              <div className={styles.positions}>
                <div>
                  <p className={styles.label}>Current position</p>
                  {preview.data.from == null ? (
                    <p>You'll start at the first lesson you still owe.</p>
                  ) : (
                    <p>{formatPosition(preview.data.from, fromTitle)}</p>
                  )}
                </div>
                <div>
                  <p className={styles.label}>After updating</p>
                  {preview.data.to == null ? (
                    <p>Your position won't move.</p>
                  ) : (
                    <p>{formatPosition(preview.data.to, toTitle)}</p>
                  )}
                </div>
              </div>
            )}

            {preview.data.clamped && (
              <p className={styles.clampNotice}>
                Heads up — this version is shorter where you are, so this update moves you back a little.
              </p>
            )}
          </>
        )}

        {rollForward.error && <p className={styles.error}>{errorMessage(rollForward.error, "Couldn't update the course.")}</p>}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={!preview.data || rollForward.isPending}>
            {rollForward.isPending ? "Updating…" : "Update"}
          </Button>
        </div>
      </div>
    </div>
  );
}
