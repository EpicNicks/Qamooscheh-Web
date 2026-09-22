import { useEffect, useRef, useState, type RefObject } from "react";

/** A pointerdown below this x is left to iOS Safari's own back-swipe, which cannot be preventDefault'ed and which lives in roughly the first 12-16px. */
const EDGE_DEAD_ZONE_PX = 16;
/** …and above this it's ordinary page content, not an edge grab. Deliberately generous (well past where any OS back-gesture strip ends) so a thumb doesn't have to land precisely on a sliver to open the drawer. */
const EDGE_ZONE_PX = 80;
/** Movement before the gesture commits to an axis. Below this, nothing happens. */
const DIRECTION_LOCK_PX = 8;
/** Straight-line distance that opens/closes on release. */
const COMMIT_DISTANCE_PX = 56;
/** …or this much flick speed, with at least FLICK_MIN_PX of travel. */
const FLICK_VELOCITY_PX_PER_MS = 0.5;
const FLICK_MIN_PX = 24;

export interface MobileDrawer {
  isOpen: boolean;
  /** `source` decides whether focus moves into the panel — a swipe-open from a thumb shouldn't yank focus or pop the keyboard. */
  open: (source: "button" | "swipe") => void;
  close: () => void;
  /** Live drag offset in px, 0 when not dragging. Written straight to the DOM via panelRef, not state — see the pointermove handler below. */
  panelRef: RefObject<HTMLElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
}

/**
 * Open/closed state, focus management, Escape, close-on-route-change, body
 * scroll lock, and left-edge swipe-to-open for the mobile nav drawer —
 * everything AppShell would otherwise need to own directly. `enabled` should
 * be `isMobile && !isLessonMode`; when it flips false this force-closes and
 * detaches every listener; a rotation to landscape mid-drawer must not leave
 * a stuck `position: fixed` panel behind.
 */
export function useMobileDrawer(opts: { enabled: boolean; pathname: string }): MobileDrawer {
  const { enabled, pathname } = opts;
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  function open(source: "button" | "swipe") {
    setIsOpen(true);
    if (source === "button") {
      // Deferred one tick: the panel only just mounted its focusable content
      // (it's conditionally rendered on isOpen upstream in some callers).
      requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("a, button")?.focus());
    }
  }

  function close() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  // Force-closed the moment this stops being a mobile/nav-mode context —
  // e.g. a rotation to landscape, or navigating into a lesson.
  useEffect(() => {
    if (!enabled) setIsOpen(false);
  }, [enabled]);

  // Close on route change — the ONLY mechanism; sidebar links are NavLinks,
  // so this alone covers "tap a link, drawer closes."
  useEffect(() => {
    setIsOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately re-runs on pathname only, to close on navigation.
  }, [pathname]);

  // Body scroll lock while open — save-and-restore rather than a blanket ""
  // so it composes if a modal ever nests inside.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  // Left-edge swipe-to-open / swipe-to-close. Window-level pointer events,
  // no invisible hit-target element: on a narrow phone a real lesson node can
  // sit within a few px of the edge, so an always-on edge div would swallow
  // taps on it. Filtering by coordinate instead means the only "hit target"
  // is the already-visible drawer/scrim once it's open.
  useEffect(() => {
    if (!enabled) return;

    let active: { id: number; x0: number; y0: number; t0: number; axis: null | "x" | "y"; openingFrom: boolean } | null = null;

    function onPointerDown(e: PointerEvent) {
      // Touch/pen only: a mouse near the window edge must never drag the drawer.
      if (e.pointerType === "mouse") return;
      // Never fight a dialog that's on top of us (SkillGroupModal, CourseCatalogModal, ...).
      if ((e.target as Element | null)?.closest?.('[role="dialog"]')) return;

      const fromEdge = !isOpenRef.current && e.clientX >= EDGE_DEAD_ZONE_PX && e.clientX <= EDGE_ZONE_PX;
      const fromPanel = isOpenRef.current && panelRef.current?.contains(e.target as Node);
      const fromScrim = isOpenRef.current && !fromPanel;
      if (!fromEdge && !fromPanel && !fromScrim) return;

      active = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: e.timeStamp, axis: null, openingFrom: !isOpenRef.current };
    }

    function onPointerMove(e: PointerEvent) {
      if (!active || e.pointerId !== active.id) return;
      const dx = e.clientX - active.x0;
      const dy = e.clientY - active.y0;

      if (active.axis === null) {
        if (Math.hypot(dx, dy) < DIRECTION_LOCK_PX) return;
        active.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        // Vertical wins -> this was a scroll, not a drawer gesture. Bail for good.
        if (active.axis === "y") {
          active = null;
          return;
        }
        panelRef.current?.setAttribute("data-dragging", "");
      }

      // Written straight to the DOM. Putting this in React state would
      // re-render the whole shell on every pointermove frame.
      const width = panelRef.current?.offsetWidth ?? 280;
      const offset = active.openingFrom ? Math.max(0, Math.min(width, dx)) : Math.max(0, Math.min(width, width + dx));
      panelRef.current?.style.setProperty("--drawer-drag", `${offset}px`);
    }

    function endDrag() {
      panelRef.current?.removeAttribute("data-dragging");
      panelRef.current?.style.removeProperty("--drawer-drag");
    }

    function onPointerEnd(e: PointerEvent) {
      if (!active || e.pointerId !== active.id) return;
      const dx = e.clientX - active.x0;
      const elapsed = e.timeStamp - active.t0;
      const distance = Math.abs(dx);
      const velocity = elapsed > 0 ? distance / elapsed : 0;
      const committed = distance > COMMIT_DISTANCE_PX || (distance > FLICK_MIN_PX && velocity > FLICK_VELOCITY_PX_PER_MS);

      const wasOpeningFrom = active.openingFrom;
      const axis = active.axis;
      active = null;
      endDrag();

      if (axis !== "x" || !committed) return;
      if (wasOpeningFrom && dx > 0) open("swipe");
      else if (!wasOpeningFrom && dx < 0) close();
    }

    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      active = null;
      endDrag();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open/close close over state via refs; only `enabled` should re-arm the listeners.
  }, [enabled]);

  return { isOpen, open, close, panelRef, triggerRef };
}
