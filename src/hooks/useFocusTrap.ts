import { useEffect } from "react";
import type { RefObject } from "react";

const FOCUSABLE = "button, input, [href], select, textarea";

/**
 * Tab/Shift+Tab cycling confined to `containerRef`'s subtree, plus Escape —
 * the same trap CourseCatalogModal/SkipLessonModal each hand-rolled, pulled
 * out once so the drawer and SkillGroupModal don't grow a third copy. `enabled`
 * lets a caller mount the container ahead of its open state without arming
 * the trap early (a closed-but-mounted drawer must not steal Tab).
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, opts: { enabled: boolean; onEscape: () => void }): void {
  const { enabled, onEscape } = opts;

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onEscape();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = containerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- containerRef is a ref, stable by definition; only enabled/onEscape should re-arm this.
  }, [enabled, onEscape]);
}
