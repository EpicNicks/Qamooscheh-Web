import { useEffect, useRef } from "react";
import { CourseCatalogList } from "./CourseCatalogList";
import { ErrorBanner } from "../common/ErrorBanner";
import styles from "./CourseCatalogModal.module.css";

const FOCUSABLE = "button, input, [href], select, textarea";

/**
 * "+ Add a language", from the course switcher. Follows SkipLessonModal's
 * pattern exactly — a plain overlay div, no dialog library, but with the
 * accessibility floor a modal can't fake: role/aria wiring, Escape to dismiss,
 * and a Tab focus trap so the page behind stays unreachable.
 *
 * Two deliberate divergences from that file:
 *   - It sizes near-viewport rather than as a small centered card: the body is
 *     a scrolling catalog, not a sentence and two buttons.
 *   - Initial focus goes to the search input rather than the first button. The
 *     point of this dialog is to start typing a language name; landing on a
 *     button would make the first keystroke do nothing.
 */
export function CourseCatalogModal({
  alreadyEnrolledCodes,
  onConfirm,
  onCancel,
  isSubmitting = false,
  error,
}: {
  alreadyEnrolledCodes: string[];
  onConfirm: (courseCode: string) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  /** A failed enrollment, surfaced here rather than in the switcher panel — that panel is closed while this dialog is open. */
  error?: string | null;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
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

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-catalog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="course-catalog-title" className={styles.title}>
          Add a language
        </h2>
        <p className={styles.body}>
          You'll stay in your current course — pick one to add it to your account, then switch whenever you like.
        </p>
        {error && <ErrorBanner message={error} />}

        <CourseCatalogList
          mode="single"
          showFacts
          autoFocusSearch
          alreadyEnrolledCodes={alreadyEnrolledCodes}
          isSubmitting={isSubmitting}
          onConfirm={(codes) => {
            if (codes[0]) onConfirm(codes[0]);
          }}
          onCancel={onCancel}
        />
      </div>
    </div>
  );
}
