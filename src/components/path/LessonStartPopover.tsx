import { useEffect, useRef, type CSSProperties } from "react";
import { Button } from "../common/Button";
import styles from "./LessonStartPopover.module.css";

interface LessonStartPopoverProps {
  /** The tapped node's own bounding rect, measured at click time — the popover hovers just below it. */
  anchorRect: DOMRect;
  onStart: () => void;
  /** Present only when there's a position ahead to test into — see domain/pathProgress.ts's findNextStandardTarget. Omitted (no Skip button at all) for the very last lesson in the course. */
  onSkip?: () => void;
  onReviewVocabulary: () => void;
  onClose: () => void;
}

/**
 * A small popover hovering over the tapped lesson node, Duolingo-style,
 * offering Start alongside Skip (test out of this lesson — see
 * PathPage's use of findNextStandardTarget) and Review vocabulary (browse
 * every lexeme in the course ahead of doing the lessons that teach them)
 * instead of jumping straight into /lesson the moment the node is tapped.
 */
export function LessonStartPopover({ anchorRect, onStart, onSkip, onReviewVocabulary, onClose }: LessonStartPopoverProps) {
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

  const style: CSSProperties = {
    position: "fixed",
    left: anchorRect.left + anchorRect.width / 2,
    top: anchorRect.bottom + 8,
    transform: "translateX(-50%)",
  };

  return (
    <div ref={popoverRef} className={styles.popover} style={style} role="dialog" aria-label="Start lesson">
      <Button onClick={onStart}>Start lesson</Button>
      {onSkip && (
        <Button variant="secondary" onClick={onSkip}>
          Test out
        </Button>
      )}
      <Button variant="secondary" onClick={onReviewVocabulary}>
        Review vocabulary
      </Button>
    </div>
  );
}
