import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useBootstrap } from "../../hooks/useBootstrap";
import { useThemeIndex } from "../../hooks/useCourseContent";
import { themesForLesson } from "../../domain/themeLookup";
import { Button } from "../common/Button";
import { CloseIcon } from "../common/icons";
// Same dialog chrome as LeaveCheckpointModal/SkipLessonModal — overlay,
// centred card, manual focus-trap/Escape — this file just adds its own
// topic-chip row on top of the same shape.
import styles from "./DeepDiveChooserModal.module.css";

/**
 * Opened from a Journey popover's "Deep Dive" button (LessonStartPopover /
 * SkillGroupModal, via useSkillActions.hasDeepDive). Offers the two Deep
 * Dive entry points for the tapped lesson: a blended remix across every
 * theme it belongs to, or browsing one specific theme directly.
 *
 * Portalled to document.body — mandatory here, unlike LeaveCheckpointModal:
 * this opens from SkillNode/SkillGroupNode, both nested under SkillRoad's
 * `.nodeWrap`, which carries `transform: translateY(-50%)`. A transformed
 * ancestor becomes the containing block for a `position: fixed` descendant
 * in every modern browser, so without the portal this dialog sizes and
 * positions itself against that 84px node box instead of the viewport —
 * see LessonStartPopover.tsx's own long comment on the exact same issue.
 */
export function DeepDiveChooserModal({ lessonKey, onClose }: { lessonKey: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const bootstrap = useBootstrap();
  const themeIndex = useThemeIndex(bootstrap.data?.course ?? null);
  const themes = themesForLesson(themeIndex.data, lessonKey);

  useEffect(() => {
    // Skips the close × (now first in DOM order) so opening focuses the
    // actual primary action instead.
    dialogRef.current?.querySelector<HTMLElement>(`button:not(.${styles.close})`)?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
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
  }, [onClose]);

  function goRemix() {
    onClose();
    navigate(`/lesson/deep-dive-remix/${encodeURIComponent(lessonKey)}`);
  }

  function goTopic(themeId: string) {
    onClose();
    navigate(`/themes/${encodeURIComponent(themeId)}?from=${encodeURIComponent(lessonKey)}`);
  }

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deep-dive-chooser-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
          <CloseIcon />
        </button>
        <h2 id="deep-dive-chooser-title" className={styles.title}>
          Deep Dive
        </h2>
        <p className={styles.body}>
          Practice a blend across everything this lesson touches on, or pick one topic to browse.
        </p>

        <Button variant="deepDive" onClick={goRemix}>
          Remix all topics
        </Button>

        {themes.length > 0 && (
          <>
            <p className={styles.body}>Or pick one topic:</p>
            <div className={styles.topicList}>
              {themes.map((theme) => (
                <Button key={theme.id} variant="secondary" onClick={() => goTopic(theme.id)}>
                  {theme.id}
                </Button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
