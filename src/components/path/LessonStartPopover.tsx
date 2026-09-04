import { useEffect, useRef, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Button } from "../common/Button";
import styles from "./LessonStartPopover.module.css";

/** Gap between the popover's bottom edge and the node's top edge — keeps the tapped tile fully visible underneath, rather than the popover touching or overlapping it. */
const VERTICAL_OFFSET_PX = 12;

interface LessonStartPopoverProps {
  /** The tapped node's own bounding rect, measured at click time — the popover hovers directly above it. */
  anchorRect: DOMRect;
  /** "Start lesson" for the current skill, "Practice" for a past one being revisited — see SkillNode. */
  primaryLabel: string;
  onPrimary: () => void;
  /** Only ever offered on the current skill, and only when there's a position ahead to test into — see domain/pathProgress.ts's findNextStandardTarget. A skill already passed has nothing left to test out of. */
  onSkip?: () => void;
  onReviewVocabulary: () => void;
  onClose: () => void;
}

/**
 * A small popover hovering directly above the tapped lesson node,
 * Duolingo-style — offset up by VERTICAL_OFFSET_PX so the node itself stays
 * fully visible underneath — offering a primary action (Start or Practice,
 * see SkillNode) alongside Skip (test out of the current lesson — see
 * PathPage's use of findNextStandardTarget) and Review vocabulary (browse
 * every lexeme in the course, whichever node this was opened from — the
 * vocab screen is course-wide, not lesson-specific) instead of jumping
 * straight into a lesson/practice the moment a node is tapped.
 *
 * Rendered through a portal into document.body rather than in place:
 * SkillRoad.module.css's `.nodeWrap` (this popover's DOM ancestor otherwise)
 * carries `transform: translateY(-50%)` to centre a node on its curve, and a
 * transformed ancestor becomes the containing block for any `position:
 * fixed` descendant in every modern browser — so without the portal, `top`/
 * `bottom`/`left` below would resolve against that 84px node box instead of
 * the viewport, not against where anchorRect was actually measured.
 */
export function LessonStartPopover({
  anchorRect,
  primaryLabel,
  onPrimary,
  onSkip,
  onReviewVocabulary,
  onClose,
}: LessonStartPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    function onPointerDown(event: PointerEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) onClose();
    }
    // Capture phase so a tap on another skill node closes this popover
    // before that node's own click handler runs, rather than racing it.
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [onClose]);

  // Open focused on the primary action, and hand focus back to whatever
  // opened this (the tapped skill node) on close — this popover only exists
  // while it's open, so mount/unmount is open/close. Without the return, a
  // keyboard user who presses Escape is left with focus on nothing and has to
  // Tab from the top of the document to reach the road again. A node that's
  // since been unmounted (the popover closed by starting the lesson, which
  // navigates away) simply can't take focus, which is harmless.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    popoverRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => opener?.focus();
  }, []);

  // Anchored via `bottom`, not `top` + a measured height: the popover's own
  // height isn't known until it's laid out, but `bottom` lets the browser
  // grow it upward from a fixed point, so it always ends up directly above
  // the node with the same gap regardless of how many buttons it renders.
  const style: CSSProperties = {
    position: "fixed",
    left: anchorRect.left + anchorRect.width / 2,
    bottom: window.innerHeight - anchorRect.top + VERTICAL_OFFSET_PX,
    transform: "translateX(-50%)",
  };

  return createPortal(
    <div ref={popoverRef} className={styles.popover} style={style} role="dialog" aria-label={primaryLabel}>
      <Button onClick={onPrimary}>{primaryLabel}</Button>
      {onSkip && (
        <Button variant="secondary" onClick={onSkip}>
          Test out
        </Button>
      )}
      <Button variant="secondary" onClick={onReviewVocabulary}>
        Review vocabulary
      </Button>
    </div>,
    document.body,
  );
}
